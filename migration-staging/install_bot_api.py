from pathlib import Path
import shutil
import tempfile

bot_root = Path(r"C:\Users\DELL\creditlogbot")
bot_file = bot_root / "bot.py"
module_file = bot_root / "web_api.py"
env_file = bot_root / ".env.example"
source = Path(__file__).with_name("web_api.py")

text = bot_file.read_text(encoding="utf-8")
if "from web_api import register_web_routes, TELEGRAM_BOT_KEY" not in text:
    anchor = "import onchain\n"
    if text.count(anchor) != 1:
        raise SystemExit("Expected one stable import anchor; bot.py was not changed.")
    text = text.replace(anchor, anchor + "from web_api import register_web_routes, TELEGRAM_BOT_KEY\n", 1)

old_sig = "    uid: Optional[int] = None,\n    qty: int = 1\n) -> Tuple[bool, dict]:"
new_sig = "    uid: Optional[int] = None,\n    qty: int = 1,\n    success_url_override: Optional[str] = None,\n    cancel_url_override: Optional[str] = None\n) -> Tuple[bool, dict]:"
if old_sig in text:
    text = text.replace(old_sig, new_sig, 1)
elif "success_url_override: Optional[str]" not in text:
    raise SystemExit("Could not find the Bachs function signature; bot.py was not changed.")

old_urls = "    success_url = callback_url or tg_url\n    cancel_url = callback_url or tg_url"
new_urls = "    success_url = success_url_override or callback_url or tg_url\n    cancel_url = cancel_url_override or callback_url or tg_url"
if old_urls in text:
    text = text.replace(old_urls, new_urls, 1)
elif "success_url_override or callback_url" not in text:
    raise SystemExit("Could not find the Bachs return URL block; bot.py was not changed.")

old_main = "    app = web.Application()\n    app.router.add_get(\"/health\", lambda r: web.Response(text=\"ok\"))"
new_main = "    app = web.Application()\n    register_web_routes(app, sys.modules[__name__])\n    app[TELEGRAM_BOT_KEY] = bot\n    app.router.add_get(\"/health\", lambda r: web.Response(text=\"ok\"))"
if old_main in text:
    text = text.replace(old_main, new_main, 1)
elif "register_web_routes(app, sys.modules[__name__])" not in text:
    raise SystemExit("Could not find the health server setup; bot.py was not changed.")

env_text = env_file.read_text(encoding="utf-8") if env_file.exists() else ""
env_add = "\n# Website API access; use the same long random value on the website host.\nCREDITLOG_BACKEND_SECRET=replace_with_a_long_random_shared_secret\nWEB_ADMIN_USERNAME=admin@example.com\nWEB_ADMIN_PASSWORD=replace_with_a_unique_password_of_at_least_12_characters\nWEB_SUCCESS_URL=https://creditlog.com/success.html\nWEB_CANCEL_URL=https://creditlog.com/\n"
if "CREDITLOG_BACKEND_SECRET=" not in env_text:
    env_text = env_text.rstrip() + env_add
if "WEB_STORE_URL=" not in env_text:
    env_text = env_text.rstrip() + "\nWEB_STORE_URL=https://creditlog.com\n"
if "BACHS_WEBHOOK_SECRET=" not in env_text:
    env_text = env_text.rstrip() + "\n# Optional HMAC verification secret for the Bachs webhook.\nBACHS_WEBHOOK_SECRET=\n"

backup = Path(tempfile.gettempdir()) / "creditlogbot-bot.py.pre-web-api"
if not backup.exists():
    shutil.copy2(bot_file, backup)
bot_file.write_text(text, encoding="utf-8")
module_file.write_bytes(source.read_bytes())
env_file.write_text(env_text, encoding="utf-8")
print("Installed web_api.py and registered website routes. Backup:", backup)
