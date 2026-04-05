// ─────────────────────────────────────────────────────────────────────────────
// DROP-IN REPLACEMENT SNIPPETS FOR App.jsx
// Copy these functions to replace the matching ones in your existing App.jsx
// ─────────────────────────────────────────────────────────────────────────────

// ── REPLACE handleSignin in AuthScreen with this: ─────────────
async function handleSignin_REPLACEMENT() {
  if (!email || !pass) { setError('Please enter your email and password.'); return; }
  setLoading(true); clear();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    // 🔔 Discord ping
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'user_login', email }),
    }).catch(() => {});
  } catch (e) {
    setError(e.code === 'auth/invalid-credential' ? 'Invalid email or password.' : 'Sign in failed. Please try again.');
  }
  setLoading(false);
}

// ── REPLACE handleSignup in AuthScreen with this: ─────────────
async function handleSignup_REPLACEMENT() {
  if (!name.trim())     { setError('Please enter your name.'); return; }
  if (!email)           { setError('Please enter your email.'); return; }
  if (pass.length < 8)  { setError('Password must be at least 8 characters.'); return; }
  if (pass !== confirm) { setError('Passwords do not match.'); return; }
  if (accountType === 'caree' && !careeName.trim()) {
    setError('Please enter the name of the person you are caring for.'); return;
  }
  setLoading(true); clear();
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name.trim() });
    const ref = doc(db, 'users', cred.user.uid);
    await setDoc(ref, {
      ...BLANK_DATA,
      profile: { name: name.trim(), conditions: '', goal: '', accountType, careeName: careeName.trim() }
    });
    // 🔔 Discord ping
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'user_signup', email, name: name.trim() }),
    }).catch(() => {});
  } catch (e) {
    setError(e.code === 'auth/email-already-in-use'
      ? 'An account with this email already exists.'
      : 'Sign up failed. Please try again.');
  }
  setLoading(false);
}

// ── REPLACE the send() function inside Advocate with this: ────
async function send_REPLACEMENT(txt) {
  const text = txt || input.trim();
  if (!text || loading || limitHit) return;
  setInput(''); setError('');
  const newMsgs = [...msgs, { role: 'user', content: text }];
  setMsgs(newMsgs);
  setLoading(true); setStream('');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        max_tokens: 1200,
        system: SYS_ADVOCATE(data),
        messages: newMsgs,
        userId: user?.uid,
      })
    });

    const json = await res.json();

    // Handle daily limit (429)
    if (res.status === 429 || json.limitReached) {
      setLimitHit(true);
      setMsgs(m => [...m, {
        role: 'assistant',
        content: json.error || "You've used your 5 free AI messages for today. Your limit resets at midnight. 💜 In the meantime, your full health log is still here — you can review your symptoms, body map, and diary at any time."
      }]);
      setLoading(false);
      return;
    }

    if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);

    // Track daily count
    const countHeader = res.headers.get('X-Daily-Count');
    if (countHeader) setDailyCount(parseInt(countHeader));

    const reply = json.content?.map(b => b.text || '').join('') || '';
    setMsgs(m => [...m, { role: 'assistant', content: reply }]);

  } catch (e) {
    const errMsg = e.message.includes('GEMINI_API_KEY') || e.message.includes('API_KEY')
      ? 'The AI API key is not configured. Please add GEMINI_API_KEY to your Vercel environment variables.'
      : `Connection error: ${e.message}`;
    setError(errMsg);
    setMsgs(m => [...m, { role: 'assistant', content: "I'm so sorry — I couldn't connect right now. 💜 " + errMsg }]);
  }
  setLoading(false);
}

// ── ADD these two state declarations inside the Advocate function: ─
// const [dailyCount, setDailyCount] = useState(0);
// const [limitHit, setLimitHit]     = useState(false);

// ── ADD this banner JSX inside Advocate, just after the header <div>: ──
/*
  {limitHit && (
    <div style={{ padding:'12px 16px', background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:11, fontSize:13, color:'rgba(201,168,76,.8)', lineHeight:1.6 }}>
      💜 You've used all 5 free AI messages for today. Your limit resets at midnight.
      All your health data is still fully accessible.
    </div>
  )}
  {!limitHit && dailyCount > 0 && (
    <div style={{ fontSize:11, color:'rgba(240,232,255,.18)', textAlign:'right', marginTop:-4 }}>
      {dailyCount} of 5 free messages used today
    </div>
  )}
*/

// ── ADD the same send() and state changes to AIDiet generate() function: ──
// In AIDiet, replace the fetch call inside generate() with:
async function diet_generate_REPLACEMENT() {
  if (!goal) { alert('Please select a goal.'); return; }
  setLoading(true); setResult(''); setStream('');
  const prompt = `You are a compassionate functional nutrition advisor for someone living with chronic illness.

Patient conditions: ${data.profile?.conditions || 'chronic illness'}
Current medications: ${data.medications?.filter(m => m.active).map(m => m.name).join(', ') || 'none'}
Dietary goal: ${goal}
Restrictions: ${restrictions || 'none'}

Please provide:
1. Why this goal matters for their specific conditions (2–3 sentences)
2. 6–8 specific anti-inflammatory, accessible foods to focus on
3. 4–5 foods to minimize and why
4. A sample one-day gentle meal plan (breakfast, lunch, dinner, snack)
5. One simple recipe they can make this week (with ingredients and steps)
6. A brief, warm reminder that eating well with chronic illness takes real effort and they are doing enough

Tone: warm, non-judgmental, empowering. Keep each section clearly labeled with headers.`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    const text = json.content?.map(b => b.text || '').join('') || '';
    setResult(text);
  } catch (e) {
    setResult(`Something went wrong: ${e.message}. Make sure GEMINI_API_KEY is set in your Vercel environment variables.`);
  }
  setLoading(false);
}
