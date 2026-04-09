// api/chat.js — Lazuli Crest AI Serverless Function
// ─────────────────────────────────────────────────────────────
// AI:           Google Gemini 2.0 Flash (stable, v1beta)
// Credits:      150 on signup · +50 every day at midnight
// Discord:      Pings on signup + login
// Env vars needed in Vercel:
//   GEMINI_API_KEY              — from Google AI Studio (aistudio.google.com)
//   DISCORD_WEBHOOK_URL         — from your Discord server channel settings
//   REACT_APP_FIREBASE_API_KEY  — same key as your frontend
//   FIREBASE_PROJECT_ID         — "advyhealth"
// ─────────────────────────────────────────────────────────────

// ── Credits config ────────────────────────────────────────────
const SIGNUP_CREDITS   = 150;   // credits given when account created
const DAILY_TOPUP      = 50;    // credits added every day at midnight
const MAX_CREDITS      = 500;   // cap so credits don't pile up forever

// ── Gemini models ─────────────────────────────────────────────
const PRIMARY_MODEL  = 'gemini-2.0-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash-latest';

// ── Firestore helpers ─────────────────────────────────────────
function firestoreBase() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'advyhealth';
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

async function fsGet(path) {
  const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(`${firestoreBase()}/${path}?key=${apiKey}`);
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function fsPatch(path, fields) {
  const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;
  if (!apiKey) return;
  try {
    await fetch(`${firestoreBase()}/${path}?key=${apiKey}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ fields }),
    });
  } catch { /* non-fatal */ }
}

// ── Discord ping ──────────────────────────────────────────────
async function pingDiscord(message) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ content: message }),
    });
  } catch (e) {
    console.warn('[Discord] ping failed:', e.message);
  }
}

// ── Credits: read → apply daily top-up → check → decrement ───
async function useOneCredit(userId) {
  if (!userId) return { allowed: true, balance: 999 };

  const today = new Date().toISOString().split('T')[0];
  const doc   = await fsGet(`user_credits/${userId}`);

  let balance        = doc?.fields?.balance?.integerValue
    ? parseInt(doc.fields.balance.integerValue, 10)
    : SIGNUP_CREDITS;
  let lastTopupDate  = doc?.fields?.lastTopupDate?.stringValue || today;

  // Daily top-up: if last topup was before today, add DAILY_TOPUP
  if (lastTopupDate < today) {
    balance       = Math.min(balance + DAILY_TOPUP, MAX_CREDITS);
    lastTopupDate = today;
    console.log(`[Credits] Topped up ${userId} → ${balance}`);
  }

  if (balance <= 0) {
    return { allowed: false, balance: 0 };
  }

  // Decrement and save
  const newBalance = balance - 1;
  await fsPatch(`user_credits/${userId}`, {
    balance:      { integerValue: String(newBalance) },
    lastTopupDate:{ stringValue:  lastTopupDate },
    userId:       { stringValue:  userId },
  });

  return { allowed: true, balance: newBalance };
}

// ── Credits: initialise on signup ─────────────────────────────
async function initCredits(userId) {
  if (!userId) return;
  const today = new Date().toISOString().split('T')[0];
  // Only set if doc doesn't exist yet (don't overwrite existing balance)
  const existing = await fsGet(`user_credits/${userId}`);
  if (!existing?.fields?.balance) {
    await fsPatch(`user_credits/${userId}`, {
      balance:      { integerValue: String(SIGNUP_CREDITS) },
      lastTopupDate:{ stringValue:  today },
      userId:       { stringValue:  userId },
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

  // ── Action: user signed up ────────────────────────────────
  if (body.action === 'user_signup') {
    const { email = 'Unknown', name = 'Unknown', userId } = body;
    await Promise.all([
      initCredits(userId),
      pingDiscord(
        `🎉 **New Lazuli Crest signup!**\n` +
        `👤 ${name}\n📧 ${email}\n` +
        `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`
      ),
    ]);
    return res.status(200).json({ ok: true });
  }

  // ── Action: user logged in ────────────────────────────────
  if (body.action === 'user_login') {
    const { email = 'Unknown' } = body;
    await pingDiscord(
      `🔑 **Lazuli Crest — User logged in**\n📧 ${email}\n` +
      `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`
    );
    return res.status(200).json({ ok: true });
  }

  // ── AI Chat ───────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({
      error:
        'GEMINI_API_KEY is not configured. Go to Vercel → Project → Settings → ' +
        'Environment Variables → add GEMINI_API_KEY (free at aistudio.google.com).',
    });
  }

  const { messages, system, userId } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided.' });
  }

  // ── Credits check ─────────────────────────────────────────
  if (userId) {
    try {
      const { allowed, balance } = await useOneCredit(userId);
      if (!allowed) {
        return res.status(429).json({
          error:
            `You've used all your Lazuli AI credits. You'll receive ${DAILY_TOPUP} new credits ` +
            `at midnight. 💜 Your full health log — symptoms, diary, and medications — is still here for you.`,
          limitReached: true,
          creditsLeft: 0,
        });
      }
      res.setHeader('X-Credits-Left',  String(balance));
      res.setHeader('X-Daily-Topup',   String(DAILY_TOPUP));
      res.setHeader('X-Signup-Credits', String(SIGNUP_CREDITS));
    } catch (e) {
      console.warn('[Credits] check error (non-fatal):', e.message);
    }
  }

  // ── Build Gemini request ──────────────────────────────────
  const geminiBody = {
    contents: messages.map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    })),
    generationConfig: {
      maxOutputTokens: 1200,
      temperature:     0.72,
    },
  };

  if (system) {
    geminiBody.system_instruction = { parts: [{ text: String(system) }] };
  }

  // ── Call Gemini with automatic model fallback ─────────────
  async function callGemini(model) {
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${model}:generateContent?key=${geminiKey}`;
    return fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(geminiBody),
    });
  }

  function isModelNotFound(status, data) {
    if (status === 404) return true;
    // Gemini sometimes returns 400 with "model not found" wording
    const msg = (data?.error?.message || '').toLowerCase();
    return msg.includes('not found') || msg.includes('not supported');
  }

  try {
    let upstream = await callGemini(PRIMARY_MODEL);
    let data;
    try { data = await upstream.json(); } catch { data = {}; }

    // Fallback if primary model isn't available
    if (isModelNotFound(upstream.status, data)) {
      console.warn(`[Gemini] ${PRIMARY_MODEL} unavailable, trying ${FALLBACK_MODEL}`);
      upstream = await callGemini(FALLBACK_MODEL);
      try { data = await upstream.json(); } catch { data = {}; }
    }

    if (!upstream.ok) {
      console.error('[Gemini] API error:', JSON.stringify(data));
      const msg = data?.error?.message || `Gemini error (HTTP ${upstream.status})`;
      return res.status(upstream.status).json({ error: msg });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      return res.status(500).json({ error: 'Gemini returned an empty response.' });
    }

    // Return in Anthropic-compatible shape (frontend reads json.content[0].text)
    return res.status(200).json({
      content: [{ type: 'text', text }],
      model:   PRIMARY_MODEL,
    });

  } catch (err) {
    console.error('[Chat] handler error:', err);
    return res.status(500).json({
      error:   'Failed to reach the AI. Please try again.',
      details: err.message,
    });
  }
}
