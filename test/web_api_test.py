import os
import sys
import unittest

from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

BOT_ROOT = r"C:\Users\DELL\creditlogbot"
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, BOT_ROOT)
os.environ.update({
    "BOT_TOKEN": "123456:WEB_API_TEST_TOKEN",
    "ADMIN_IDS": "111222333",
    "DB_PATH": ":memory:",
    "CREDITLOG_BACKEND_SECRET": "api-test-secret-value",
    "WEB_ADMIN_USERNAME": "admin@example.com",
    "WEB_ADMIN_PASSWORD": "test-password-that-is-long-enough",
})

import bot
from web_api import register_web_routes


class WebApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        bot.db.execute("DELETE FROM orders")
        bot.db.execute("DELETE FROM stock")
        bot.db.execute("DELETE FROM products")
        product = bot.db.execute(
            "INSERT INTO products(name,description,price,active,category,delivery_type) VALUES(?,?,?,?,?,?)",
            ("API test item", "Seller supplied description stays intact.", 1250, 1, "AI Tools", "manual"),
        )
        self.product_id = product.lastrowid
        app = web.Application()
        register_web_routes(app, vars(bot))
        self.client = TestClient(TestServer(app))
        await self.client.start_server()
        self.headers = {"X-CreditLog-Backend-Secret": "api-test-secret-value"}

    async def asyncTearDown(self):
        await self.client.close()

    async def test_backend_proxy_secret_required(self):
        response = await self.client.get("/api/products")
        self.assertEqual(response.status, 401)

    async def test_guest_product_and_quote_read_shared_bot_data(self):
        response = await self.client.get("/api/products", headers=self.headers)
        body = await response.json()
        self.assertEqual(response.status, 200)
        self.assertEqual(body["data"][0]["description"], "Seller supplied description stays intact.")
        product_id = body["data"][0]["id"]
        quote = await self.client.post("/api/orders/quote", headers=self.headers, json={"productId": product_id, "quantity": 2, "currency": "USD"})
        quote_body = await quote.json()
        self.assertEqual(quote_body["totalUsd"], 25.0)

    async def test_guest_order_uses_shared_stock_and_selected_option_price(self):
        bot.db.execute("UPDATE products SET web_options_json=?,web_duration=? WHERE id=?", ('[{"duration":"Annual","usdPrice":22.5}]', "Annual", self.product_id))
        bot.db.execute("INSERT INTO stock(product_id,payload,sold) VALUES(?,'delivery-code',0)", (self.product_id,))
        bot.save_bank_accounts([{"bank_name": "Test Bank", "account_number": "1234567890", "account_name": "CreditLog"}])
        response = await self.client.post("/api/orders/create", headers=self.headers, json={
            "productId": self.product_id, "duration": "Annual", "quantity": 1, "customerName": "Test Buyer",
            "customerEmail": "buyer@example.com", "customerPhone": "+2348000000000",
            "deliveryContact": "buyer@example.com", "productSpecificInfo": "Workspace name",
            "gateway": "bank", "currency": "NGN",
        })
        result = await response.json()
        self.assertEqual(response.status, 201)
        self.assertEqual(result["order"]["plan"], "Annual")
        self.assertEqual(result["order"]["totalUsd"], 22.5)
        self.assertTrue(result["order"]["accessToken"])
        row = bot.db.execute("SELECT customer_notes,delivery_contact,web_plan FROM orders WHERE id=?", (result["order"]["botOrderId"],)).fetchone()
        self.assertEqual(tuple(row), ("Workspace name", "buyer@example.com", "Annual"))

    async def test_analytics_returns_dashboard_shape(self):
        login = await self.client.post("/api/admin/login", headers=self.headers, json={"username": "admin@example.com", "password": "test-password-that-is-long-enough"})
        token = (await login.json())["token"]
        response = await self.client.get("/api/admin/analytics?timeframe=7d", headers={**self.headers, "Authorization": f"Bearer {token}"})
        result = await response.json()
        self.assertEqual(response.status, 200)
        self.assertIn("totalSalesNgn", result["kpis"])
        self.assertEqual(len(result["chart"]["points"]), 7)

    async def test_admin_catalog_export_and_shared_category_controls(self):
        login = await self.client.post("/api/admin/login", headers=self.headers, json={"username": "admin@example.com", "password": "test-password-that-is-long-enough"})
        token = (await login.json())["token"]
        headers = {**self.headers, "Authorization": f"Bearer {token}"}
        category = await self.client.post("/api/admin/categories", headers=headers, json={"key": "web-test", "name": "Web Test", "icon": "🧪", "sortOrder": 9})
        self.assertEqual(category.status, 200)
        exported = await self.client.get("/api/admin/export/products.csv", headers=headers)
        self.assertEqual(exported.status, 200)
        self.assertIn(b"Seller supplied description stays intact.", await exported.read())
        backup = await self.client.get("/api/admin/export/backup", headers=headers)
        self.assertEqual(backup.status, 200)
        self.assertTrue((await backup.read()).startswith(b"SQLite format 3"))

    async def test_admin_login_and_routes_require_session(self):
        denied = await self.client.get("/api/admin/inventory", headers=self.headers)
        self.assertEqual(denied.status, 401)
        login = await self.client.post("/api/admin/login", headers=self.headers, json={"username": "admin@example.com", "password": "test-password-that-is-long-enough"})
        body = await login.json()
        self.assertEqual(login.status, 200)
        inventory = await self.client.get("/api/admin/inventory", headers={**self.headers, "Authorization": f"Bearer {body['token']}"})
        self.assertEqual(inventory.status, 200)

    async def test_supplier_order_history_requires_admin_and_omits_delivery_payload(self):
        from unittest.mock import AsyncMock, patch

        mock_supplier = AsyncMock()
        mock_supplier.get_orders.return_value = [{
            "orderCode": "SUP-12", "productId": "streaming-1", "price": 4.5,
            "quantity": 1, "status": "completed", "value": "private-delivery-code",
        }]
        denied = await self.client.get("/api/admin/supplier/orders", headers=self.headers)
        self.assertEqual(denied.status, 401)

        login = await self.client.post("/api/admin/login", headers=self.headers, json={"username": "admin@example.com", "password": "test-password-that-is-long-enough"})
        token = (await login.json())["token"]
        with patch.object(bot.supplier_registry, "get", return_value=mock_supplier):
            response = await self.client.get("/api/admin/supplier/orders", headers={**self.headers, "Authorization": f"Bearer {token}"})
        result = await response.json()
        self.assertEqual(response.status, 200)
        self.assertEqual(result["orders"][0]["orderCode"], "SUP-12")
        self.assertNotIn("value", result["orders"][0])

    async def test_payment_cannot_be_verified_without_order_receipt_token(self):
        cur = bot.db.execute("INSERT INTO orders(user_id,product_id,product_name,price,quantity,status,customer_email,payment_method,invoice_id) VALUES(0,1,'API test item',1250,1,'pending','customer@example.com','bachs','fake-session')")
        response = await self.client.post("/api/payment/verify", headers=self.headers, json={"orderId": f"#CL-{cur.lastrowid}", "reference": "fake-session"})
        self.assertEqual(response.status, 403)
        order = bot.db.execute("SELECT status FROM orders WHERE id=?", (cur.lastrowid,)).fetchone()
        self.assertEqual(order["status"], "pending")

    async def test_order_details_require_receipt_token(self):
        import hashlib
        token = "test-order-receipt-secret"
        cur = bot.db.execute(
            "INSERT INTO orders(user_id,product_id,product_name,price,quantity,status,customer_email,customer_name,web_order_token_hash) VALUES(0,1,'API test item',1250,1,'pending','private@example.com','Private Customer',?)",
            (hashlib.sha256(token.encode()).hexdigest(),),
        )
        url = f"/api/orders/track?id=%23CL-{cur.lastrowid}&email=private%40example.com"
        denied = await self.client.get(url, headers=self.headers)
        self.assertEqual(denied.status, 404)
        allowed = await self.client.get(url, headers={**self.headers, "X-Order-Access": token})
        self.assertEqual(allowed.status, 200)
        body = await allowed.json()
        self.assertEqual(body["data"][0]["customerEmail"], "private@example.com")

    async def test_inventory_reserve_and_release(self):
        bot.db.execute("INSERT INTO stock(product_id,payload) VALUES(?, 'key-1')", (self.product_id,))
        reserve_res = await self.client.post("/api/inventory/reserve", headers=self.headers, json={"productId": self.product_id, "quantity": 1})
        self.assertEqual(reserve_res.status, 200)
        reserve_data = await reserve_res.json()
        self.assertTrue(reserve_data["success"])
        self.assertIn("reservationToken", reserve_data)

        release_res = await self.client.post("/api/inventory/release", headers=self.headers, json={"reservationToken": reserve_data["reservationToken"]})
        self.assertEqual(release_res.status, 200)
        release_data = await release_res.json()
        self.assertTrue(release_data["success"])

    async def test_admin_upload_logo(self):
        login = await self.client.post("/api/admin/login", headers=self.headers, json={"username": "admin@example.com", "password": "test-password-that-is-long-enough"})
        token = (await login.json())["token"]
        upload_res = await self.client.post(
            "/api/admin/upload-logo",
            headers={**self.headers, "Authorization": f"Bearer {token}"},
            json={"fileName": "test-brand.png", "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}
        )
        self.assertEqual(upload_res.status, 200)
        upload_data = await upload_res.json()
        self.assertTrue(upload_data["success"])
        self.assertIn("assets/icons/logo-", upload_data["url"])


if __name__ == "__main__":
    unittest.main()
