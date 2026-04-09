// api/chat.js — ADVY Health Vercel Serverless Function
// ─────────────────────────────────────────────────────────────
// AI:           Google Gemini 2.5 Flash-Lite (free tier: ~1,000 req/day)
// Daily limit:  20 messages per user per day  (via Firestore REST — no Admin SDK needed)
// Discord:      Pings on signup + login
// Env vars needed in Vercel:
//   GEMINI_API_KEY         — from Google AI Studio
//   DISCORD_WEBHOOK_URL    — from your Discord server channel settings
//   REACT_APP_FIREBASE_API_KEY   — same key as your frontend
//   FIREBASE_PROJECT_ID    — "advyhealth"  (or set to match your project)
// ─────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 50;

// ── Discord ping ─────────────────────────────────────────────
async function pingDiscord(message) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    });
  } catch (e) {
    console.warn('[Discord] ping failed:', e.message);
  }
}

// ── Daily limit via Firestore REST API (no Admin SDK required) ─
async function checkAndIncrementLimit(userId) {
  const apiKey    = process.env.REACT_APP_FIREBASE_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'advyhealth';

  if (!apiKey || !userId) return { allowed: true, count: 0 };

  const today = new Date().toISOString().split('T')[0];
  const docId = `${userId}_${today}`;
  const base  = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const url   = `${base}/usage/${docId}?key=${apiKey}`;

  try {
    // Read current count
    const getRes  = await fetch(url);
    const current = getRes.ok ? await getRes.json() : null;
    const count   = current?.fields?.count?.integerValue
      ? parseInt(current.fields.count.integerValue, 10)
      : 0;

    if (count >= FREE_DAILY_LIMIT) {
      return { allowed: false, count };
    }

    // Increment
    await fetch(url, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          count:  { integerValue: String(count + 1) },
          userId: { stringValue:  userId },
          date:   { stringValue:  today },
        },
      }),
    });

    return { allowed: true, count: count + 1 };
  } catch (e) {
    // Non-fatal — don't block the user if Firestore is unreachable
    console.warn('[Usage] check failed (non-fatal):', e.message);
    return { allowed: true, count: 0 };
  }
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  // ── Action routes (Discord pings, no AI needed) ───────────
  if (body.action === 'user_signup') {
    const { email = 'Unknown', name = 'Unknown' } = body;
    await pingDiscord(
      `🎉 **New Lazuli Crest signup!**\n` +
      `👤 ${name}\n` +
      `📧 ${email}\n` +
      `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`
    );
    return res.status(200).json({ ok: true });
  }

  if (body.action === 'user_login') {
    const { email = 'Unknown' } = body;
    await pingDiscord(
      `🔑 **Lazuli Crest — User logged in**\n` +
      `📧 ${email}\n` +
      `🕐 ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`
    );
    return res.status(200).json({ ok: true });
  }

  // ── AI Chat route ─────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({
      error:
        'GEMINI_API_KEY is not set. Go to Vercel → your project → Settings → ' +
        'Environment Variables → add GEMINI_API_KEY (get it free at aistudio.google.com).',
    });
  }

  const { messages, system, userId } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided.' });
  }

  // ── Daily limit check ─────────────────────────────────────
  if (userId) {
    try {
      const { allowed, count } = await checkAndIncrementLimit(userId);
      if (!allowed) {
        return res.status(429).json({
          error:
            `You've used all ${FREE_DAILY_LIMIT} free AI messages for today. ` +
            `Your limit resets at midnight. 💜 Your full health log — symptoms, ` +
            `body map, diary, and medications — is still right here for you.`,
          limitReached: true,
          count,
        });
      }
      res.setHeader('X-Daily-Count', String(count));
      res.setHeader('X-Daily-Limit', String(FREE_DAILY_LIMIT));
    } catch (e) {
      console.warn('[Limit] check threw (non-fatal):', e.message);
    }
  }

  // ── Build Gemini request ──────────────────────────────────
  const geminiContents = messages.map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));

  const geminiBody = {
    contents: geminiContents,
    generationConfig: {
      maxOutputTokens: 1200,
      temperature:     0.72,
    },
  };

  // Inject system prompt as a leading model-turn pair (Gemini doesn't have a
  // dedicated system field in Flash-Lite — we use system_instruction instead)
  if (system) {
    geminiBody.system_instruction = {
      parts: [{ text: String(system) }],
    };
  }

  // ── Call Gemini 2.5 Flash-Lite ────────────────────────────
  // Model string: gemini-2.5-flash-lite-preview-06-17
  // Falls back to gemini-1.5-flash if the preview isn't available yet
  const MODEL   = 'gemini-2.5-flash-lite-preview-06-17';
  const FALLBACK = 'gemini-1.5-flash';

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

  try {
    let upstream = await callGemini(MODEL);

    // If the preview model isn't found, try stable Flash
    if (upstream.status === 404) {
      console.warn(`[Gemini] ${MODEL} not found, falling back to ${FALLBACK}`);
      upstream = await callGemini(FALLBACK);
    }

    let data;
    try {
      data = await upstream.json();
    } catch {
      return res.status(502).json({
        error: 'Gemini returned an unparseable response. Your API key may be invalid.',
      });
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

    // Return in Anthropic-compatible shape so the existing frontend
    // (json.content[0].text) needs zero changes
    return res.status(200).json({
      content: [{ type: 'text', text }],
      model:   MODEL,
    });

  } catch (err) {
    console.error('[Chat] handler error:', err);
    return res.status(500).json({
      error:   'Failed to reach the AI API.',
      details: err.message,
    });
  }
}
