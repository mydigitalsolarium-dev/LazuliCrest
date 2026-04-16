// api/chat.js — Lazuli Bio AI Serverless Function
// ─────────────────────────────────────────────────────────────
// AI:            Groq (primary, free) → Gemini (fallback)
// Credit costs:  Chat message = 2 credits
//                Health summary = FREE for first 3, then 50 credits each
// Credits given: 150 on signup · +50 every day at midnight · cap 500
//
// SETUP:         Set GROQ_API_KEY in Vercel env vars (free at console.groq.com)
//                Set GEMINI_API_KEY as fallback (free at aistudio.google.com)
//
// ADMIN BYPASS:  Set ADMIN_USER_IDS in Vercel env vars (comma-separated
//                Firebase UIDs). Those accounts get unlimited credits.
//                Find your UID in the app → Treasury → Admin Info.
// ─────────────────────────────────────────────────────────────

// Admin UIDs — hardcoded owner account + optional ADMIN_USER_IDS env var
const HARDCODED_ADMINS = [
  'BEhLyvqZeCVy2SRFhsKCZ0fbqrC2', // site owner / test account
];
const ADMIN_IDS = [
  ...HARDCODED_ADMINS,
  ...(process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
];
const isAdminUser = (uid) => uid && ADMIN_IDS.includes(uid);

const SIGNUP_CREDITS = 150;
const DAILY_TOPUP    = 50;
const MAX_CREDITS    = 500;
const CHAT_COST      = 2;
const SUMMARY_COST   = 50;
const FREE_SUMMARIES = 3;

// Groq models — tried first (free, fast, reliable)
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',     // best quality, generous free quota
  'llama-3.1-8b-instant',        // ultra-fast fallback
  'gemma2-9b-it',                // Google Gemma via Groq
];

// Gemini models — fallback if Groq unavailable
const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
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

  // ── Admin bypass — unlimited, no Firestore reads/writes ──
  if (isAdminUser(userId)) {
    return { allowed: true, balance: 999999, summariesUsed: 0, isAdmin: true };
  }

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
      pingDiscord(`🎉 **New Lazuli Bio signup!**\n👤 ${name}\n📧 ${email}\n🕐 ${new Date().toLocaleString('en-US',{timeZone:'America/New_York'})} EST`),
    ]);
    return res.status(200).json({ ok: true });
  }

  if (body.action === 'user_login') {
    await pingDiscord(`🔑 **Lazuli Bio login**\n📧 ${body.email||'Unknown'}\n🕐 ${new Date().toLocaleString('en-US',{timeZone:'America/New_York'})} EST`);
    return res.status(200).json({ ok: true });
  }

  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    return res.status(500).json({
      error: '⚙️ No AI key configured. Add GROQ_API_KEY (free at console.groq.com) to Vercel → Settings → Environment Variables.',
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

  let lastError = 'AI unavailable';

  // ── 1. Try Groq first (free, fast, reliable) ─────────────────
  if (groqKey) {
    const groqMessages = [];
    if (system) groqMessages.push({ role: 'system', content: String(system) });
    groqMessages.push(...messages.map(m => ({ role: m.role, content: String(m.content || '') })));

    for (const model of GROQ_MODELS) {
      try {
        const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({ model, messages: groqMessages, max_tokens: 1400, temperature: 0.72 }),
        });

        let data;
        try { data = await upstream.json(); } catch { continue; }

        const errMsg = (data?.error?.message || '').toLowerCase();
        if (upstream.status === 429 || errMsg.includes('rate limit') || errMsg.includes('quota')) {
          console.warn(`[Groq] ${model} rate limited, trying next`);
          lastError = data?.error?.message || lastError;
          continue;
        }
        if (!upstream.ok) {
          console.warn(`[Groq] ${model} error HTTP ${upstream.status}:`, data?.error?.message);
          lastError = data?.error?.message || `Groq HTTP ${upstream.status}`;
          continue;
        }

        const text = data?.choices?.[0]?.message?.content || '';
        if (!text) { lastError = 'Empty response from Groq'; continue; }

        console.log(`[Groq] success with ${model}`);
        return res.status(200).json({ content: [{ type: 'text', text }], model });

      } catch (e) {
        lastError = e.message;
        console.warn(`[Groq] ${model} threw:`, e.message);
      }
    }
    console.warn('[Groq] all models failed, falling back to Gemini');
  }

  // ── 2. Gemini fallback ────────────────────────────────────────
  if (geminiKey) {
    const geminiBody = {
      contents: messages.map(m => ({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }],
      })),
      generationConfig: { maxOutputTokens: 1400, temperature: 0.72 },
    };
    if (system) geminiBody.system_instruction = { parts: [{ text: String(system) }] };

    for (const model of GEMINI_MODELS) {
      try {
        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
        );

        let data;
        try { data = await upstream.json(); } catch { continue; }

        const errMsg = (data?.error?.message || '').toLowerCase();
        if (upstream.status === 404 || errMsg.includes('not found') || errMsg.includes('not supported')) {
          continue;
        }
        if (upstream.status === 429 || errMsg.includes('quota') || errMsg.includes('rate limit')) {
          console.warn(`[Gemini] ${model} quota exceeded`);
          lastError = data?.error?.message || lastError;
          continue;
        }
        if (!upstream.ok) {
          lastError = data?.error?.message || `Gemini HTTP ${upstream.status}`;
          continue;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) { lastError = 'Empty response'; continue; }

        console.log(`[Gemini] success with ${model}`);
        return res.status(200).json({ content: [{ type: 'text', text }], model });

      } catch (e) {
        lastError = e.message;
        console.warn(`[Gemini] ${model} threw:`, e.message);
      }
    }
  }

  // All providers failed
  return res.status(503).json({
    error: `AI temporarily unavailable — please try again in a moment. ${groqKey ? '' : 'Tip: add GROQ_API_KEY in Vercel for more reliable AI (free at console.groq.com).'}`,
  });
}
