// ─────────────────────────────────────────────────────────────────────────────
// APP.JSX PATCH INSTRUCTIONS
// Apply these changes to your existing src/App.jsx from advy-health-v2
// ─────────────────────────────────────────────────────────────────────────────
//
// CHANGE 1 — Add ProfileSection import at the top with other imports:
// ──────────────────────────────────────────────────────────────────
//   import ProfileSection from "./components/ProfileSection";
//
//
// CHANGE 2 — Update NAV array (add Profile, remove duplicate Privacy):
// ──────────────────────────────────────────────────────────────────
// Replace the existing NAV array with this one:

export const NAV_UPDATED = [
  { id:'dashboard',    icon:'⬡',  label:'Home'            },
  { id:'symptoms',     icon:'◈',  label:'Symptoms'        },
  { id:'bodymap',      icon:'◎',  label:'Body Map'        },
  { id:'brain',        icon:'🧠', label:'The Brain'       },
  { id:'medications',  icon:'◉',  label:'Medications'     },
  { id:'appointments', icon:'◷',  label:'Appointments'    },
  { id:'diary',        icon:'✑',  label:'My Diary'        },
  { id:'diet',         icon:'✿',  label:'AI Diet'         },
  { id:'documents',    icon:'◫',  label:'Documents'       },
  { id:'advocate',     icon:'✦',  label:'AI Advocate'     },
  { id:'profile',      icon:'◈',  label:'My Profile'      },
  { id:'share',        icon:'⟡',  label:'Share & Privacy' },
];


// CHANGE 3 — Add this tab render inside the main <div> where other tabs are:
// ──────────────────────────────────────────────────────────────────
//   {tab==='profile' && <ProfileSection data={data} upd={upd} user={user}/>}


// CHANGE 4 — Daily limit display in Advocate component
// Add this state at the top of the Advocate function:
//   const [dailyCount, setDailyCount] = useState(0);
//   const [limitHit, setLimitHit]     = useState(false);
// Update the send() function's fetch call to pass userId and handle 429:

export const ADVOCATE_SEND_UPDATED = `
  const send = async (txt) => {
    const text = txt || input.trim();
    if (!text || loading || limitHit) return;
    setInput(''); setError('');
    const newMsgs = [...msgs, { role:'user', content:text }];
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
          userId: user?.uid,    // <-- pass user ID for daily limit tracking
        })
      });
      const json = await res.json();

      // Handle daily limit
      if (res.status === 429 || json.limitReached) {
        setLimitHit(true);
        setMsgs(m => [...m, { role:'assistant', content: json.error || 'Daily limit reached. 💜' }]);
        setLoading(false);
        return;
      }

      if (!res.ok || json.error) throw new Error(json.error || 'HTTP ' + res.status);

      const dailyCount = res.headers.get('X-Daily-Count');
      if (dailyCount) setDailyCount(parseInt(dailyCount));

      const reply = json.content?.map(b => b.text||'').join('') || '';
      setMsgs(m => [...m, { role:'assistant', content:reply }]);
    } catch (e) {
      setError('Connection error: ' + e.message);
      setMsgs(m => [...m, { role:'assistant', content: "I'm so sorry — I couldn't connect right now. 💜" }]);
    }
    setLoading(false);
  };
`;


// CHANGE 5 — Add Discord ping calls to AuthScreen sign-in and sign-up handlers
// ──────────────────────────────────────────────────────────────────
// In handleSignin, after successful signInWithEmailAndPassword, add:
//   fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'user_login', email }) });
//
// In handleSignup, after successful createUserWithEmailAndPassword, add:
//   fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'user_signup', email, name: name.trim() }) });


// CHANGE 6 — Add daily limit banner in Advocate JSX, just below the header div:
//   {limitHit && (
//     <div style={{ padding:'12px 16px', background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:11, fontSize:13, color:'rgba(201,168,76,.8)', lineHeight:1.6 }}>
//       💜 You've used your 5 free AI messages for today. Your limit resets at midnight.
//     </div>
//   )}
//   {!limitHit && dailyCount > 0 && (
//     <div style={{ fontSize:11, color:'rgba(240,232,255,.2)', textAlign:'right' }}>
//       {dailyCount}/5 free messages used today
//     </div>
//   )}


// ─────────────────────────────────────────────────────────────────────────────
// THAT'S ALL THE CHANGES NEEDED.
// The rest of App.jsx stays identical to advy-health-v2.
// ─────────────────────────────────────────────────────────────────────────────
