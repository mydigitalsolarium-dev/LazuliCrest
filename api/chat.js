// api/chat.js — Lazuli Crest AI Serverless Function
// ─────────────────────────────────────────────────────────────
// AI:            Google Gemini 2.0 Flash (stable v1beta)
// Credit costs:  Chat message = 2 credits
//                Health summary = FREE for first 3, then 50 credits each
// Credits given: 150 on signup · +50 every day at midnight · cap 500
// ─────────────────────────────────────────────────────────────

const SIGNUP_CREDITS   = 150;
const DAILY_TOPUP      = 50;
const MAX_CREDITS      = 500;
const CHAT_COST        = 2;    // credits per regular AI message
const SUMMARY_COST     = 50;   // credits per health summary (after free tier)
const FREE_SUMMARIES   = 3;    // first N summaries are free

const PRIMARY_MODEL  = 'gemini-2.0-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash-latest';

// ── Firestore REST helpers ────────────────────────────────────
function fsBase() {
  const pid = process.env.FIREBASE_PROJECT_ID || 'advyhealth';
  return `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents`;
}
async function fsGet(path) {
  const key = process.env.REACT_APP_FIREBASE_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${fsBase()}/${path}?key=${key}`);
    return r.ok ? r.json() : null;
  } catch { return null; }
}
async function fsPatch(path, fields) {
  const key = process.env.REACT_APP_FIREBASE_API_KEY;
  if (!key) return;
  try {
    await fetch(`${fsBase()}/${path}?key=${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
  } catch { /* non-fatal */ }
}

// ── Discord ping ──────────────────────────────────────────────
async function pingDiscord(msg) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: msg }),
    });
  } catch { /* non-fatal */ }
}

// ── Credits: read, apply daily top-up, check balance, deduct ─
// requestType: 'chat' (2 credits) | 'summary' (50 credits, first 3 free)
async function useCredits(userId, requestType = 'chat') {
  if (!userId) return { allowed: true, balance: 999, summariesUsed: 0 };

  const today = new Date().toISOString().split('T')[0];
  const doc   = await fsGet(`user_credits/${userId}`);

  const fields = doc?.fields || {};

  // Balance — if doc is missing or brand-new, start at SIGNUP_CREDITS
  let balance = fields.balance?.integerValue !== undefined
    ? parseInt(fields.balance.integerValue, 10)
    : SIGNUP_CREDITS;

  // Safety: if balance is suspiciously 0 and no topup has ever happened,
  // treat this as a fresh account and restore signup credits
  let lastTopupDate  = fields.lastTopupDate?.stringValue  || '';
  let summariesUsed  = fields.summariesUsed?.integerValue
    ? parseInt(fields.summariesUsed.integerValue, 10) : 0;

  const isFirstTime = !lastTopupDate;
  if (isFirstTime) {
    balance       = SIGNUP_CREDITS;
    lastTopupDate = today;
  }

  // Daily top-up: if last topup was before today, add DAILY_TOPUP
  if (lastTopupDate && lastTopupDate < today) {
    balance       = Math.min(balance + DAILY_TOPUP, MAX_CREDITS);
    lastTopupDate = today;
    console.log(`[Credits] Daily top-up for ${userId} → ${balance}`);
  }

  // Determine cost for this request
  let cost = CHAT_COST;
  if (requestType === 'summary') {
    cost = summariesUsed < FREE_SUMMARIES ? 0 : SUMMARY_COST;
  }

  if (balance < cost && !(requestType === 'summary' && summariesUsed < FREE_SUMMARIES)) {
    return { allowed: false, balance, cost, summariesUsed };
  }

  // Deduct and persist
  const newBalance       = Math.max(0, balance - cost);
  const newSummariesUsed = requestType === 'summary' ? summariesUsed + 1 : summariesUsed;

  await fsPatch(`user_credits/${userId}`, {
    balance:       { integerValue: String(newBalance) },
    lastTopupDate: { stringValue:  lastTopupDate },
    summariesUsed: { integerValue: String(newSummariesUsed) },
    userId:        { stringValue:  userId },
  });

  return { allowed: true, balance: newBalance, cost, summariesUsed: newSummariesUsed };
}

