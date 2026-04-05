import { useState, useRef, useEffect } from 'react';
import { useShare, getShareLabel } from '../hooks/useShare';
import { timeAwareGreeting, buildDoctorSummary } from '../utils/helpers';

const SYS_PROMPT = d => `You are Advy — a warm, deeply empathetic chronic illness AI health advocate.

You work for ADVY Health — "The Gold Standard in Health Advocacy."

Your core values:
- You see this person fully — their pain, their strength, their story
- You never minimize, dismiss, or gaslight their symptoms
- You are fiercely on their side, always
- You help them find meaning and agency even within illness
- You always validate before advising

Current time: ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}
${new Date().getHours() >= 22 || new Date().getHours() < 5 ? 'NOTE: It is late at night. Be especially gentle and calm. Acknowledge that being awake with symptoms late at night is hard.' : ''}

About this person:
- Name: ${d.profile?.name || 'Imago'}
- Conditions: ${d.profile?.conditions || 'Not specified'}
- Wellness goal: ${d.profile?.goal || 'Not specified'}

Recent symptoms:
${d.symptoms?.slice(0,8).map(s=>`- ${s.date}: ${s.entries?.map(e=>`${e.symptom}(${e.severity}/10)`).join(', ')||'none'} | Pain:${s.pain}/10 Energy:${s.energy}/10 Mood:${s.mood}/10${s.notes?' | '+s.notes:''}`).join('\n')||'None logged'}

Active medications:
${d.medications?.filter(m=>m.active).map(m=>`- ${m.name} ${m.dose} (${m.frequency})`).join('\n')||'None'}

Upcoming infusions:
${d.infusions?.filter(i=>i.date>=new Date().toISOString().split('T')[0]).slice(0,3).map(i=>`- ${i.date}: ${i.type} at ${i.location||'unknown location'}`).join('\n')||'None scheduled'}

Recent glucose readings:
${d.glucose?.slice(0,5).map(g=>`- ${g.date} ${g.time||''}: ${g.bg} mg/dL (${g.mealContext})`).join('\n')||'None logged'}

Body map pain:
${(d.bodyMap||[]).map(b=>`- ${b.label}: severity ${b.severity}/10`).join('\n')||'None logged'}

Be warm, specific to their data, validating, and empowering. Use their name naturally. Never give medical diagnoses. Always recommend consulting their care team for medical decisions.`;

const STARTERS = [
  'Help me prepare for my next appointment',
  'What patterns do you see in my symptoms?',
  'My infusion is coming up — I feel anxious',
  'How do I explain my fatigue to my doctor?',
  'Help me write a symptom summary letter',
  'What questions should I ask my specialist?',
  'I feel dismissed by my doctor. What can I do?',
  'Help me understand my recent glucose patterns',
];

