// api/chat.js — Vercel Serverless Function
// Uses Google Gemini 2.5 Flash-Lite (free tier: 1,000 req/day)
// Enforces 20 messages/day per user via Firebase
// Pings Discord webhook on new signup/login

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Init Firebase Admin (server-side) ────────────────────────
function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID   || 'advyhealth',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

// ── Discord Webhook helper ────────────────────────────────────
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

// ── Daily message counter ─────────────────────────────────────
const FREE_DAILY_LIMIT = 20;

async function checkAndIncrementLimit(db, userId) {
  const today = new Date().toISOString().split('T')[0];
  const ref   = db.collection('usage').doc(`${userId}_${today}`);
  const snap  = await ref.get();

  if (snap.exists) {
    const count = snap.data().count || 0;
    if (count >= FREE_DAILY_LIMIT) {
      return { allowed: false, count };
    }
    await ref.update({ count: count + 1 });
    return { allowed: true, count: count + 1 };
  } else {
    await ref.set({ userId, date: today, count: 1 });
    return { allowed: true, count: 1 };
  }
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // ── Special action routes (signup/login pings) ──────────────
  const { action } = req.body || {};

  if (action === 'user_signup') {
    const { email, name } = req.body;
    await pingDiscord(`🎉 **New Advy Health signup!**\n👤 ${name || 'Unknown'}\n📧 ${email || 'Unknown'}\n🕐 ${new Date().toLocaleString()}`);
    return res.status(200).json({ ok: true });
  }

  if (action === 'user_login') {
    const { email } = req.body;
    await pingDiscord(`🔑 **User logged in**\n📧 ${email || 'Unknown'}\n🕐 ${new Date().toLocaleString()}`);
    return res.status(200).json({ ok: true });
  }

  // ── AI Chat route ────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel environment variables.' });
  }

  const { messages, system, userId } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'No messages provided.' });

  // ── Daily limit check ────────────────────────────────────────
  if (userId) {
    try {
      const db = getAdminDb();
      const { allowed, count } = await checkAndIncrementLimit(db, userId);
      if (!allowed) {
        return res.status(429).json({
          error: `You've used all ${FREE_DAILY_LIMIT} free AI messages for today. Your limit resets at midnight. 💜`,
          limitReached: true,
          count,
        });
      }
      res.setHeader('X-Daily-Count', count);
    } catch (e) {
      console.warn('Usage check failed (non-fatal):', e.message);
    }
  }

  // ── Call Gemini 2.5 Flash ────────────────────────────────────
  try {
    // Convert messages to Gemini format
    const geminiContents = messages.map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const geminiBody = {
      system_instruction: system ? { parts: [{ text: system }] } : undefined,
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: 1200,
        temperature:     0.7,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`;

    const upstream = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(geminiBody),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Gemini error:', data);
      return res.status(upstream.status).json({ error: data?.error?.message || 'Gemini API error' });
    }

    // Extract text from Gemini response
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      return res.status(500).json({ error: 'Empty response from Gemini.' });
    }

    // Return in Anthropic-compatible shape so front-end needs no changes
    return res.status(200).json({
      content: [{ type: 'text', text }],
      model:   'gemini-2.5-flash',
    });

  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: 'Failed to reach AI API.', details: err.message });
  }
}
