// api/chat.js — Vercel Serverless Function
// Powered by Google Gemini 1.5 Flash (free tier)
// Daily limit: 5 messages per user via Firestore
// Discord webhook: pings on signup/login


const FREE_DAILY_LIMIT = 300;

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
    console.warn('Discord ping failed:', e.message);
  }
}

async function checkDailyLimit(userId) {
  const adminKey = process.env.FIREBASE_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'advyhealth';
  if (!adminKey || !userId) return { allowed: true, count: 0 };

  const today = new Date().toISOString().split('T')[0];
  const docId  = `${userId}_${today}`;
  const url    = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/usage/${docId}?key=${adminKey}`;

  try {
    const getRes = await fetch(url);
    const existing = getRes.ok ? await getRes.json() : null;
    const count    = existing?.fields?.count?.integerValue ? parseInt(existing.fields.count.integerValue) : 0;

    if (count >= FREE_DAILY_LIMIT) return { allowed: false, count };

    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          count:  { integerValue: count + 1 },
          userId: { stringValue: userId },
          date:   { stringValue: today },
        },
      }),
    });
    return { allowed: true, count: count + 1 };
  } catch (e) {
    console.warn('Usage check failed (non-fatal):', e.message);
    return { allowed: true, count: 0 };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { action, messages, system, userId, email, name } = req.body || {};

  // ── Discord ping routes ─────────────────────────────────────
  if (action === 'user_signup') {
    await pingDiscord(`🎉 **New ADVY Health signup!**\n👤 ${name || 'Unknown'}\n📧 ${email || 'Unknown'}\n🕐 ${new Date().toLocaleString()}`);
    return res.status(200).json({ ok: true });
  }
  if (action === 'user_login') {
    await pingDiscord(`🔑 **User logged in**\n📧 ${email || 'Unknown'}\n🕐 ${new Date().toLocaleString()}`);
    return res.status(200).json({ ok: true });
  }

  // ── AI Chat ─────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not set in Vercel environment variables. Go to Vercel → your project → Settings → Environment Variables and add it.',
    });
  }

  if (!messages?.length) return res.status(400).json({ error: 'No messages provided.' });

  // Daily limit check
  if (userId) {
    try {
      const { allowed, count } = await checkDailyLimit(userId);
      if (!allowed) {
        return res.status(429).json({
          error: `You've used all ${FREE_DAILY_LIMIT} free AI messages for today. Your limit resets at midnight. 💜`,
          limitReached: true,
          count,
        });
      }
      res.setHeader('X-Daily-Count', String(count));
    } catch (e) {
      console.warn('Limit check error (non-fatal):', e.message);
    }
  }

  // Convert to Gemini format
  const contents = messages.map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: {
      maxOutputTokens: 1200,
      temperature:     0.75,
    },
  };

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const upstream = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    let data;
    try {
      data = await upstream.json();
    } catch {
      return res.status(500).json({ error: 'Gemini returned an unparseable response. Check your API key.' });
    }

    if (!upstream.ok) {
      console.error('Gemini error:', data);
      return res.status(upstream.status).json({ error: data?.error?.message || 'Gemini API error' });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return res.status(500).json({ error: 'Empty response from Gemini.' });

    // Return in Anthropic-compatible shape (front-end uses json.content[0].text)
    return res.status(200).json({
      content: [{ type: 'text', text }],
      model:   'gemini-1.5-flash',
    });

  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Failed to reach Gemini API.', details: err.message });
  }
}