// ── Credits: initialise on signup ─────────────────────────────
async function initCredits(userId) {
  if (!userId) return;
  const today    = new Date().toISOString().split('T')[0];
  const existing = await fsGet(`user_credits/${userId}`);
  if (!existing?.fields?.balance) {
    await fsPatch(`user_credits/${userId}`, {
      balance:       { integerValue: String(SIGNUP_CREDITS) },
      lastTopupDate: { stringValue:  today },
      summariesUsed: { integerValue: '0' },
      userId:        { stringValue:  userId },
    });
    console.log(`[Credits] Initialised ${userId} with ${SIGNUP_CREDITS} credits`);
  }
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  // ── Signup ────────────────────────────────────────────────
  if (body.action === 'user_signup') {
    const { email = 'Unknown', name = 'Unknown', userId } = body;
    await Promise.all([
      initCredits(userId),
      pingDiscord(
        `🎉 **New Lazuli Crest signup!**\n👤 ${name}\n📧 ${email}\n` +
        `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`
      ),
    ]);
    return res.status(200).json({ ok: true });
  }

  // ── Login ─────────────────────────────────────────────────
  if (body.action === 'user_login') {
    const { email = 'Unknown' } = body;
    await pingDiscord(
      `🔑 **Lazuli Crest — User logged in**\n📧 ${email}\n` +
      `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`
    );
    return res.status(200).json({ ok: true });
  }

  // ── Gemini key check ──────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({
      error:
        'GEMINI_API_KEY is not configured. Go to Vercel → Project → Settings → ' +
        'Environment Variables → add GEMINI_API_KEY (free at aistudio.google.com).',
    });
  }

  const { messages, system, userId, requestType = 'chat' } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided.' });
  }

  // ── Credits check & deduction ─────────────────────────────
  if (userId) {
    try {
      const result = await useCredits(userId, requestType);
      if (!result.allowed) {
        const isSummary = requestType === 'summary';
        return res.status(429).json({
          error: isSummary
            ? `Full health summaries cost ${SUMMARY_COST} credits after your first ${FREE_SUMMARIES} free ones. You have ${result.balance} credits — you'll receive ${DAILY_TOPUP} more at midnight. 💜`
            : `You don't have enough Lazuli AI credits (${result.balance} remaining, ${result.cost} needed). You'll receive ${DAILY_TOPUP} new credits at midnight. 💜`,
          limitReached:   true,
          creditsLeft:    result.balance,
          summariesUsed:  result.summariesUsed,
        });
      }
      res.setHeader('X-Credits-Left',    String(result.balance));
      res.setHeader('X-Summaries-Used',  String(result.summariesUsed));
      res.setHeader('X-Free-Summaries',  String(FREE_SUMMARIES));
      res.setHeader('X-Daily-Topup',     String(DAILY_TOPUP));
    } catch (e) {
      console.warn('[Credits] error (non-fatal):', e.message);
    }
  }

  // ── Gemini request body ───────────────────────────────────
  const geminiBody = {
    contents: messages.map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    })),
    generationConfig: { maxOutputTokens: 1400, temperature: 0.72 },
  };
  if (system) {
    geminiBody.system_instruction = { parts: [{ text: String(system) }] };
  }

  // ── Call Gemini ───────────────────────────────────────────
  async function callGemini(model) {
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
    );
  }
  function modelNotFound(status, data) {
    if (status === 404) return true;
    const msg = (data?.error?.message || '').toLowerCase();
    return msg.includes('not found') || msg.includes('not supported') || msg.includes('does not exist');
  }

  try {
    let upstream = await callGemini(PRIMARY_MODEL);
    let data;
    try { data = await upstream.json(); } catch { data = {}; }

    if (modelNotFound(upstream.status, data)) {
      console.warn(`[Gemini] ${PRIMARY_MODEL} unavailable → trying ${FALLBACK_MODEL}`);
      upstream = await callGemini(FALLBACK_MODEL);
      try { data = await upstream.json(); } catch { data = {}; }
    }

    if (!upstream.ok) {
      console.error('[Gemini] error:', JSON.stringify(data));
      return res.status(upstream.status).json({
        error: data?.error?.message || `AI error (HTTP ${upstream.status})`,
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return res.status(500).json({ error: 'AI returned an empty response.' });

    return res.status(200).json({ content: [{ type: 'text', text }], model: PRIMARY_MODEL });

  } catch (err) {
    console.error('[Chat] error:', err);
    return res.status(500).json({ error: 'Failed to reach the AI. Please try again.', details: err.message });
  }
}
