// api/chat.js — Vercel Serverless Function
// Proxies requests to Anthropic so the API key stays server-side
// and CORS issues are completely bypassed.
//
// SETUP: In Vercel dashboard → your project → Settings → Environment Variables
// Add: ANTHROPIC_API_KEY = sk-ant-...your key...

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables.' });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('Anthropic proxy error:', err);
    return res.status(500).json({ error: 'Failed to reach Anthropic API', details: err.message });
  }
}