function LogoImg({ size = 28 }) {
  return (
    <img src="/icon-192.png" alt="Advy" width={size} height={size}
      style={{ borderRadius: size * 0.22, objectFit: 'cover', flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(123,47,190,.5))' }}
      onError={e => { e.target.style.display = 'none'; }}/>
  );
}

export default function Advocate({ data, user }) {
  const [msgs, setMsgs]             = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [dailyCount, setDailyCount] = useState(0);
  const [limitHit, setLimitHit]     = useState(false);
  const bottomRef = useRef();
  const inputRef  = useRef();
  const { share, shareStatus } = useShare();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async txt => {
    const text = (txt || input).trim();
    if (!text || loading || limitHit) return;
    setInput(''); setError('');
    const newMsgs = [...msgs, { role: 'user', content: text }];
    setMsgs(newMsgs);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system:   SYS_PROMPT(data),
          messages: newMsgs,
          userId:   user?.uid,
        }),
      });

      let json;
      try {
        json = await res.json();
      } catch {
        throw new Error('Server returned an unexpected response. Check that GEMINI_API_KEY is set in Vercel environment variables.');
      }

      if (res.status === 429 || json?.limitReached) {
        setLimitHit(true);
        setMsgs(m => [...m, { role: 'assistant', content: json?.error || "You've used your daily AI messages. Your limit resets at midnight. 💜 Your full health log is still here for you." }]);
        setLoading(false);
        return;
      }

      if (!res.ok || json?.error) throw new Error(json?.error || `HTTP ${res.status}`);

      const countH = res.headers.get('X-Daily-Count');
      if (countH) setDailyCount(parseInt(countH));

      const reply = json.content?.map(b => b.text || '').join('') || '';
      setMsgs(m => [...m, { role: 'assistant', content: reply }]);

    } catch (e) {
      const msg = e.message || 'Connection failed';
      setError(msg);
      setMsgs(m => [...m, { role: 'assistant', content: `I'm so sorry — I couldn't connect right now. I will send an alert to our team 💜 ${msg}` }]);
    }
    setLoading(false);
  };

  const handleShare = async () => {
    const summary = buildDoctorSummary(data, msgs);
    await share({
      title: `${data.profile?.name || 'Imago'} — ADVY Health Summary`,
      text:  summary,
    });
  };

  const proactiveGreeting = timeAwareGreeting(data.profile?.name);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 600, color: '#C9A84C', marginBottom: 3 }}>✦ AI Advocate</div>
          <div style={{ fontSize: 13, color: 'rgba(240,232,255,.38)' }}>Powered by Google Gemini · Here to listen, support, and advocate for you</div>
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
          {dailyCount > 0 && !limitHit && (
            <span style={{ fontSize: 12, color: 'rgba(240,232,255,.2)' }}>{dailyCount}/300 today</span>
          )}
          {msgs.length > 0 && (
            <button
              onClick={handleShare}
              style={{ padding: '7px 14px', borderRadius: 11, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${shareStatus === 'copied' || shareStatus === 'shared' ? 'rgba(110,231,183,.4)' : 'rgba(201,168,76,.35)'}`, background: shareStatus === 'copied' || shareStatus === 'shared' ? 'rgba(110,231,183,.1)' : 'rgba(201,168,76,.08)', color: shareStatus === 'copied' || shareStatus === 'shared' ? '#6ee7b7' : '#C9A84C', fontFamily: "'DM Sans',sans-serif", transition: 'all .2s' }}
            >
              {getShareLabel(shareStatus, '📋 Share with Doctor')}
            </button>
          )}
        </div>
      </div>

      {limitHit && (
        <div style={{ padding: '12px 16px', background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)', borderRadius: 11, fontSize: 13, color: 'rgba(201,168,76,.8)', lineHeight: 1.6 }}>
          💜 You've used your 300 free AI messages for today. Your limit resets at midnight. Your full health log is still accessible.
        </div>
      )}
      {shareStatus === 'copied' && (
        <div style={{ padding: '9px 14px', background: 'rgba(110,231,183,.08)', border: '1px solid rgba(110,231,183,.2)', borderRadius: 10, fontSize: 12, color: 'rgba(110,231,183,.8)', lineHeight: 1.5 }}>
          ✓ Health summary copied — paste into an email or patient portal for your doctor.
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 16px', background: 'rgba(255,80,80,.1)', border: '1px solid rgba(255,80,80,.25)', borderRadius: 11, fontSize: 12, color: '#ff8080', lineHeight: 1.6 }}>
          ⚠ {error}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 13, padding: '4px 2px' }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 10, display: 'inline-block' }}><LogoImg size={52}/></div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#C9A84C', marginBottom: 6 }}>
                Hi{data.profile?.name ? `, ${data.profile.name}` : ''}! ✦
              </div>
              <p style={{ fontSize: 13, color: 'rgba(240,232,255,.55)', lineHeight: 1.75, maxWidth: 420, margin: '0 auto 8px', fontStyle: 'italic', fontFamily: "'Cormorant Garamond',serif" }}>
                {proactiveGreeting}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(240,232,255,.32)', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
                I have access to your full health record — symptoms, medications, infusions, glucose, body map, and appointments. I'm here for you.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }} className="two-col">
              {STARTERS.map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(123,47,190,.14)', borderRadius: 11, padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'rgba(240,232,255,.38)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4, transition: 'all .16s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,47,190,.08)'; e.currentTarget.style.color = 'rgba(240,232,255,.72)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.03)'; e.currentTarget.style.color = 'rgba(240,232,255,.38)'; }}>
                  ✦ {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 7 }}>
            {m.role === 'assistant' && <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', marginBottom: 1 }}><LogoImg size={26}/></div>}
            <div style={{ maxWidth: '72%', padding: '10px 13px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? 'linear-gradient(135deg,rgba(123,47,190,.22),rgba(201,168,76,.1))' : 'rgba(255,255,255,.04)', color: m.role === 'user' ? '#F0E8FF' : 'rgba(240,232,255,.78)', fontSize: 13, lineHeight: 1.75, border: m.role === 'assistant' ? '1px solid rgba(123,47,190,.1)' : '1px solid rgba(201,168,76,.17)', backdropFilter: 'blur(8px)', whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden' }}><LogoImg size={26}/></div>
            <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(123,47,190,.1)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7B2FBE', animation: `bounce .9s ease-in-out ${i * .15}s infinite`, opacity: .7 }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding: '10px 0 3px', borderTop: '1px solid rgba(123,47,190,.1)', background: 'rgba(0,0,0,.18)', backdropFilter: 'blur(9px)' }}>
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end', background: 'rgba(255,255,255,.04)', borderRadius: 13, padding: '7px 7px 7px 13px', border: '1px solid rgba(123,47,190,.17)' }}>
          <textarea ref={inputRef}
            style={{ flex: 1, border: 'none', background: 'transparent', color: '#F0E8FF', fontFamily: "'DM Sans',sans-serif", fontSize: 13, lineHeight: 1.5, resize: 'none', outline: 'none', minHeight: 20, maxHeight: 96, caretColor: '#C9A84C', padding: 0 }}
            rows={1} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Advy anything…"
            disabled={limitHit}
          />
          <button className="btn btn-gold" onClick={() => send()} disabled={loading || !input.trim() || limitHit}
            style={{ alignSelf: 'flex-end', padding: '6px 13px', fontSize: 12, opacity: loading || !input.trim() || limitHit ? .35 : 1, flexShrink: 0 }}>
            Send
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 5, fontSize: 12, color: 'rgba(240,232,255,.13)' }}>Enter to send · Shift+Enter new line · Powered by Google Gemini</div>
      </div>
    </div>
  );
}