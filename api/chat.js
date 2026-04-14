// api/chat.js — Lazuli Crest AI Serverless Function
// ─────────────────────────────────────────────────────────────
// AI:            Google Gemini (tries multiple models/tiers in sequence)
// Credit costs:  Chat message = 2 credits
//                Health summary = FREE for first 3, then 50 credits each
// Credits given: 150 on signup · +50 every day at midnight · cap 500
// ─────────────────────────────────────────────────────────────

const SIGNUP_CREDITS = 150;
const DAILY_TOPUP    = 50;
const MAX_CREDITS    = 500;
const CHAT_COST      = 2;
const SUMMARY_COST   = 50;
const FREE_SUMMARIES = 3;

// Try these in order until one works — covers free tier + paid + experimental
const MODEL_PRIORITY = [
  'gemini-2.0-flash-lite',       // lowest quota requirement
  'gemini-2.0-flash',            // main model
  'gemini-1.5-flash-8b',         // tiny, high free quota
  'gemini-1.5-flash-latest',     // stable 1.5
  'gemini-1.5-flash',            // older stable
  'gemini-2.0-flash-exp',        // experimental fallback
];

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
    await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({content:msg}) });
  } catch {}
}

// ── Credits system ────────────────────────────────────────────
async function useCredits(userId, requestType = 'chat') {
  if (!userId) return { allowed: true, balance: 999, summariesUsed: 0 };

  const today = new Date().toISOString().split('T')[0];
  const doc   = await fsGet(`user_credits/${userId}`);
  const f     = doc?.fields || {};

  let balance       = f.balance?.integerValue !== undefined ? parseInt(f.balance.integerValue, 10) : SIGNUP_CREDITS;
  let lastTopupDate = f.lastTopupDate?.stringValue || '';
  let summariesUsed = f.summariesUsed?.integerValue ? parseInt(f.summariesUsed.integerValue, 10) : 0;

  // First-time user
  if (!lastTopupDate) { balance = SIGNUP_CREDITS; lastTopupDate = today; }

  // Daily top-up
  if (lastTopupDate < today) {
    balance = Math.min(balance + DAILY_TOPUP, MAX_CREDITS);
    lastTopupDate = today;
  }

  const cost = requestType === 'summary'
    ? (summariesUsed < FREE_SUMMARIES ? 0 : SUMMARY_COST)
    : CHAT_COST;

  if (balance < cost && !(requestType === 'summary' && summariesUsed < FREE_SUMMARIES)) {
    return { allowed: false, balance, cost, summariesUsed };
  }

  const newBalance = Math.max(0, balance - cost);
  const newSummaries = requestType === 'summary' ? summariesUsed + 1 : summariesUsed;
  await fsPatch(`user_credits/${userId}`, {
    balance:       { integerValue: String(newBalance) },
    lastTopupDate: { stringValue: lastTopupDate },
    summariesUsed: { integerValue: String(newSummaries) },
    userId:        { stringValue: userId },
  });
  return { allowed: true, balance: newBalance, cost, summariesUsed: newSummaries };
}

async function initCredits(userId) {
  if (!userId) return;
  const today    = new Date().toISOString().split('T')[0];
  const existing = await fsGet(`user_credits/${userId}`);
  if (!existing?.fields?.balance) {
    await fsPatch(`user_credits/${userId}`, {
      balance:       { integerValue: String(SIGNUP_CREDITS) },
      lastTopupDate: { stringValue: today },
      summariesUsed: { integerValue: '0' },
      userId:        { stringValue: userId },
    });
  }
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  if (body.action === 'user_signup') {
    const { email='Unknown', name='Unknown', userId } = body;
    await Promise.all([
      initCredits(userId),
      pingDiscord(`🎉 **New Lazuli Crest signup!**\n👤 ${name}\n📧 ${email}\n🕐 ${new Date().toLocaleString('en-US',{timeZone:'America/New_York'})} EST`),
    ]);
    return res.status(200).json({ ok: true });
  }

  if (body.action === 'user_login') {
    await pingDiscord(`🔑 **Lazuli Crest login**\n📧 ${body.email||'Unknown'}\n🕐 ${new Date().toLocaleString('en-US',{timeZone:'America/New_York'})} EST`);
    return res.status(200).json({ ok: true });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({
      error: '⚙️ GEMINI_API_KEY is not set in Vercel environment variables. Go to Vercel → Project → Settings → Environment Variables and add it (get a free key at aistudio.google.com).',
    });
  }

  const { messages, system, userId, requestType = 'chat' } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided.' });
  }

  // Credits check
  if (userId) {
    try {
      const result = await useCredits(userId, requestType);
      if (!result.allowed) {
        return res.status(429).json({
          error: requestType === 'summary'
            ? `Full health summaries cost ${SUMMARY_COST} credits after your first ${FREE_SUMMARIES} free ones. You have ${result.balance} credits — you'll receive ${DAILY_TOPUP} more at midnight. 💜`
            : `You need ${result.cost} credits but only have ${result.balance}. You'll receive ${DAILY_TOPUP} new credits at midnight. 💜`,
          limitReached: true,
          creditsLeft: result.balance,
        });
      }
      res.setHeader('X-Credits-Left',   String(result.balance));
      res.setHeader('X-Summaries-Used', String(result.summariesUsed));
    } catch (e) {
      console.warn('[Credits] error (non-fatal):', e.message);
    }
  }

  // Build request body
  const geminiBody = {
    contents: messages.map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    })),
    generationConfig: { maxOutputTokens: 1400, temperature: 0.72 },
  };
  if (system) geminiBody.system_instruction = { parts: [{ text: String(system) }] };

  // Try each model in priority order
  let lastError = 'AI unavailable';
  for (const model of MODEL_PRIORITY) {
    try {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(geminiBody) }
      );

      let data;
      try { data = await upstream.json(); } catch { continue; }

      const errMsg = (data?.error?.message || '').toLowerCase();

      // Skip this model if it's not found or not supported
      if (upstream.status === 404 || errMsg.includes('not found') || errMsg.includes('not supported')) {
        console.warn(`[Gemini] ${model} not found, trying next`);
        continue;
      }

      // Skip if quota exceeded for THIS model (try next)
      if (upstream.status === 429 || errMsg.includes('quota') || errMsg.includes('rate limit')) {
        console.warn(`[Gemini] ${model} quota exceeded, trying next`);
        lastError = data?.error?.message || lastError;
        continue;
      }

      if (!upstream.ok) {
        lastError = data?.error?.message || `HTTP ${upstream.status}`;
        console.error(`[Gemini] ${model} error:`, lastError);
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) { lastError = 'Empty response'; continue; }

      return res.status(200).json({ content: [{ type:'text', text }], model });

    } catch (e) {
      lastError = e.message;
      console.warn(`[Gemini] ${model} threw:`, e.message);
    }
  }

  // All models failed
  const isQuotaError = lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('exceeded');
  return res.status(503).json({
    error: isQuotaError
      ? `🔑 Your Gemini API key has exceeded its quota. To fix this: go to aistudio.google.com → click your key → check rate limits, or create a new free API key. Details: ${lastError}`
      : `AI temporarily unavailable. Please try again in a moment. (${lastError})`,
  });
}
