/**
 * Product Parser Service for CreditLog
 * Extracts product-specific requirements, delivery format, warranty, and instructions
 * directly from the seller's API and Telegram bot catalog descriptions.
 */

function parseProductDetails(name = '', desc = '') {
  desc = (desc || '').trim();
  const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Delivery Format
  let deliveryFormat = '';
  const mDeliv = desc.match(/Delivery format:?\s*([^\n\r]+)/i);
  if (mDeliv) {
    deliveryFormat = mDeliv[1].trim();
  } else if (/email\s*\|\s*pass/i.test(desc) || /2fa/i.test(desc)) {
    deliveryFormat = 'Email | Password | 2FA';
  } else if (/api key|tokens|credits/i.test(name) || /api key|tokens/i.test(desc)) {
    deliveryFormat = 'API Key / Token Secret';
  } else if (/invite|family|redemption/i.test(name) || /invite|redeem/i.test(desc)) {
    deliveryFormat = 'Activation / Invitation Link';
  } else if (/license|code|key/i.test(name) || /license|redemption code/i.test(desc)) {
    deliveryFormat = 'License Key / Redemption Code';
  } else {
    deliveryFormat = 'Direct Account Access';
  }

  // 2. Warranty & Policy
  let warranty = '';
  const mWar = desc.match(/((?:No warranty|Warranty:?|Replacement:?)[^\n\r]+)/i);
  if (mWar) {
    warranty = mWar[1].trim();
  } else if (/no warranty/i.test(desc)) {
    warranty = 'No warranty. Delivered as-is by upstream provider; guaranteed active upon initial delivery.';
  } else if (/1 month|1m|30d/i.test(name)) {
    warranty = '24-hour verification & replacement warranty; valid for 30-day billing cycle.';
  } else if (/1 year|12m|24m|2 years/i.test(name)) {
    warranty = '30-day replacement warranty; full subscription validity.';
  } else {
    warranty = 'Guaranteed active upon initial delivery with priority assistance.';
  }

  // 3. Product-Specific Requirements & Precautions
  let requirements = '';
  const mReq = desc.match(/((?:IMPORTANT|Important information|Notice|CAUTION|Note|PRECAUTIONS|LIMITATIONS):?[\s\S]*?)(?=(?:\n[A-Z\s]{4,}:|\n\d+\.|\Z))/i);
  if (mReq) {
    requirements = mReq[1].replace(/^(?:IMPORTANT|Important information|Notice|CAUTION|Note|PRECAUTIONS|LIMITATIONS):?\s*/i, '').trim();
  }
  
  if (!requirements) {
    // Extract rule lines from description
    const restrictionLines = lines.filter(l => 
      /^(?:do not|first change|only after|limit|not recommended|important|warning|caution|must be|requires)/i.test(l)
    );
    if (restrictionLines.length > 0) {
      requirements = restrictionLines.join('\n');
    }
  }

  // Fallback product-specific rules based on product type
  if (!requirements) {
    const n = name.toLowerCase();
    if (n.includes('chatgpt') || n.includes('openai')) {
      requirements = 'First change the account email to your own email in Settings -> Account -> Email. Changing password or 2FA before email update may lock the account.';
    } else if (n.includes('api') || n.includes('token') || n.includes('cursor') || n.includes('codex')) {
      requirements = 'API key must be kept confidential. Never commit keys to public repositories or expose in client-side code. Rate limits and quota allowances apply per model.';
    } else if (n.includes('canva') || n.includes('notion') || n.includes('spotify') || n.includes('duolingo')) {
      requirements = 'For personal email upgrade, enter your existing account email at checkout. For ready-made accounts, use the delivered credentials directly.';
    } else if (n.includes('vpn') || n.includes('security')) {
      requirements = 'Compatible with official apps across Windows, macOS, Android, iOS, and Linux. Maximum concurrent devices depend on the vendor plan.';
    }
  }

  // 4. Instructions & Activation Steps
  let instructions = '';
  const mInst = desc.match(/((?:LOGIN INSTRUCTION|HOW TO LOG IN|HOW TO USE|INSTRUCTION|SETUP GUIDE|How to activate|How to redeem)[\s\S]*?)(?=(?:\nIMPORTANT|\nNOTE|\nWAR|\nDescription:|\Z))/i);
  if (mInst) {
    instructions = mInst[1].replace(/^(?:LOGIN INSTRUCTION|HOW TO LOG IN|HOW TO USE|INSTRUCTION|SETUP GUIDE|How to activate|How to redeem):?\s*/i, '').trim();
  }

  // 5. Clean Overview
  let overview = '';
  const mDesc = desc.match(/Description:?\s*([^\n\r]+(?:\n[^\n\r]+)?)/i);
  if (mDesc) {
    overview = mDesc[1].trim();
  } else {
    const cleanLines = lines.filter(l => 
      !l.toLowerCase().startsWith('item:') &&
      !l.toLowerCase().startsWith('delivery format') &&
      !l.toLowerCase().startsWith('payment method') &&
      !l.toLowerCase().startsWith('no warranty') &&
      !l.toLowerCase().startsWith('warranty') &&
      !l.toLowerCase().startsWith('login instruction') &&
      !l.toLowerCase().startsWith('how to') &&
      !l.toLowerCase().startsWith('important') &&
      !l.toLowerCase().startsWith('instruction')
    );
    overview = cleanLines.slice(0, 3).join('\n\n') || `Premium digital subscription for ${name}.`;
  }

  return {
    deliveryFormat,
    warranty,
    requirements,
    instructions,
    overview,
    hasSpecialRequirements: Boolean(requirements && requirements.trim().length > 0)
  };
}

module.exports = {
  parseProductDetails
};
