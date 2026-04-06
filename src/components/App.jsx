import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  uid, todayStr, fmtDate, greet, getDailyMessage,
  getProactiveGreeting, buildDoctorSummary,
  FRONT_MUSCLES, BACK_MUSCLES, getMuscleBaseColor, BODY_PAIN_TYPES, BODY_PART_GROUPS,
  BRAIN_LOBES, BRAIN_SYMPTOMS,
} from './utils/helpers';
import { useShare, getShareButtonLabel } from './hooks/useShare';
import { usePersistedTab } from './hooks/useLocalStorage';
import BodyMap from './components/BodyMap';
import BrainSection from './components/BrainSection';
import InfusionHub from './components/InfusionHub';
import MetabolicLab from './components/MetabolicLab';
import HydrationFridge from './components/HydrationFridge';

// ─── Data model ───────────────────────────────────────────────
const BLANK_DATA = {
  profile:       { name:'', conditions:'', goal:'', accountType:'self', careeName:'' },
  symptoms:      [],
  medications:   [],
  appointments:  [],
  documents:     [],
  diary:         [],
  diet:          [],
  dietLogs:      [],
  bodyMap:       [],
  brain:         [],
  metabolicLogs: [],
  hydrationLogs: [],
};

const SYMS = [
  'Fatigue','Pain','Headache','Nausea','Brain fog','Dizziness','Joint pain','Muscle aches',
  'Shortness of breath','Heart palpitations','Insomnia','Anxiety','Swelling','Numbness','Rash',
  'Digestive issues','Fever','Chills','Burning sensation','Stiffness','Weakness','Tingling',
  'Blurred vision','Sensitivity to light','Sensitivity to sound','Memory issues','Confusion',
  'Chest tightness','Night sweats','Hot flashes','Dry eyes','Hair loss','Weight changes',
];

const NAV = [
  { id:'dashboard',    icon:'⬡',  label:'Home'            },
  { id:'symptoms',     icon:'◈',  label:'Symptoms'        },
  { id:'bodymap',      icon:'◎',  label:'Body Map'        },
  { id:'brain',        icon:'🧠', label:'The Brain'       },
  { id:'infusion',     icon:'💉', label:'Infusion Hub'    },
  { id:'metabolic',    icon:'🔬', label:'Metabolic Lab'   },
  { id:'medications',  icon:'◉',  label:'Medications'     },
  { id:'appointments', icon:'◷',  label:'Appointments'    },
  { id:'diary',        icon:'✑',  label:'My Diary'        },
  { id:'diet',         icon:'✿',  label:'AI Diet'         },
  { id:'documents',    icon:'◫',  label:'Documents'       },
  { id:'advocate',     icon:'✦',  label:'AI Advocate'     },
  { id:'profile',      icon:'◈',  label:'My Profile'      },
  { id:'share',        icon:'⟡',  label:'Share & Privacy' },
];

const DIARY_FONTS = [
  { label:'Dancing Script',    value:"'Dancing Script',cursive",      size:20 },
  { label:'Playfair Display',  value:"'Playfair Display',serif",      size:18 },
  { label:'Lora',              value:"'Lora',serif",                   size:18 },
  { label:'Cormorant',         value:"'Cormorant Garamond',serif",    size:20 },
  { label:'EB Garamond',       value:"'EB Garamond',serif",           size:18 },
];
const DIARY_MOODS = ['💜 Loved','✨ Hopeful','🌿 Calm','💪 Determined','🌧 Low','😴 Exhausted','🔥 Frustrated','🦋 Transforming','🌊 Overwhelmed','☀️ Grateful'];
const DIET_GOALS  = ['Reduce inflammation','Manage energy crashes','Support gut health','Reduce brain fog','Balance blood sugar','Support sleep','Reduce joint pain','Support immune function'];

// ─── Root ─────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]           = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData]           = useState(BLANK_DATA);
  const [saving, setSaving]       = useState(false);
  const [tab, setTab]             = usePersistedTab('dashboard');
  const [sideOpen, setSideOpen]   = useState(false);
  const saveTimer                 = useRef(null);
  const unsubRef                  = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (!user) { setData(BLANK_DATA); return; }
    const ref = doc(db, 'users', user.uid);
    unsubRef.current = onSnapshot(ref, snap => {
      if (snap.exists()) setData({ ...BLANK_DATA, ...snap.data() });
      else {
        const init = { ...BLANK_DATA, profile: { name: user.displayName||'', conditions:'', goal:'', accountType:'self', careeName:'' } };
        setDoc(ref, init); setData(init);
      }
    });
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [user]);

  useEffect(() => {
    try { localStorage.setItem('advy_last_tab', tab); } catch {}
  }, [tab]);

  const upd = useCallback((key, val) => {
    setData(d => {
      const next = { ...d, [key]: val };
      if (user) {
        clearTimeout(saveTimer.current);
        setSaving(true);
        saveTimer.current = setTimeout(() => {
          setDoc(doc(db, 'users', user.uid), next, { merge:true })
            .then(()=>setSaving(false))
            .catch(()=>setSaving(false));
        }, 800);
      }
      return next;
    });
  }, [user]);

  if (!authReady) return <Splash/>;
  if (!user)      return <AuthScreen/>;

  const go = t => { setTab(t); setSideOpen(false); };

  return (
    <div style={{ minHeight:'100vh', background:'#030008', fontFamily:"'DM Sans',sans-serif", color:'#F0E8FF', position:'relative', overflow:'hidden' }}>
      <style>{GLOBAL_CSS}</style>
      <AnimatedBackground/>

      <div style={{ display:'flex', maxWidth:1200, margin:'0 auto', minHeight:'100vh', position:'relative', zIndex:1 }}>
        {sideOpen && <div className="mobile-overlay" onClick={()=>setSideOpen(false)}/>}
        <Sidebar tab={tab} setTab={go} user={user} data={data} saving={saving} open={sideOpen} setOpen={setSideOpen}/>

        <main className="main-content">
          <div className="mobile-topbar">
            <button className="hamburger" onClick={()=>setSideOpen(o=>!o)}>
              <span/><span/><span/>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <LogoImg size={28}/>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:900, fontSize:18, color:'#fff', letterSpacing:1 }}>
                ADVY<span style={{ fontWeight:300, color:'rgba(255,255,255,.75)', marginLeft:3 }}>Health</span>
              </span>
            </div>
            {saving && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:'pulseGlow 1s infinite' }}/>}
          </div>

          <div className="page-fade page-inner" key={tab}>
            {tab==='dashboard'    && <Dashboard    data={data} setTab={go} upd={upd} user={user}/>}
            {tab==='symptoms'     && <Symptoms     data={data} upd={upd}/>}
            {tab==='bodymap'      && <BodyMap      data={data} upd={upd}/>}
            {tab==='brain'        && <BrainSection data={data} upd={upd}/>}
            {tab==='infusion'     && <InfusionHub  data={data} upd={upd}/>}
            {tab==='metabolic'    && <MetabolicLab data={data} upd={upd}/>}
            {tab==='medications'  && <Medications  data={data} upd={upd}/>}
            {tab==='appointments' && <Appointments data={data} upd={upd}/>}
            {tab==='diary'        && <Diary        data={data} upd={upd}/>}
            {tab==='diet'         && <AIDiet       data={data} upd={upd}/>}
            {tab==='documents'    && <Documents    data={data} upd={upd}/>}
            {tab==='advocate'     && <Advocate     data={data} user={user}/>}
            {tab==='profile'      && <Profile      data={data} upd={upd} user={user}/>}
            {tab==='share'        && <SharePrivacy data={data} upd={upd} user={user}/>}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────
function LogoImg({ size=56 }) {
  return <img src="/icons/icon-192.png" alt="Advy Health" width={size} height={size}
    style={{ borderRadius:size*.22, objectFit:'cover', flexShrink:0, filter:'drop-shadow(0 0 8px rgba(123,47,190,.5))' }}
    onError={e=>e.target.style.display='none'}/>;
}

// ─── Animated background ──────────────────────────────────────
function AnimatedBackground() {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 20% 10%, rgba(88,28,135,.35) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, rgba(76,29,149,.28) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(15,5,30,.9) 0%, #030008 100%)' }}/>
      {FLOAT_SYMBOLS.map((s,i)=>(
        <div key={i} style={{ position:'absolute', left:`${s.x}%`, top:`${s.y}%`, opacity:0.06+s.o, animation:`drift${(i%3)+1} ${s.d}s ease-in-out infinite`, fontSize:s.size, color:'#C9A84C', userSelect:'none' }}>
          {s.sym}
        </div>
      ))}
    </div>
  );
}

const FLOAT_SYMBOLS = [
  {sym:'🧬',x:5,  y:8,  size:28,o:.04,d:22},
  {sym:'🧬',x:88, y:15, size:22,o:.03,d:28},
  {sym:'🧬',x:45, y:85, size:26,o:.04,d:25},
  {sym:'⚕', x:15, y:40, size:24,o:.05,d:30},
  {sym:'⚕', x:75, y:60, size:20,o:.04,d:26},
  {sym:'⚕', x:92, y:80, size:22,o:.03,d:32},
  {sym:'💧',x:30, y:20, size:18,o:.04,d:20},
  {sym:'💧',x:68, y:35, size:16,o:.03,d:24},
  {sym:'💧',x:12, y:70, size:20,o:.05,d:18},
  {sym:'💧',x:82, y:45, size:14,o:.03,d:22},
  {sym:'🛡', x:55, y:12, size:22,o:.04,d:28},
  {sym:'🛡', x:25, y:88, size:18,o:.03,d:34},
  {sym:'🛡', x:72, y:92, size:24,o:.04,d:26},
  {sym:'💜',x:40, y:50, size:16,o:.04,d:22},
  {sym:'💜',x:90, y:30, size:18,o:.03,d:20},
];

// ─── Global CSS ───────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&family=Dancing+Script:wght@500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lora:ital,wght@0,400;1,400;1,600&family=EB+Garamond:ital,wght@0,400;1,400;1,500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  button,input,select,textarea{font-family:'DM Sans',sans-serif}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:rgba(201,168,76,.3);border-radius:4px}
  ::-webkit-scrollbar-track{background:transparent}

  @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes popIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
  @keyframes drift1{0%,100%{transform:translate(0,0)}30%{transform:translate(20px,-18px)}70%{transform:translate(-15px,12px)}}
  @keyframes drift2{0%,100%{transform:translate(0,0)}40%{transform:translate(-22px,16px)}60%{transform:translate(18px,-14px)}}
  @keyframes drift3{0%,100%{transform:translate(0,0)}50%{transform:translate(14px,20px)}}
  @keyframes pulseGlow{0%,100%{box-shadow:0 0 12px rgba(123,47,190,.4)}50%{box-shadow:0 0 28px rgba(123,47,190,.7)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1) translateY(-4px)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  @keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  @keyframes heartbeat{0%,100%{transform:scale(1)}14%{transform:scale(1.15)}28%{transform:scale(1)}42%{transform:scale(1.08)}70%{transform:scale(1)}}
  @keyframes inkDrop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
  @keyframes slideInLeft{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}

  .page-fade{animation:fadeUp .3s cubic-bezier(.22,1,.36,1)}
  .slide-in{animation:slideInLeft .28s cubic-bezier(.22,1,.36,1)}

  .glass-card{background:rgba(10,4,22,.78);backdrop-filter:blur(20px);border:1px solid rgba(123,47,190,.2);border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.55),inset 0 1px 0 rgba(201,168,76,.05);transition:all .22s ease}
  .glass-card:hover{border-color:rgba(201,168,76,.28);box-shadow:0 12px 44px rgba(0,0,0,.65),0 0 24px rgba(123,47,190,.1);transform:translateY(-2px)}
  .glass-card-static{background:rgba(10,4,22,.78);backdrop-filter:blur(20px);border:1px solid rgba(123,47,190,.2);border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,.5),inset 0 1px 0 rgba(201,168,76,.04)}

  .btn{border:none;border-radius:12px;padding:11px 22px;font-weight:600;font-size:14px;cursor:pointer;transition:all .18s;display:inline-flex;align-items:center;gap:7px;letter-spacing:.1px}
  .btn-gold{background:linear-gradient(135deg,#C9A84C,#E8C96B);color:#000;font-weight:700;box-shadow:0 4px 18px rgba(201,168,76,.35),inset 0 1px 0 rgba(255,255,255,.22)}
  .btn-gold:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(201,168,76,.5)}
  .btn-gold:active{transform:translateY(0)}
  .btn-ghost{background:rgba(123,47,190,.1);border:1px solid rgba(123,47,190,.3);color:rgba(240,232,255,.7)}
  .btn-ghost:hover{background:rgba(123,47,190,.2);border-color:rgba(201,168,76,.4);color:#F0E8FF}
  .btn-danger{background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.2);color:#ff8080}
  .btn-danger:hover{background:#ff5050;color:#fff;border-color:#ff5050}
  .btn-subtle{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(240,232,255,.5)}
  .btn-subtle:hover{background:rgba(255,255,255,.08);color:#F0E8FF}

  .field{background:rgba(255,255,255,.04);border:1.5px solid rgba(123,47,190,.25);border-radius:12px;padding:12px 16px;font-size:14px;color:#F0E8FF;width:100%;outline:none;transition:all .18s;caret-color:#C9A84C}
  .field:focus{border-color:#C9A84C;background:rgba(201,168,76,.05);box-shadow:0 0 0 3px rgba(201,168,76,.09)}
  .field::placeholder{color:rgba(240,232,255,.2)}
  select.field option{background:#0a0215;color:#F0E8FF}
  label{font-size:11px;font-weight:600;color:rgba(201,168,76,.75);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.9px}
  input[type=range]{accent-color:#C9A84C;cursor:pointer;width:100%}
  input[type=checkbox]{accent-color:#7B2FBE;width:16px;height:16px;cursor:pointer}
  .pill{display:inline-flex;align-items:center;gap:5px;background:rgba(123,47,190,.15);border:1px solid rgba(123,47,190,.3);color:#C084FC;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:500}

  .sidebar{width:252px;background:rgba(4,1,12,.96);backdrop-filter:blur(28px);border-right:1px solid rgba(123,47,190,.15);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;z-index:50;flex-shrink:0;box-shadow:4px 0 32px rgba(0,0,0,.6);transition:transform .3s cubic-bezier(.22,1,.36,1)}
  .nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border-radius:12px;border:1px solid transparent;background:transparent;color:rgba(240,232,255,.32);font-size:13px;font-weight:500;cursor:pointer;transition:all .16s;text-align:left;position:relative}
  .nav-item:hover{background:rgba(123,47,190,.08);color:rgba(240,232,255,.7);border-color:rgba(123,47,190,.14)}
  .nav-item.active{background:linear-gradient(135deg,rgba(123,47,190,.18),rgba(123,47,190,.08));color:#C9A84C;border-color:rgba(201,168,76,.2);font-weight:600}

  .main-content{flex:1;display:flex;flex-direction:column;min-height:100vh;position:relative;z-index:1;min-width:0}
  .page-inner{flex:1;padding:28px 32px;padding-bottom:40px}
  .mobile-topbar{display:none;align-items:center;gap:12px;padding:13px 16px;background:rgba(4,1,12,.96);backdrop-filter:blur(18px);border-bottom:1px solid rgba(123,47,190,.15);position:sticky;top:0;z-index:90;flex-shrink:0}
  .hamburger{background:transparent;border:none;cursor:pointer;padding:5px;display:flex;flex-direction:column;gap:5px;flex-shrink:0}
  .hamburger span{display:block;width:22px;height:2px;background:#C9A84C;border-radius:2px}
  .mobile-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99;backdrop-filter:blur(4px)}

  .stat-card{background:rgba(10,4,22,.82);border:1px solid rgba(123,47,190,.15);border-radius:18px;padding:20px 16px;cursor:pointer;transition:all .22s;position:relative;overflow:hidden}
  .stat-card:hover{transform:translateY(-4px);border-color:rgba(201,168,76,.28);box-shadow:0 14px 44px rgba(0,0,0,.55),0 0 32px rgba(123,47,190,.1)}
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}

  .auth-input{background:rgba(255,255,255,.05);border:1.5px solid rgba(123,47,190,.25);border-radius:14px;padding:14px 18px;font-size:15px;color:#F0E8FF;width:100%;outline:none;transition:all .18s;caret-color:#C9A84C}
  .auth-input:focus{border-color:#C9A84C;background:rgba(201,168,76,.05);box-shadow:0 0 0 3px rgba(201,168,76,.09)}
  .auth-input::placeholder{color:rgba(240,232,255,.22)}

  .diary-notebook{background:linear-gradient(160deg,rgba(18,8,35,.95) 0%,rgba(10,3,22,.98) 100%);border:1px solid rgba(123,47,190,.2);border-radius:4px 16px 16px 4px;box-shadow:inset -4px 0 12px rgba(0,0,0,.3),-2px 0 0 rgba(123,47,190,.3);position:relative;overflow:hidden;animation:inkDrop .4s ease}
  .diary-notebook::before{content:'';position:absolute;left:64px;top:0;bottom:0;width:1px;background:rgba(201,168,76,.08)}
  .diary-lines{background-image:repeating-linear-gradient(transparent,transparent 35px,rgba(123,47,190,.05) 35px,rgba(123,47,190,.05) 36px);background-size:100% 36px;background-position:0 44px}
  .diary-textarea{background:transparent;border:none;outline:none;width:100%;min-height:300px;padding:16px 22px 16px 16px;color:rgba(240,232,255,.88);line-height:36px;resize:none;caret-color:#C9A84C}
  .diary-entry-card{background:rgba(10,4,22,.8);border:1px solid rgba(123,47,190,.15);border-radius:14px;padding:20px 24px;transition:all .22s;cursor:pointer}
  .diary-entry-card:hover{border-color:rgba(201,168,76,.22);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.48)}

  .share-card{background:linear-gradient(135deg,rgba(10,4,22,.92),rgba(15,6,32,.96));border:1px solid rgba(201,168,76,.2);border-radius:20px;padding:26px;position:relative;overflow:hidden}

  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}

  @media(max-width:768px){
    .sidebar{position:fixed;top:0;left:0;bottom:0;transform:translateX(-100%)}
    .sidebar.open{transform:translateX(0)}
    .main-content{margin-left:0}
    .mobile-topbar{display:flex}
    .page-inner{padding:18px 14px 32px}
    .two-col{grid-template-columns:1fr !important}
    .three-col{grid-template-columns:1fr !important}
    .stats-grid{grid-template-columns:repeat(2,1fr) !important}
  }
`;

// ─── Splash ───────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{ minHeight:'100vh', background:'#030008', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ textAlign:'center' }}>
        <div style={{ marginBottom:16, animation:'floatUp 2s ease-in-out infinite' }}><LogoImg size={76}/></div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, color:'#fff', letterSpacing:2, marginBottom:4 }}>
          <span style={{ fontWeight:900 }}>ADVY</span> <span style={{ fontWeight:300 }}>Health</span>
        </div>
        <div style={{ fontSize:10, color:'#C9A84C', letterSpacing:3, textTransform:'uppercase', marginBottom:22 }}>The Gold Standard in Health Advocacy</div>
        <div style={{ width:60, height:2, background:'linear-gradient(90deg,#7B2FBE,#C9A84C)', margin:'0 auto', borderRadius:2 }}/>
      </div>
    </div>
  );
}

// ─── Auth screen ──────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode]           = useState('signin');
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [pass, setPass]           = useState('');
  const [confirm, setConfirm]     = useState('');
  const [accountType, setAccountType] = useState('self');
  const [careeName, setCareeName] = useState('');
  const [error, setError]         = useState('');
  const [msg, setMsg]             = useState('');
  const [loading, setLoading]     = useState(false);
  const clear = () => { setError(''); setMsg(''); };

  const handleSignin = async () => {
    if (!email||!pass) { setError('Please enter your email and password.'); return; }
    setLoading(true); clear();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // 🔔 Discord ping — fire-and-forget
      fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'user_login', email }),
      }).catch(()=>{});
    } catch(e) {
      setError(e.code==='auth/invalid-credential' ? 'Invalid email or password.' : 'Sign in failed. Please try again.');
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!name.trim())  { setError('Please enter your name.'); return; }
    if (!email)        { setError('Please enter your email.'); return; }
    if (pass.length<8) { setError('Password must be at least 8 characters.'); return; }
    if (pass!==confirm){ setError('Passwords do not match.'); return; }
    setLoading(true); clear();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name.trim() });
      await setDoc(doc(db,'users',cred.user.uid), {
        ...BLANK_DATA,
        profile: { name:name.trim(), conditions:'', goal:'', accountType, careeName:careeName.trim() }
      });
      // 🔔 Discord ping — fire-and-forget
      fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'user_signup', email, name:name.trim() }),
      }).catch(()=>{});
    } catch(e) {
      setError(e.code==='auth/email-already-in-use' ? 'An account with this email already exists.' : 'Sign up failed.');
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true); clear();
    try { await sendPasswordResetEmail(auth,email); setMsg('Reset email sent — check your inbox!'); }
    catch { setError('Could not send reset email.'); }
    setLoading(false);
  };

  const hk = e => {
    if (e.key==='Enter') {
      if (mode==='signin') handleSignin();
      else if (mode==='signup') handleSignup();
      else handleReset();
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#030008', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative' }}>
      <style>{GLOBAL_CSS}</style>
      <AnimatedBackground/>
      <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ marginBottom:14, animation:'floatUp 3s ease-in-out infinite' }}><LogoImg size={74}/></div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, color:'#fff', letterSpacing:2, marginBottom:4 }}>
            <span style={{ fontWeight:900 }}>ADVY</span> <span style={{ fontWeight:300, color:'rgba(255,255,255,.85)' }}>Health</span>
          </div>
          <div style={{ fontSize:10, color:'#C9A84C', letterSpacing:3, textTransform:'uppercase', marginBottom:8 }}>The Gold Standard in Health Advocacy</div>
          <div style={{ fontSize:13, color:'rgba(192,132,252,.52)', fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>{getDailyMessage()}</div>
        </div>

        <div className="glass-card-static" style={{ padding:34, borderRadius:24 }}>
          <div style={{ display:'flex', gap:0, marginBottom:24, background:'rgba(255,255,255,.04)', borderRadius:12, padding:4 }}>
            {[{k:'signin',l:'Sign In'},{k:'signup',l:'Create Account'}].map(m=>(
              <button key={m.k} onClick={()=>{setMode(m.k);clear();}} style={{ flex:1, padding:'9px 0', borderRadius:9, border:'none', background:mode===m.k?'linear-gradient(135deg,#C9A84C,#E8C96B)':'transparent', color:mode===m.k?'#000':'rgba(240,232,255,.42)', fontWeight:mode===m.k?700:500, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{m.l}</button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
            {mode==='signup' && <>
              <div><label>Your Name</label><input className="auth-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah" onKeyDown={hk} autoFocus/></div>
              <div>
                <label>This account is for</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
                  {[{v:'self',l:'Myself',d:'I have a chronic illness'},{v:'caree',l:'Someone I care for',d:'I help manage their health'}].map(o=>(
                    <button key={o.v} onClick={()=>setAccountType(o.v)} style={{ padding:'10px 12px', borderRadius:12, border:`1.5px solid ${accountType===o.v?'#C9A84C':'rgba(123,47,190,.22)'}`, background:accountType===o.v?'rgba(201,168,76,.08)':'rgba(255,255,255,.03)', color:accountType===o.v?'#C9A84C':'rgba(240,232,255,.4)', cursor:'pointer', textAlign:'left', fontFamily:"'DM Sans',sans-serif" }}>
                      <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{o.l}</div>
                      <div style={{ fontSize:11, opacity:.7 }}>{o.d}</div>
                    </button>
                  ))}
                </div>
                {accountType==='caree' && <div style={{ marginTop:10 }}><label>Name of person you care for</label><input className="auth-input" value={careeName} onChange={e=>setCareeName(e.target.value)} placeholder="e.g. Mom, Dad, Jamie…"/></div>}
              </div>
            </>}
            <div><label>Email Address</label><input className="auth-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={hk} autoFocus={mode!=='signup'}/></div>
            {mode!=='reset' && <div><label>Password</label><input className="auth-input" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder={mode==='signup'?'At least 8 characters':'Your password'} onKeyDown={hk}/></div>}
            {mode==='signup' && <div><label>Confirm Password</label><input className="auth-input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter your password" onKeyDown={hk}/></div>}
          </div>

          {error && <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(255,80,80,.1)', border:'1px solid rgba(255,80,80,.2)', borderRadius:10, fontSize:13, color:'#ff8080' }}>⚠ {error}</div>}
          {msg   && <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(110,231,183,.1)', border:'1px solid rgba(110,231,183,.2)', borderRadius:10, fontSize:13, color:'#6ee7b7' }}>✓ {msg}</div>}

          <button className="btn btn-gold" onClick={mode==='signin'?handleSignin:mode==='signup'?handleSignup:handleReset} disabled={loading} style={{ width:'100%', marginTop:18, padding:'13px', fontSize:15, justifyContent:'center', opacity:loading?.7:1 }}>
            {loading
              ? <span style={{ display:'inline-block', width:17, height:17, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#000', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
              : mode==='signin' ? 'Sign In' : mode==='signup' ? 'Create My Account' : 'Send Reset Email'
            }
          </button>
          {mode==='signin' && <button onClick={()=>{setMode('reset');clear();}} style={{ width:'100%', marginTop:10, background:'none', border:'none', color:'rgba(240,232,255,.28)', fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", padding:4 }}>Forgot your password?</button>}
          {mode==='reset'  && <button onClick={()=>{setMode('signin');clear();}} style={{ width:'100%', marginTop:10, background:'none', border:'none', color:'rgba(240,232,255,.28)', fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", padding:4 }}>← Back to sign in</button>}
        </div>
        <div style={{ textAlign:'center', marginTop:14, fontSize:11, color:'rgba(240,232,255,.18)', lineHeight:1.6 }}>🔒 Your health data is encrypted and stored privately. Only you can access it.</div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ tab, setTab, user, data, saving, open, setOpen }) {
  const isCare      = data.profile?.accountType === 'caree';
  const displayName = isCare ? data.profile?.careeName||'Your Caree' : (user.displayName||'Your Account');
  return (
    <aside className={`sidebar${open?' open':''}`}>
      <div style={{ padding:'22px 16px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <LogoImg size={36}/>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:900, color:'#fff', letterSpacing:2 }}>ADVY</div>
            <div style={{ fontSize:8, fontWeight:500, color:'#C9A84C', letterSpacing:2 }}>HEALTH</div>
          </div>
          {saving && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:'pulseGlow 1s infinite' }}/>}
        </div>
        <div style={{ background:'linear-gradient(135deg,rgba(123,47,190,.1),rgba(201,168,76,.05))', border:'1px solid rgba(123,47,190,.18)', borderRadius:13, padding:'11px 13px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#7B2FBE,#C9A84C)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#000', flexShrink:0 }}>
              {(displayName||'?')[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:12, color:'#F0E8FF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div>
              {isCare && <div style={{ fontSize:9, color:'rgba(201,168,76,.6)', fontWeight:600, letterSpacing:1 }}>CARE MODE</div>}
              {!isCare && <div style={{ fontSize:10, color:'rgba(201,168,76,.45)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>}
            </div>
          </div>
          {data.profile?.conditions && <div style={{ marginTop:7, fontSize:10, color:'rgba(192,132,252,.55)', fontWeight:500 }}>{data.profile.conditions.split(',')[0].trim()}{data.profile.conditions.includes(',')?' + more':''}</div>}
        </div>
      </div>
      <nav style={{ flex:1, padding:'4px 8px', overflowY:'auto' }}>
        <div style={{ fontSize:9, fontWeight:700, color:'rgba(201,168,76,.32)', letterSpacing:2, padding:'6px 8px 8px', textTransform:'uppercase' }}>Navigation</div>
        {NAV.map(n => {
          const active = tab===n.id;
          return (
            <button key={n.id} onClick={()=>setTab(n.id)} className={`nav-item${active?' active':''}`} style={{ marginBottom:1 }}>
              {active && <div style={{ position:'absolute', left:0, top:'18%', bottom:'18%', width:3, background:'linear-gradient(180deg,#7B2FBE,#C9A84C)', borderRadius:'0 3px 3px 0' }}/>}
              <span style={{ fontSize:13, width:20, textAlign:'center', lineHeight:1 }}>{n.icon}</span>
              <span style={{ flex:1 }}>{n.label}</span>
              {active && <span style={{ width:4, height:4, borderRadius:'50%', background:'#C9A84C', boxShadow:'0 0 6px #C9A84C' }}/>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(123,47,190,.1)' }}>
        <div style={{ background:'rgba(123,47,190,.06)', borderRadius:11, padding:'10px 12px', marginBottom:9, border:'1px solid rgba(123,47,190,.1)' }}>
          <div style={{ fontSize:10, fontWeight:600, color:'rgba(201,168,76,.58)', marginBottom:3 }}>💜 Today</div>
          <div style={{ fontSize:10, color:'rgba(240,232,255,.32)', lineHeight:1.55, fontStyle:'italic' }}>{getDailyMessage()}</div>
        </div>
        <button onClick={()=>signOut(auth)} className="btn btn-subtle" style={{ width:'100%', justifyContent:'center', fontSize:11, padding:'8px' }}>Sign out</button>
      </div>
    </aside>
  );
}

// ─── Shared helpers ───────────────────────────────────────────
function PH({ emoji, title, sub, children }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
      <div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', letterSpacing:.5, marginBottom:3, lineHeight:1 }}>{emoji} {title}</div>
        {sub && <div style={{ fontSize:14, color:'rgba(240,232,255,.4)' }}>{sub}</div>}
      </div>
      {children && <div style={{ flexShrink:0 }}>{children}</div>}
    </div>
  );
}
function SH({ title, emoji, onAction, actionLabel }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
      <div style={{ fontWeight:600, fontSize:14, color:'#F0E8FF' }}>{emoji} {title}</div>
      {onAction && <button onClick={onAction} style={{ border:'none', background:'transparent', color:'rgba(201,168,76,.58)', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{actionLabel} →</button>}
    </div>
  );
}
function Nil({ icon, msg, cta, fn, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'28px 16px' }}>
      <div style={{ fontSize:30, marginBottom:8, opacity:.45 }}>{icon}</div>
      <div style={{ fontSize:13, color:'rgba(240,232,255,.3)', marginBottom:sub?3:cta?13:0 }}>{msg}</div>
      {sub && <div style={{ fontSize:12, color:'rgba(192,132,252,.38)', marginBottom:13 }}>{sub}</div>}
      {cta && fn && <button className="btn btn-gold" onClick={fn} style={{ fontSize:12, padding:'7px 17px' }}>{cta}</button>}
    </div>
  );
}
function SevDot({ v }) {
  const c = v<=3?'#6ee7b7':v<=6?'#fcd34d':'#f87171';
  return <span style={{ width:7, height:7, borderRadius:'50%', background:c, display:'inline-block', flexShrink:0, boxShadow:`0 0 4px ${c}` }}/>;
}
function NoteBlock({ title, text, color }) {
  return (
    <div style={{ marginBottom:13, padding:'13px 15px', background:'rgba(255,255,255,.03)', borderRadius:11, borderLeft:`3px solid ${color}44` }}>
      <div style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:1, marginBottom:5 }}>{title}</div>
      <div style={{ fontSize:13, color:'rgba(240,232,255,.58)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{text}</div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
function Dashboard({ data, setTab, upd, user }) {
  const today       = todayStr();
  const activeMeds  = data.medications.filter(m=>m.active);
  const totalTaken  = activeMeds.filter(m=>(m.takenDates||[]).includes(today)).length;
  const medPct      = activeMeds.length ? Math.round((totalTaken/activeMeds.length)*100) : 0;
  const upcoming    = data.appointments.filter(a=>a.date>=today&&!a.isInfusion).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  const todaySym    = data.symptoms.filter(s=>s.date===today);
  const isCare      = data.profile?.accountType==='caree';
  const displayName = isCare ? data.profile?.careeName||'Your loved one' : (user.displayName||'Welcome');

  const toggleTaken = id => {
    if (isCare) return;
    upd('medications', data.medications.map(m=>{
      if(m.id!==id) return m;
      const td=m.takenDates||[];
      return {...m,takenDates:td.includes(today)?td.filter(d=>d!==today):[...td,today]};
    }));
  };

  const proactive = getProactiveGreeting(data.profile?.name, data.appointments);

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'rgba(201,168,76,.5)', letterSpacing:2, textTransform:'uppercase', marginBottom:5 }}>{greet()}</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:600, color:'#C9A84C', marginBottom:3, lineHeight:1 }}>{displayName} 💜</div>
        <div style={{ color:'rgba(240,232,255,.32)', fontSize:14, marginBottom:14 }}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
        <div style={{ padding:'14px 18px', background:'linear-gradient(135deg,rgba(123,47,190,.1),rgba(201,168,76,.05))', border:'1px solid rgba(201,168,76,.18)', borderRadius:14, display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ fontSize:22, flexShrink:0, animation:'heartbeat 3s ease-in-out infinite' }}>💜</div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(201,168,76,.6)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Advy says</div>
            <div style={{ fontSize:13, color:'rgba(240,232,255,.72)', lineHeight:1.7, fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>{proactive}</div>
          </div>
        </div>
        {data.profile?.goal && <div style={{ marginTop:10, fontSize:12, color:'rgba(201,168,76,.65)', fontWeight:500, background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.14)', display:'inline-block', padding:'4px 13px', borderRadius:20 }}>✦ {data.profile.goal}</div>}
      </div>

      <div className="stats-grid">
        {[
          {label:'Symptoms',     val:data.symptoms.length,                                    icon:'◈',  color:'#C084FC',glow:'rgba(192,132,252,.18)',tab:'symptoms'},
          {label:'Medications',  val:activeMeds.length,                                       icon:'◉',  color:'#6ee7b7',glow:'rgba(110,231,183,.18)',tab:'medications'},
          {label:'Infusions',    val:(data.appointments||[]).filter(a=>a.isInfusion).length,  icon:'💉', color:'#f97316',glow:'rgba(249,115,22,.18)', tab:'infusion'},
          {label:'Diary Entries',val:(data.diary||[]).length,                                 icon:'✑',  color:'#C9A84C',glow:'rgba(201,168,76,.18)', tab:'diary'},
        ].map((s,i)=>(
          <div key={i} className="stat-card" onClick={()=>setTab(s.tab)}>
            <div style={{ position:'absolute', top:0, right:0, width:70, height:70, borderRadius:'50%', background:`radial-gradient(circle,${s.glow} 0%,transparent 70%)`, filter:'blur(9px)' }}/>
            <div style={{ fontFamily:'serif', fontSize:20, color:s.color, marginBottom:8, opacity:.8 }}>{s.icon}</div>
            <div style={{ fontSize:32, fontWeight:700, color:s.color, lineHeight:1, marginBottom:3, fontFamily:"'Cormorant Garamond',serif" }}>{s.val}</div>
            <div style={{ fontSize:11, color:'rgba(240,232,255,.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom:18 }}>
        <HydrationFridge data={data} upd={upd}/>
      </div>

      {activeMeds.length > 0 && (
        <div className="glass-card-static" style={{ padding:18, marginBottom:18 }}>
          <SH title="Today's Medications" emoji="◉" onAction={()=>setTab('medications')} actionLabel="All"/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:12, color:'rgba(240,232,255,.38)' }}>{totalTaken} of {activeMeds.length} taken</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#C9A84C', fontFamily:"'Cormorant Garamond',serif" }}>{medPct}%</div>
          </div>
          <div style={{ background:'rgba(255,255,255,.06)', borderRadius:5, height:5, overflow:'hidden', marginBottom:12 }}>
            <div style={{ height:'100%', width:`${medPct}%`, background:'linear-gradient(90deg,#7B2FBE,#C9A84C)', borderRadius:5, transition:'width .4s ease' }}/>
          </div>
          {activeMeds.slice(0,4).map(m=>{
            const taken=(m.takenDates||[]).includes(today);
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
                <button onClick={()=>toggleTaken(m.id)} style={{ width:24,height:24,borderRadius:'50%',border:`2px solid ${taken?'#6ee7b7':'rgba(123,47,190,.4)'}`,background:taken?'linear-gradient(135deg,#6ee7b7,#34d399)':'transparent',color:'#000',fontSize:12,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:isCare?'not-allowed':'pointer',fontWeight:900 }}>{taken?'✓':''}</button>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:taken?'rgba(240,232,255,.28)':'#F0E8FF', textDecoration:taken?'line-through':'none' }}>{m.name}</div>
                  <div style={{ fontSize:10, color:'rgba(240,232,255,.28)' }}>{m.dose} · {m.frequency}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="two-col">
        <div className="glass-card-static" style={{ padding:18 }}>
          <SH title="Today's Symptoms" emoji="◈" onAction={()=>setTab('symptoms')} actionLabel="Log"/>
          {todaySym.length===0
            ? <div style={{ fontSize:12, color:'rgba(240,232,255,.22)', fontStyle:'italic' }}>No entries today yet.</div>
            : todaySym.slice(0,1).map(s=>(
              <div key={s.id}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>{s.entries?.slice(0,3).map((e,i)=><span key={i} className="pill">{e.symptom}</span>)}</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[{l:'Pain',v:s.pain,c:'#f87171'},{l:'Energy',v:s.energy,c:'#6ee7b7'},{l:'Mood',v:s.mood,c:'#93c5fd'}].map(m=>(
                    <div key={m.l} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:15, fontWeight:700, color:m.c, fontFamily:"'Cormorant Garamond',serif" }}>{m.v}<span style={{ fontSize:8, color:'rgba(240,232,255,.2)' }}>/10</span></div>
                      <div style={{ fontSize:9, color:m.c, opacity:.75 }}>{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          }
        </div>
        <div className="glass-card-static" style={{ padding:18 }}>
          <SH title="Upcoming" emoji="◷" onAction={()=>setTab('appointments')} actionLabel="All"/>
          {upcoming.length===0
            ? <div style={{ fontSize:12, color:'rgba(240,232,255,.22)', fontStyle:'italic' }}>No upcoming appointments.</div>
            : upcoming.map(a=>(
              <div key={a.id} style={{ display:'flex', gap:9, alignItems:'center', marginBottom:8 }}>
                <div style={{ background:'rgba(123,47,190,.1)', borderRadius:8, padding:'3px 7px', textAlign:'center', minWidth:34, flexShrink:0, border:'1px solid rgba(123,47,190,.2)' }}>
                  <div style={{ fontSize:8, fontWeight:700, color:'#7B2FBE' }}>{new Date(a.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#C084FC', fontFamily:"'Cormorant Garamond',serif", lineHeight:1 }}>{new Date(a.date+'T12:00:00').getDate()}</div>
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'#F0E8FF' }}>{a.provider}</div>
                  <div style={{ fontSize:10, color:'rgba(240,232,255,.28)' }}>{a.type||'Appointment'}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── Symptoms ─────────────────────────────────────────────────
function Symptoms({ data, upd }) {
  const blank = { date:todayStr(), entries:[], pain:5, energy:5, mood:5, notes:'' };
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [sel, setSel]   = useState('');
  const [custom, setCustom] = useState('');
  const [filter, setFilter] = useState('all');

  const addSym = () => {
    const s = sel||custom.trim();
    if (!s) return;
    if (form.entries.find(e=>e.symptom===s)) return;
    setForm(f=>({...f,entries:[...f.entries,{symptom:s,severity:5}]}));
    setSel(''); setCustom('');
  };
  const rmSym = s => setForm(f=>({...f,entries:f.entries.filter(e=>e.symptom!==s)}));
  const setSev = (s,v) => setForm(f=>({...f,entries:f.entries.map(e=>e.symptom===s?{...e,severity:v}:e)}));
  const del = id => { if(window.confirm('Delete entry?')) upd('symptoms',data.symptoms.filter(s=>s.id!==id)); };
  const save = () => {
    if (!form.entries.length) { alert('Please add at least one symptom.'); return; }
    const entry = {...form, id:uid()};
    const existing = data.symptoms.find(s=>s.date===form.date);
    upd('symptoms', existing ? data.symptoms.map(s=>s.date===form.date?{...s,...entry,id:s.id}:s) : [entry,...data.symptoms]);
    setForm(blank); setOpen(false);
  };
  const all      = [...data.symptoms].sort((a,b)=>b.date.localeCompare(a.date));
  const filtered = filter==='today'?all.filter(s=>s.date===todayStr()):filter==='week'?all.filter(s=>{const d=(new Date()-new Date(s.date+'T12:00:00'))/(1000*60*60*24);return d<=7;}):all;

  return (
    <div>
      <PH emoji="◈" title="Symptoms" sub="Track how you feel — log any date, past or present">
        <button className="btn btn-gold" onClick={()=>{setForm(blank);setOpen(true)}}>+ Log entry</button>
      </PH>
      {open && (
        <div className="glass-card-static" style={{ padding:24, marginBottom:20 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:16 }}>New Symptom Entry</div>
          <div style={{ marginBottom:13 }}><label>Date</label><input className="field" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} max={todayStr()} style={{ maxWidth:180 }}/></div>
          <div style={{ marginBottom:13 }}>
            <label>Add symptoms</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <select className="field" value={sel} onChange={e=>setSel(e.target.value)} style={{ flex:1, minWidth:140 }}>
                <option value="">Select a symptom…</option>
                {SYMS.filter(s=>!form.entries.find(e=>e.symptom===s)).map(s=><option key={s}>{s}</option>)}
              </select>
              <input className="field" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Or type custom…" style={{ flex:1, minWidth:120 }} onKeyDown={e=>e.key==='Enter'&&addSym()}/>
              <button className="btn btn-ghost" onClick={addSym}>Add</button>
            </div>
          </div>
          {form.entries.length>0 && (
            <div style={{ marginBottom:14, display:'flex', flexDirection:'column', gap:8 }}>
              {form.entries.map(e=>(
                <div key={e.symptom} style={{ background:'rgba(255,255,255,.03)', borderRadius:11, padding:'11px 13px', border:'1px solid rgba(123,47,190,.14)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                    <span className="pill">{e.symptom}</span>
                    <button onClick={()=>rmSym(e.symptom)} style={{ border:'none', background:'transparent', color:'rgba(240,232,255,.3)', cursor:'pointer', fontSize:15 }}>×</button>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, color:'rgba(240,232,255,.38)', minWidth:56 }}>Severity</span>
                    <input type="range" min={1} max={10} value={e.severity} onChange={ev=>setSev(e.symptom,+ev.target.value)} style={{ flex:1 }}/>
                    <span style={{ fontWeight:700, color:'#C084FC', minWidth:20, textAlign:'right', fontSize:16, fontFamily:"'Cormorant Garamond',serif" }}>{e.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="three-col" style={{ marginBottom:14 }}>
            {[{k:'pain',l:'Pain',c:'#f87171'},{k:'energy',l:'Energy',c:'#6ee7b7'},{k:'mood',l:'Mood',c:'#93c5fd'}].map(s=>(
              <div key={s.k}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><label style={{ margin:0 }}>{s.l}</label><span style={{ fontWeight:700, color:s.c, fontSize:15, fontFamily:"'Cormorant Garamond',serif" }}>{form[s.k]}</span></div>
                <input type="range" min={1} max={10} value={form[s.k]} onChange={e=>setForm(f=>({...f,[s.k]:+e.target.value}))}/>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:14 }}><label>Notes</label><textarea className="field" rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Anything else to note…" style={{ resize:'vertical' }}/></div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save entry</button>
          </div>
        </div>
      )}
      {data.symptoms.length>0 && (
        <div style={{ display:'flex', gap:7, marginBottom:14, flexWrap:'wrap' }}>
          {[{v:'all',l:'All time'},{v:'today',l:'Today'},{v:'week',l:'Last 7 days'}].map(f=>(
            <button key={f.v} onClick={()=>setFilter(f.v)} style={{ padding:'5px 14px', borderRadius:20, fontSize:12, border:`1px solid ${filter===f.v?'#C9A84C':'rgba(123,47,190,.25)'}`, background:filter===f.v?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)', color:filter===f.v?'#C9A84C':'rgba(240,232,255,.42)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{f.l}</button>
          ))}
        </div>
      )}
      {filtered.length===0&&!open && <Nil icon="◈" msg="No symptom entries found." cta={data.symptoms.length===0?'Log your first entry':undefined} fn={()=>setOpen(true)}/>}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(s=>(
          <div key={s.id} className="glass-card" style={{ padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, flexWrap:'wrap', gap:7 }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:600, fontSize:14, color:'#C9A84C', marginBottom:5 }}>
                  {fmtDate(s.date)}{s.date===todayStr()&&<span style={{ fontSize:10, background:'rgba(201,168,76,.12)', color:'#C9A84C', padding:'2px 8px', borderRadius:20, marginLeft:8, fontFamily:"'DM Sans',sans-serif" }}>Today</span>}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>{s.entries?.map((e,i)=><span key={i} className="pill">{e.symptom} <SevDot v={e.severity}/></span>)}</div>
              </div>
              <button className="btn btn-danger" style={{ fontSize:10, padding:'3px 9px' }} onClick={()=>del(s.id)}>Delete</button>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[{l:'Pain',v:s.pain,c:'#f87171'},{l:'Energy',v:s.energy,c:'#6ee7b7'},{l:'Mood',v:s.mood,c:'#93c5fd'}].map(m=>(
                <div key={m.l} style={{ background:'rgba(255,255,255,.03)', borderRadius:9, padding:'6px 10px', textAlign:'center', border:'1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:700, color:m.c }}>{m.v}<span style={{ fontSize:9, color:'rgba(240,232,255,.18)' }}>/10</span></div>
                  <div style={{ fontSize:10, color:m.c, opacity:.75, fontWeight:600 }}>{m.l}</div>
                </div>
              ))}
            </div>
            {s.notes && <div style={{ marginTop:9, fontSize:12, color:'rgba(240,232,255,.42)', background:'rgba(255,255,255,.02)', borderRadius:8, padding:'7px 11px', lineHeight:1.5, borderLeft:'2px solid rgba(123,47,190,.3)' }}>{s.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Medications ──────────────────────────────────────────────
function Medications({ data, upd }) {
  const blank = { id:'', name:'', dose:'', frequency:'Daily', time:'', notes:'', active:true, takenDates:[] };
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const toggleTaken = id => upd('medications', data.medications.map(m=>{
    if(m.id!==id) return m;
    const t=todayStr(); const td=m.takenDates||[];
    return {...m,takenDates:td.includes(t)?td.filter(d=>d!==t):[...td,t]};
  }));
  const save = () => {
    if (!form.name.trim()) { alert('Please enter a medication name.'); return; }
    const entry = {...form,id:form.id||uid()};
    const idx = data.medications.findIndex(m=>m.id===entry.id);
    upd('medications', idx>=0?data.medications.map((m,i)=>i===idx?entry:m):[entry,...data.medications]);
    setForm(blank); setOpen(false);
  };
  const del  = id => { if(window.confirm('Remove?')) upd('medications',data.medications.filter(m=>m.id!==id)); };
  const edit = m => { setForm(m); setOpen(true); };
  const active   = data.medications.filter(m=>m.active);
  const inactive = data.medications.filter(m=>!m.active);
  return (
    <div>
      <PH emoji="◉" title="Medications" sub="Track your medications and mark them as taken">
        <button className="btn btn-gold" onClick={()=>{setForm(blank);setOpen(true)}}>+ Add</button>
      </PH>
      {open && (
        <div className="glass-card-static" style={{ padding:24, marginBottom:20 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:16 }}>{form.id?'Edit':'New'} Medication</div>
          <div className="two-col" style={{ marginBottom:12 }}>
            <div><label>Name</label><input className="field" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Lyrica"/></div>
            <div><label>Dose</label><input className="field" value={form.dose} onChange={e=>setForm(f=>({...f,dose:e.target.value}))} placeholder="e.g. 75mg"/></div>
            <div><label>Frequency</label><select className="field" value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>{['Daily','Twice daily','Three times daily','Weekly','As needed','Every other day','Monthly'].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label>Time</label><input className="field" type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></div>
          </div>
          <div style={{ marginBottom:12 }}><label>Notes</label><textarea className="field" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{ resize:'vertical' }}/></div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <input type="checkbox" id="mact" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))}/>
            <label htmlFor="mact" style={{ margin:0, textTransform:'none', fontSize:14, fontWeight:500, color:'rgba(240,232,255,.7)', letterSpacing:0 }}>Currently active</label>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save</button>
          </div>
        </div>
      )}
      {data.medications.length===0&&!open && <Nil icon="◉" msg="No medications yet." cta="Add your first" fn={()=>setOpen(true)}/>}
      {active.length>0 && <><div style={{ fontSize:9,fontWeight:700,color:'rgba(201,168,76,.4)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:9 }}>Active</div>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:20 }}>
          {active.map(m=>{const taken=(m.takenDates||[]).includes(todayStr());return(
            <div key={m.id} className="glass-card" style={{ padding:14,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',border:`1px solid ${taken?'rgba(110,231,183,.16)':'rgba(123,47,190,.15)'}` }}>
              <button onClick={()=>toggleTaken(m.id)} style={{ width:30,height:30,borderRadius:'50%',border:`2px solid ${taken?'#6ee7b7':'rgba(123,47,190,.35)'}`,background:taken?'linear-gradient(135deg,#6ee7b7,#34d399)':'transparent',color:'#000',fontSize:13,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontWeight:900 }}>{taken?'✓':''}</button>
              <div style={{ flex:1,minWidth:100 }}>
                <div style={{ fontWeight:600,fontSize:13,color:taken?'rgba(240,232,255,.28)':'#F0E8FF',textDecoration:taken?'line-through':'none' }}>{m.name}</div>
                <div style={{ fontSize:11,color:'rgba(240,232,255,.3)' }}>{m.dose} · {m.frequency}{m.time?` · ${m.time}`:''}</div>
              </div>
              {taken&&<span style={{ fontSize:10,background:'rgba(110,231,183,.1)',color:'#6ee7b7',padding:'2px 9px',borderRadius:20,fontWeight:600 }}>Taken ✓</span>}
              <div style={{ display:'flex',gap:6 }}>
                <button className="btn btn-ghost" style={{ fontSize:11,padding:'4px 10px' }} onClick={()=>edit(m)}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize:11,padding:'4px 10px' }} onClick={()=>del(m.id)}>Remove</button>
              </div>
            </div>
          );})}
        </div>
      </>}
      {inactive.length>0 && <><div style={{ fontSize:9,fontWeight:700,color:'rgba(123,47,190,.35)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8 }}>Inactive</div>
        <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
          {inactive.map(m=>(
            <div key={m.id} className="glass-card-static" style={{ padding:12,display:'flex',alignItems:'center',gap:10,opacity:.55 }}>
              <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:12,color:'#F0E8FF' }}>{m.name} — {m.dose}</div></div>
              <button className="btn btn-ghost" style={{ fontSize:11,padding:'3px 9px' }} onClick={()=>edit(m)}>Edit</button>
              <button className="btn btn-danger" style={{ fontSize:11,padding:'3px 9px' }} onClick={()=>del(m.id)}>Remove</button>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

// ─── Appointments ─────────────────────────────────────────────
function Appointments({ data, upd }) {
  const blank = { id:'', date:'', provider:'', type:'', isInfusion:false, preNotes:'', postNotes:'', followUp:'' };
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const save = () => {
    if (!form.date||!form.provider.trim()) { alert('Date and provider required.'); return; }
    const entry = {...form,id:form.id||uid()};
    const idx = data.appointments.findIndex(a=>a.id===entry.id);
    upd('appointments', (idx>=0?data.appointments.map((a,i)=>i===idx?entry:a):[entry,...data.appointments]).sort((a,b)=>b.date.localeCompare(a.date)));
    setForm(blank); setOpen(false);
  };
  const del  = id => { if(window.confirm('Delete?')){upd('appointments',data.appointments.filter(a=>a.id!==id));setView(null);} };
  const edit = a => { setForm(a); setOpen(true); setView(null); };
  const nonInfusion = data.appointments.filter(a=>!a.isInfusion);
  const upcoming = nonInfusion.filter(a=>a.date>=todayStr()).sort((a,b)=>a.date.localeCompare(b.date));
  const past     = nonInfusion.filter(a=>a.date<todayStr()).sort((a,b)=>b.date.localeCompare(a.date));
  if (view) {
    const a = data.appointments.find(ap=>ap.id===view);
    if (!a) { setView(null); return null; }
    return (
      <div className="slide-in">
        <button onClick={()=>setView(null)} style={{ border:'none',background:'transparent',color:'rgba(201,168,76,.6)',fontWeight:600,fontSize:13,cursor:'pointer',marginBottom:14,fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
        <div className="glass-card-static" style={{ padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:9 }}>
            <div><div style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:600,fontSize:22,color:'#C9A84C' }}>{a.provider}</div><div style={{ fontSize:12,color:'rgba(240,232,255,.32)',marginTop:2 }}>{fmtDate(a.date)} · {a.type||'Appointment'}</div></div>
            <div style={{ display:'flex',gap:7 }}><button className="btn btn-ghost" style={{ fontSize:11 }} onClick={()=>edit(a)}>Edit</button><button className="btn btn-danger" style={{ fontSize:11 }} onClick={()=>del(a.id)}>Delete</button></div>
          </div>
          {a.preNotes&&<NoteBlock title="Pre-Appointment Notes" text={a.preNotes} color="#93c5fd"/>}
          {a.postNotes&&<NoteBlock title="Appointment Notes" text={a.postNotes} color="#C9A84C"/>}
          {a.followUp&&<NoteBlock title="Follow-Up" text={a.followUp} color="#6ee7b7"/>}
          {!a.preNotes&&!a.postNotes&&!a.followUp&&<p style={{ color:'rgba(240,232,255,.3)',fontSize:13 }}>No notes yet. Click Edit to add notes.</p>}
        </div>
      </div>
    );
  }
  return (
    <div>
      <PH emoji="◷" title="Appointments" sub="Keep notes before and after every visit">
        <button className="btn btn-gold" onClick={()=>{setForm(blank);setOpen(true)}}>+ Add</button>
      </PH>
      {open && (
        <div className="glass-card-static" style={{ padding:24, marginBottom:20 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:16 }}>{form.id?'Edit':'New'} Appointment</div>
          <div className="two-col" style={{ marginBottom:12 }}>
            <div><label>Date</label><input className="field" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            <div><label>Provider</label><input className="field" value={form.provider} onChange={e=>setForm(f=>({...f,provider:e.target.value}))} placeholder="e.g. Dr. Smith"/></div>
            <div><label>Type</label><select className="field" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{['','Checkup','Specialist','Physical Therapy','Lab Work','Imaging','Telehealth','Emergency','Other'].map(x=><option key={x} value={x}>{x||'Select type…'}</option>)}</select></div>
            <div style={{ display:'flex',alignItems:'center',gap:8,paddingTop:22 }}>
              <input type="checkbox" id="isinf" checked={form.isInfusion} onChange={e=>setForm(f=>({...f,isInfusion:e.target.checked}))}/>
              <label htmlFor="isinf" style={{ margin:0,textTransform:'none',fontSize:13,letterSpacing:0 }}>💉 This is an infusion</label>
            </div>
          </div>
          <div style={{ marginBottom:12 }}><label>Pre-appointment notes</label><textarea className="field" rows={2} value={form.preNotes} onChange={e=>setForm(f=>({...f,preNotes:e.target.value}))} style={{ resize:'vertical' }}/></div>
          <div style={{ marginBottom:12 }}><label>Appointment notes</label><textarea className="field" rows={2} value={form.postNotes} onChange={e=>setForm(f=>({...f,postNotes:e.target.value}))} style={{ resize:'vertical' }}/></div>
          <div style={{ marginBottom:16 }}><label>Follow-up actions</label><textarea className="field" rows={2} value={form.followUp} onChange={e=>setForm(f=>({...f,followUp:e.target.value}))} style={{ resize:'vertical' }}/></div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save</button>
          </div>
        </div>
      )}
      {nonInfusion.length===0&&!open&&<Nil icon="◷" msg="No appointments yet." cta="Add first" fn={()=>setOpen(true)}/>}
      {upcoming.length>0&&<><div style={{ fontSize:9,fontWeight:700,color:'rgba(201,168,76,.4)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:9 }}>Upcoming</div>
        <div style={{ display:'flex',flexDirection:'column',gap:7,marginBottom:20 }}>
          {upcoming.map(a=>(
            <div key={a.id} className="glass-card" style={{ padding:13,display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap' }} onClick={()=>setView(a.id)}>
              <div style={{ background:'rgba(123,47,190,.1)',borderRadius:10,padding:'5px 8px',textAlign:'center',minWidth:40,flexShrink:0,border:'1px solid rgba(123,47,190,.2)' }}>
                <div style={{ fontSize:9,fontWeight:700,color:'#7B2FBE' }}>{new Date(a.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</div>
                <div style={{ fontSize:16,fontWeight:700,color:'#C084FC',fontFamily:"'Cormorant Garamond',serif",lineHeight:1 }}>{new Date(a.date+'T12:00:00').getDate()}</div>
              </div>
              <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:13,color:'#F0E8FF',marginBottom:1 }}>{a.provider}</div><div style={{ fontSize:11,color:'rgba(240,232,255,.32)' }}>{a.type||'Appointment'}</div></div>
              {(a.preNotes||a.postNotes)&&<span style={{ fontSize:10,background:'rgba(123,47,190,.12)',color:'#C084FC',padding:'2px 8px',borderRadius:20,fontWeight:600 }}>Has notes</span>}
              <span style={{ fontSize:16,color:'rgba(240,232,255,.2)' }}>›</span>
            </div>
          ))}
        </div>
      </>}
      {past.length>0&&<><div style={{ fontSize:9,fontWeight:700,color:'rgba(123,47,190,.4)',textTransform:'uppercase',letterSpacing:1.5,margin:'0 0 9px' }}>Past</div>
        <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
          {past.slice(0,10).map(a=>(
            <div key={a.id} className="glass-card" style={{ padding:13,display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap',opacity:.7 }} onClick={()=>setView(a.id)}>
              <div style={{ background:'rgba(123,47,190,.08)',borderRadius:10,padding:'5px 8px',textAlign:'center',minWidth:40,flexShrink:0,border:'1px solid rgba(123,47,190,.15)' }}>
                <div style={{ fontSize:9,fontWeight:700,color:'#7B2FBE' }}>{new Date(a.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</div>
                <div style={{ fontSize:16,fontWeight:700,color:'#C084FC',fontFamily:"'Cormorant Garamond',serif",lineHeight:1 }}>{new Date(a.date+'T12:00:00').getDate()}</div>
              </div>
              <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:13,color:'#F0E8FF' }}>{a.provider}</div><div style={{ fontSize:11,color:'rgba(240,232,255,.32)' }}>{a.type||'Appointment'}</div></div>
              <span style={{ fontSize:16,color:'rgba(240,232,255,.2)' }}>›</span>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

// ─── Diary ────────────────────────────────────────────────────
function Diary({ data, upd }) {
  const diary = data.diary||[];
  const [open,setOpen]=useState(false);
  const [view,setView]=useState(null);
  const [font,setFont]=useState(DIARY_FONTS[0].value);
  const [fontSize,setFontSz]=useState(DIARY_FONTS[0].size);
  const [mood,setMood]=useState('');
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [date,setDate]=useState(todayStr());
  const [editId,setEditId]=useState(null);
  const openNew  = () => { setEditId(null);setTitle('');setBody('');setDate(todayStr());setMood('');const f=DIARY_FONTS[0];setFont(f.value);setFontSz(f.size);setOpen(true);setView(null); };
  const openEdit = e => { setEditId(e.id);setTitle(e.title||'');setBody(e.body||'');setDate(e.date||todayStr());setMood(e.mood||'');setFont(e.font||DIARY_FONTS[0].value);setFontSz(e.fontSize||DIARY_FONTS[0].size);setOpen(true);setView(null); };
  const save = () => {
    if(!body.trim()){alert('Please write something.');return;}
    const entry={id:editId||uid(),date,title:title.trim()||fmtDate(date),body,mood,font,fontSize};
    upd('diary',editId?diary.map(d=>d.id===editId?entry:d):[entry,...diary]);
    setOpen(false);setEditId(null);
  };
  const del    = id => { if(window.confirm('Delete entry?')){upd('diary',diary.filter(d=>d.id!==id));setView(null);} };
  const chFont = v => { const f=DIARY_FONTS.find(x=>x.value===v); setFont(v); setFontSz(f?.size||17); };

  if(view){
    const e=diary.find(d=>d.id===view);
    if(!e){setView(null);return null;}
    return(
      <div className="slide-in">
        <button onClick={()=>setView(null)} style={{ border:'none',background:'transparent',color:'rgba(201,168,76,.6)',fontWeight:600,fontSize:13,cursor:'pointer',marginBottom:14,fontFamily:"'DM Sans',sans-serif" }}>← Back to diary</button>
        <div className="diary-notebook diary-lines">
          <div style={{ padding:'24px 28px 18px', borderBottom:'1px solid rgba(123,47,190,.1)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:9 }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:11,color:'rgba(201,168,76,.5)',letterSpacing:2,textTransform:'uppercase',marginBottom:4 }}>{fmtDate(e.date)}</div>
                <div style={{ fontFamily:e.font||DIARY_FONTS[0].value,fontSize:(e.fontSize||18)+4,color:'#C9A84C',lineHeight:1.2 }}>{e.title}</div>
                {e.mood&&<div style={{ marginTop:6,fontSize:13,color:'rgba(192,132,252,.7)' }}>{e.mood}</div>}
              </div>
              <div style={{ display:'flex',gap:7 }}>
                <button className="btn btn-ghost" style={{ fontSize:11 }} onClick={()=>openEdit(e)}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize:11 }} onClick={()=>del(e.id)}>Delete</button>
              </div>
            </div>
          </div>
          <div style={{ padding:'22px 28px 30px',paddingLeft:80 }}>
            <div style={{ fontFamily:e.font||DIARY_FONTS[0].value,fontSize:e.fontSize||18,color:'rgba(240,232,255,.85)',lineHeight:'36px',whiteSpace:'pre-wrap',minHeight:240 }}>{e.body}</div>
          </div>
        </div>
      </div>
    );
  }
  return(
    <div>
      <PH emoji="✑" title="My Diary" sub="Your private space — write freely, in your voice">
        <button className="btn btn-gold" onClick={openNew}>+ New entry</button>
      </PH>
      <div style={{ marginBottom:18,padding:'12px 18px',background:'rgba(123,47,190,.06)',border:'1px solid rgba(123,47,190,.11)',borderRadius:13,fontFamily:"'Cormorant Garamond',serif",fontSize:14,color:'rgba(192,132,252,.62)',fontStyle:'italic',lineHeight:1.7 }}>
        💜 The most healing act is to be truly witnessed. This diary sees you, exactly as you are.
      </div>
      {open&&(
        <div className="glass-card-static" style={{ padding:0,marginBottom:22,overflow:'hidden' }}>
          <div style={{ padding:'14px 18px',borderBottom:'1px solid rgba(123,47,190,.1)',display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap',background:'rgba(0,0,0,.15)' }}>
            <div><label style={{ marginBottom:4 }}>Handwriting</label>
              <select className="field" value={font} onChange={e=>chFont(e.target.value)} style={{ width:'auto',padding:'6px 11px',fontSize:12 }}>
                {DIARY_FONTS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div><label style={{ marginBottom:4 }}>Mood</label>
              <select className="field" value={mood} onChange={e=>setMood(e.target.value)} style={{ width:'auto',padding:'6px 11px',fontSize:12 }}>
                <option value="">Select…</option>
                {DIARY_MOODS.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div><label style={{ marginBottom:4 }}>Date</label>
              <input type="date" className="field" value={date} onChange={e=>setDate(e.target.value)} style={{ padding:'6px 11px',fontSize:12,width:'auto' }}/>
            </div>
          </div>
          <div style={{ padding:'14px 18px 0' }}>
            <input className="field" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Entry title (optional)…" style={{ fontFamily:font,fontSize:fontSize+2,background:'transparent',border:'none',borderBottom:'1px solid rgba(123,47,190,.1)',borderRadius:0,padding:'4px 0',color:'#C9A84C' }}/>
          </div>
          <div className="diary-lines" style={{ paddingLeft:68,paddingRight:18,paddingTop:6,paddingBottom:8 }}>
            <textarea value={body} onChange={e=>setBody(e.target.value)} className="diary-textarea" style={{ fontFamily:font,fontSize:fontSize }} placeholder="Write freely — this is your space. No judgment, no rules. Just you…" autoFocus/>
          </div>
          <div style={{ padding:'10px 18px 14px',display:'flex',gap:8,justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save to diary</button>
          </div>
        </div>
      )}
      {diary.length===0&&!open&&<Nil icon="✑" msg="Your diary is empty." sub="Write anything — how you feel, what you wish your doctor understood." cta="Write first entry" fn={openNew}/>}
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {[...diary].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>(
          <div key={e.id} className="diary-entry-card" onClick={()=>setView(e.id)}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6,flexWrap:'wrap',gap:7 }}>
              <div>
                <div style={{ fontSize:10,color:'rgba(201,168,76,.5)',fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',marginBottom:3 }}>{fmtDate(e.date)}</div>
                <div style={{ fontFamily:e.font||DIARY_FONTS[0].value,fontSize:(e.fontSize||18)+2,color:'#C9A84C',lineHeight:1.2 }}>{e.title}</div>
                {e.mood&&<div style={{ fontSize:12,color:'rgba(192,132,252,.6)',marginTop:4 }}>{e.mood}</div>}
              </div>
              <span style={{ fontSize:16,color:'rgba(240,232,255,.2)' }}>›</span>
            </div>
            <div style={{ fontFamily:e.font||DIARY_FONTS[0].value,fontSize:e.fontSize||16,color:'rgba(240,232,255,.35)',lineHeight:1.9,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>{e.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Diet ──────────────────────────────────────────────────
function AIDiet({ data, upd }) {
  const [goal,setGoal]=useState('');
  const [restrictions,setRestrictions]=useState('');
  const [result,setResult]=useState('');
  const [loading,setLoading]=useState(false);
  const [logOpen,setLogOpen]=useState(false);
  const [logDate,setLogDate]=useState(todayStr());
  const [meal,setMeal]=useState('Breakfast');
  const [food,setFood]=useState('');
  const [logNote,setLogNote]=useState('');
  const dietLogs=data.dietLogs||[];

  const generate = async () => {
    if(!goal){alert('Please select a goal.');return;}
    setLoading(true);setResult('');
    try {
      const res = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        messages:[{role:'user',content:`You are a compassionate functional nutrition advisor for someone with chronic illness.\n\nConditions: ${data.profile?.conditions||'chronic illness'}\nMedications: ${data.medications?.filter(m=>m.active).map(m=>m.name).join(', ')||'none'}\nGoal: ${goal}\nRestrictions: ${restrictions||'none'}\n\nProvide: 1) Why this goal matters for their conditions 2) 6–8 anti-inflammatory foods to focus on 3) 4–5 foods to minimize 4) A one-day meal plan 5) One simple recipe 6) A warm reminder that eating well with chronic illness is genuinely hard and they are doing enough. Use clear section headers.`}]
      })});
      const json=await res.json();
      if(!res.ok||json.error) throw new Error(json.error||`HTTP ${res.status}`);
      setResult(json.content?.map(b=>b.text||'').join('')||'');
    } catch(e){setResult(`Error: ${e.message}. Check that GEMINI_API_KEY is set in Vercel environment variables.`);}
    setLoading(false);
  };
  const addLog = () => {if(!food.trim())return;upd('dietLogs',[...dietLogs,{id:uid(),date:logDate,meal,food:food.trim(),note:logNote.trim()}]);setFood('');setLogNote('');};
  const delLog = id => upd('dietLogs',dietLogs.filter(l=>l.id!==id));
  const todayLogs=dietLogs.filter(l=>l.date===todayStr());
  const mealColors={Breakfast:'#93c5fd',Lunch:'#6ee7b7',Dinner:'#C084FC',Snack:'#C9A84C',Drink:'#f87171'};
  return(
    <div>
      <PH emoji="✿" title="AI Diet Advisor" sub="Personalized nutrition guidance + daily meal log"/>
      <div style={{ marginBottom:18,padding:'12px 18px',background:'rgba(123,47,190,.06)',border:'1px solid rgba(123,47,190,.11)',borderRadius:13,fontFamily:"'Cormorant Garamond',serif",fontSize:14,color:'rgba(192,132,252,.62)',fontStyle:'italic',lineHeight:1.7 }}>
        💜 Nourishing yourself with chronic illness is a genuine act of courage. Every small choice matters.
      </div>
      <div className="glass-card-static" style={{ padding:22,marginBottom:20 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:'#C9A84C' }}>📋 Daily Food Log</div>
          <button className="btn btn-ghost" style={{ fontSize:12,padding:'6px 13px' }} onClick={()=>setLogOpen(o=>!o)}>{logOpen?'Close':'+ Add entry'}</button>
        </div>
        {logOpen&&(
          <div className="two-col" style={{ marginBottom:14 }}>
            <div><label>Date</label><input type="date" className="field" value={logDate} onChange={e=>setLogDate(e.target.value)}/></div>
            <div><label>Meal</label><select className="field" value={meal} onChange={e=>setMeal(e.target.value)}>{['Breakfast','Lunch','Dinner','Snack','Drink'].map(x=><option key={x}>{x}</option>)}</select></div>
            <div style={{ gridColumn:'1/-1' }}><label>What did you eat/drink?</label><input className="field" value={food} onChange={e=>setFood(e.target.value)} placeholder="e.g. Oatmeal with berries and chia seeds" onKeyDown={e=>e.key==='Enter'&&addLog()}/></div>
            <div style={{ gridColumn:'1/-1' }}><label>Notes</label><input className="field" value={logNote} onChange={e=>setLogNote(e.target.value)} placeholder="e.g. Felt nauseous afterward…"/></div>
            <div style={{ gridColumn:'1/-1',display:'flex',justifyContent:'flex-end' }}><button className="btn btn-gold" onClick={addLog} style={{ fontSize:13,padding:'8px 20px' }}>Add</button></div>
          </div>
        )}
        {todayLogs.length>0&&(
          <div>
            <div style={{ fontSize:10,fontWeight:700,color:'rgba(201,168,76,.5)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:9 }}>Today</div>
            {todayLogs.map(l=>(
              <div key={l.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,.03)',borderRadius:10,border:'1px solid rgba(123,47,190,.1)',marginBottom:6 }}>
                <span style={{ fontSize:10,fontWeight:700,color:mealColors[l.meal]||'#C9A84C',minWidth:58,textTransform:'uppercase',letterSpacing:.8 }}>{l.meal}</span>
                <div style={{ flex:1 }}><div style={{ fontSize:13,color:'#F0E8FF' }}>{l.food}</div>{l.note&&<div style={{ fontSize:11,color:'rgba(240,232,255,.35)',marginTop:1 }}>{l.note}</div>}</div>
                <button onClick={()=>delLog(l.id)} style={{ border:'none',background:'transparent',color:'rgba(240,232,255,.25)',cursor:'pointer',fontSize:14 }}>×</button>
              </div>
            ))}
          </div>
        )}
        {dietLogs.length===0&&!logOpen&&<div style={{ fontSize:12,color:'rgba(240,232,255,.25)',fontStyle:'italic',textAlign:'center',padding:'12px 0' }}>No food logged yet</div>}
      </div>
      <div className="glass-card-static" style={{ padding:22,marginBottom:20 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:'#C9A84C',marginBottom:16 }}>✿ Generate a Personalized Diet Plan</div>
        <div className="two-col" style={{ marginBottom:14 }}>
          <div><label>Conditions (from profile)</label><input className="field" value={data.profile?.conditions||''} readOnly style={{ opacity:.55 }} placeholder="Add conditions in your profile…"/></div>
          <div><label>Restrictions / preferences</label><input className="field" value={restrictions} onChange={e=>setRestrictions(e.target.value)} placeholder="e.g. gluten-free, vegetarian…"/></div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label>Primary goal</label>
          <div style={{ display:'flex',flexWrap:'wrap',gap:7,marginTop:6 }}>
            {DIET_GOALS.map(g=>(
              <button key={g} onClick={()=>setGoal(g)} style={{ padding:'6px 13px',borderRadius:20,fontSize:12,border:`1px solid ${goal===g?'#C9A84C':'rgba(123,47,190,.25)'}`,background:goal===g?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)',color:goal===g?'#C9A84C':'rgba(240,232,255,.42)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>{g}</button>
            ))}
          </div>
        </div>
        <button className="btn btn-gold" onClick={generate} disabled={loading} style={{ width:'100%',justifyContent:'center',padding:'12px',fontSize:14,opacity:loading?.7:1 }}>
          {loading?<><span style={{ display:'inline-block',width:15,height:15,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#000',borderRadius:'50%',animation:'spin .7s linear infinite' }}/> Crafting your plan…</>:'✿ Generate My Diet Plan'}
        </button>
      </div>
      {result&&(
        <div className="glass-card-static" style={{ padding:24 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:'#C9A84C',marginBottom:14 }}>✿ Your Personalized Plan</div>
          <div style={{ fontSize:14,color:'rgba(240,232,255,.75)',lineHeight:1.9,whiteSpace:'pre-wrap' }}>{result}</div>
        </div>
      )}
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────
function Documents({ data, upd }) {
  const [dtype,setDtype]=useState('');
  const [note,setNote]=useState('');
  const [drag,setDrag]=useState(false);
  const fileRef=useRef();
  const ACCEPTED='.pdf,.png,.jpg,.jpeg,.heic,.heif';
  const process=file=>{
    if(!file) return;
    const r=new FileReader();
    r.onload=e=>{
      const document={id:uid(),name:file.name,type:dtype,notes:note,data:e.target.result,uploadDate:todayStr(),size:Math.round(file.size/1024)+'KB'};
      upd('documents',[document,...data.documents]);
    };
    r.onerror=()=>alert(`Could not read ${file.name}.`);
    r.readAsDataURL(file);
  };
  const del=id=>{if(window.confirm('Remove?'))upd('documents',data.documents.filter(d=>d.id!==id));};
  return(
    <div>
      <PH emoji="◫" title="Documents" sub="Store your lab results, prescriptions, and medical records (PDF, PNG, JPG, HEIC)"/>
      <div className="glass-card-static" style={{ padding:22,marginBottom:20 }}>
        <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);[...e.dataTransfer.files].forEach(process);}} style={{ border:`2px dashed ${drag?'#C9A84C':'rgba(123,47,190,.25)'}`,borderRadius:14,padding:'24px 16px',textAlign:'center',marginBottom:16,transition:'all .2s',background:drag?'rgba(201,168,76,.04)':'transparent',cursor:'pointer' }} onClick={()=>fileRef.current?.click()}>
          <div style={{ fontSize:26,marginBottom:7,opacity:.45 }}>📎</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:'#C9A84C',marginBottom:2 }}>Drag & drop files here</div>
          <div style={{ fontSize:12,color:'rgba(240,232,255,.28)',marginBottom:12 }}>PDF, PNG, JPG, HEIC supported</div>
          <button className="btn btn-gold" onClick={e=>{e.stopPropagation();fileRef.current?.click();}} style={{ fontSize:12 }}>Browse files</button>
          <input ref={fileRef} type="file" multiple accept={ACCEPTED} style={{ display:'none' }} onChange={e=>[...e.target.files].forEach(process)}/>
        </div>
        <div className="two-col">
          <div><label>Document type</label><select className="field" value={dtype} onChange={e=>setDtype(e.target.value)}>{['','Lab Results','Imaging / X-Ray','Prescription','Doctor Notes','Insurance','Referral','Other'].map(x=><option key={x} value={x}>{x||'Select type…'}</option>)}</select></div>
          <div><label>Notes</label><input className="field" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Blood work from March 2025"/></div>
        </div>
      </div>
      {data.documents.length===0&&<Nil icon="◫" msg="No documents uploaded yet." sub="All files stored securely in your account."/>}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {data.documents.map(d=>(
          <div key={d.id} className="glass-card" style={{ padding:14,display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap' }}>
            <div style={{ fontSize:22,flexShrink:0,opacity:.65 }}>{/\.pdf$/i.test(d.name)?'📄':/\.(jpg|jpeg|png|heic|heif)$/i.test(d.name)?'🖼️':'📎'}</div>
            <div style={{ flex:1,minWidth:110 }}>
              <div style={{ fontWeight:600,fontSize:12,color:'#F0E8FF' }}>{d.name}</div>
              <div style={{ fontSize:10,color:'rgba(240,232,255,.28)',marginTop:1 }}>{d.type||'Document'} · {fmtDate(d.uploadDate)}{d.size?' · '+d.size:''}</div>
              {d.notes&&<div style={{ fontSize:11,color:'rgba(240,232,255,.38)',marginTop:2 }}>{d.notes}</div>}
            </div>
            <button className="btn btn-danger" style={{ fontSize:10,padding:'4px 9px',flexShrink:0 }} onClick={()=>del(d.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Advocate ──────────────────────────────────────────────
const SYS_ADVOCATE = d => `You are Advy — a warm, deeply empathetic chronic illness health advocate for ${d.profile?.name||'this person'}.

Your values: You see them fully. You never minimize their symptoms. You are fiercely on their side, always.

Conditions: ${d.profile?.conditions||'not specified'}
Goal: ${d.profile?.goal||'not specified'}

Recent symptoms:
${d.symptoms?.slice(0,8).map(s=>`- ${s.date}: ${s.entries?.map(e=>`${e.symptom}(${e.severity}/10)`).join(', ')||'—'} | Pain:${s.pain} Energy:${s.energy} Mood:${s.mood}`).join('\n')||'None logged'}

Active medications: ${d.medications?.filter(m=>m.active).map(m=>`${m.name} ${m.dose}`).join(', ')||'None'}
Body pain: ${(d.bodyMap||[]).map(b=>`${b.label} ${b.severity}/10`).join(', ')||'None'}
Infusions: ${(d.appointments||[]).filter(a=>a.isInfusion).map(a=>`${a.provider} on ${a.date}`).join(', ')||'None'}
Metabolic: ${(d.metabolicLogs||[]).slice(0,3).map(l=>`BS:${l.bloodSugar||'—'} BP:${l.bp_systolic||'—'}/${l.bp_diastolic||'—'}`).join('; ')||'None logged'}

Be warm, specific to their data, validating. Use their name naturally. End with something empowering when appropriate.`;

const STARTERS = [
  'Help me prepare for my next appointment',
  'What patterns do you see in my symptoms?',
  'How do I advocate for myself when my doctor dismisses me?',
  'Help me write a symptom summary letter for my doctor',
  'My blood sugar has been unpredictable — what should I tell my doctor?',
  'I have an infusion coming up. Can we go over how to prepare?',
  'I am feeling exhausted and dismissed. What can I do?',
  'What questions should I ask my specialist?',
];

function Advocate({ data, user }) {
  const [msgs,setMsgs]           = useState([]);
  const [input,setInput]         = useState('');
  const [loading,setLoading]     = useState(false);
  const [error,setError]         = useState('');
  const [limitHit,setLimitHit]   = useState(false);
  const [dailyCount,setDailyCount] = useState(0);
  const bottomRef                = useRef();
  const { share, shareStatus }   = useShare();

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs]);

  const send = async txt => {
    const text=(txt||input).trim();
    if(!text||loading||limitHit) return;
    setInput(''); setError('');
    const newMsgs=[...msgs,{role:'user',content:text}];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const res=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          system: SYS_ADVOCATE(data),
          messages: newMsgs,
          userId: user?.uid,
        })
      });
      let json;
      try { json=await res.json(); }
      catch { throw new Error('Unexpected server response. Check GEMINI_API_KEY in Vercel.'); }

      if(res.status===429||json.limitReached){
        setLimitHit(true);
        setMsgs(m=>[...m,{role:'assistant',content:json.error||"You've used your daily AI messages. Your limit resets at midnight. 💜"}]);
        setLoading(false); return;
      }
      if(!res.ok||json.error) throw new Error(json.error||`HTTP ${res.status}`);

      const countH=res.headers.get('X-Daily-Count');
      if(countH) setDailyCount(parseInt(countH));

      const reply=json.content?.map(b=>b.text||'').join('')||'';
      setMsgs(m=>[...m,{role:'assistant',content:reply}]);
    } catch(e){
      const msg=e.message.includes('API_KEY')||e.message.includes('GEMINI')
        ? 'AI not configured — add GEMINI_API_KEY in Vercel environment variables.'
        : `Connection error: ${e.message}`;
      setError(msg);
      setMsgs(m=>[...m,{role:'assistant',content:"I'm so sorry — I couldn't connect right now. 💜 "+msg}]);
    }
    setLoading(false);
  };

  const handleShare=async()=>{
    await share({title:`${data.profile?.name||'Patient'} — Advy Health Summary`,text:buildDoctorSummary(data,msgs)});
  };

  return(
    <div style={{ display:'flex',flexDirection:'column',height:'calc(100vh - 100px)',gap:12 }}>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:600,color:'#C9A84C',marginBottom:3 }}>✦ AI Advocate</div>
          <div style={{ fontSize:13,color:'rgba(240,232,255,.38)' }}>Your personal health advocate — powered by Gemini 2.5 Flash</div>
        </div>
        {msgs.length>0&&(
          <button onClick={handleShare} style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 16px',borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',border:`1.5px solid ${shareStatus==='copied'?'rgba(110,231,183,.4)':'rgba(201,168,76,.35)'}`,background:shareStatus==='copied'?'rgba(110,231,183,.1)':'rgba(201,168,76,.08)',color:shareStatus==='copied'?'#6ee7b7':'#C9A84C',fontFamily:"'DM Sans',sans-serif",transition:'all .2s',flexShrink:0 }}>
            {getShareButtonLabel(shareStatus,'📋 Share with Doctor')}
          </button>
        )}
      </div>

      {limitHit && (
        <div style={{ padding:'10px 16px',background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.2)',borderRadius:11,fontSize:13,color:'rgba(201,168,76,.8)',lineHeight:1.6 }}>
          💜 You've used all {20} free AI messages for today. Your limit resets at midnight.<br/>
          Your full health log is still right here for you.
        </div>
      )}
      {!limitHit&&dailyCount>0&&(
        <div style={{ fontSize:11,color:'rgba(240,232,255,.18)',textAlign:'right' }}>{dailyCount}/20 messages used today</div>
      )}
      {error&&<div style={{ padding:'10px 16px',background:'rgba(255,80,80,.1)',border:'1px solid rgba(255,80,80,.25)',borderRadius:11,fontSize:12,color:'#ff8080',lineHeight:1.6 }}>⚠ {error}</div>}

      <div style={{ flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:13,padding:'4px 2px' }}>
        {msgs.length===0&&(
          <div style={{ textAlign:'center',padding:'18px 14px' }}>
            <div style={{ marginBottom:18 }}>
              <div style={{ marginBottom:12,display:'inline-block',animation:'floatUp 3s ease-in-out infinite' }}><LogoImg size={52}/></div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:24,color:'#C9A84C',marginBottom:5 }}>Hi{data.profile?.name?`, ${data.profile.name}`:''}! ✦</div>
              <p style={{ fontSize:13,color:'rgba(240,232,255,.38)',lineHeight:1.75,maxWidth:400,margin:'0 auto 7px' }}>{getProactiveGreeting(data.profile?.name, data.appointments)}</p>
            </div>
            <div className="two-col" style={{ gap:7 }}>
              {STARTERS.map(s=>(
                <button key={s} onClick={()=>send(s)} style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(123,47,190,.14)',borderRadius:11,padding:'10px 12px',textAlign:'left',fontSize:12,fontWeight:500,color:'rgba(240,232,255,.38)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",lineHeight:1.4,transition:'all .16s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(123,47,190,.08)';e.currentTarget.style.color='rgba(240,232,255,.72)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.color='rgba(240,232,255,.38)';}}>
                  ✦ {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{ display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',alignItems:'flex-end',gap:7 }}>
            {m.role==='assistant'&&<div style={{ width:26,height:26,borderRadius:'50%',flexShrink:0,overflow:'hidden',boxShadow:'0 0 9px rgba(123,47,190,.4)',marginBottom:1 }}><LogoImg size={26}/></div>}
            <div style={{ maxWidth:'72%',padding:'10px 13px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.role==='user'?'linear-gradient(135deg,rgba(123,47,190,.22),rgba(201,168,76,.1))':'rgba(255,255,255,.04)',color:m.role==='user'?'#F0E8FF':'rgba(240,232,255,.75)',fontSize:13,lineHeight:1.75,border:m.role==='assistant'?'1px solid rgba(123,47,190,.1)':'1px solid rgba(201,168,76,.17)',backdropFilter:'blur(8px)',whiteSpace:'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading&&<div style={{ display:'flex',alignItems:'center',gap:7 }}><div style={{ width:26,height:26,borderRadius:'50%',overflow:'hidden' }}><LogoImg size={26}/></div><div style={{ padding:'10px 14px',borderRadius:'16px 16px 16px 4px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(123,47,190,.1)',display:'flex',gap:5,alignItems:'center' }}>{[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:'50%',background:'#7B2FBE',animation:`bounce .9s ease-in-out ${i*.15}s infinite`,opacity:.7 }}/>)}</div></div>}
        <div ref={bottomRef}/>
      </div>

      <div style={{ padding:'10px 0 3px',borderTop:'1px solid rgba(123,47,190,.1)',background:'rgba(0,0,0,.18)',backdropFilter:'blur(9px)' }}>
        <div style={{ display:'flex',gap:7,alignItems:'flex-end',background:'rgba(255,255,255,.04)',borderRadius:13,padding:'7px 7px 7px 13px',border:'1px solid rgba(123,47,190,.17)' }}>
          <textarea style={{ flex:1,border:'none',background:'transparent',color:'#F0E8FF',fontFamily:"'DM Sans',sans-serif",fontSize:13,lineHeight:1.5,resize:'none',outline:'none',minHeight:20,maxHeight:96,caretColor:'#C9A84C',padding:0 }} rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask Advy anything…" disabled={limitHit}/>
          <button className="btn btn-gold" onClick={()=>send()} disabled={loading||!input.trim()||limitHit} style={{ alignSelf:'flex-end',padding:'6px 13px',fontSize:12,opacity:loading||!input.trim()||limitHit?.35:1,flexShrink:0 }}>Send</button>
        </div>
        <div style={{ display:'flex',justifyContent:'space-between',marginTop:5,alignItems:'center',paddingLeft:4 }}>
          <div style={{ fontSize:10,color:'rgba(240,232,255,.13)' }}>Enter to send · Shift+Enter new line</div>
          {msgs.length>0&&<button onClick={handleShare} style={{ fontSize:11,color:'rgba(201,168,76,.5)',background:'transparent',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>📋 Share with Doctor</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Profile (fully unlocked — add/edit/remove conditions at any time) ───
const COMMON_CONDITIONS=[
  'Fibromyalgia','POTS / Dysautonomia','EDS','ME/CFS','Lupus (SLE)','Rheumatoid Arthritis',
  'Multiple Sclerosis','Sjögren\'s Syndrome','Crohn\'s Disease','Ulcerative Colitis','IBS',
  'Endometriosis','MCAS','Hashimoto\'s','Hypothyroidism','Type 1 Diabetes','Type 2 Diabetes',
  'PCOS','Ankylosing Spondylitis','Psoriatic Arthritis','Raynaud\'s','Chronic Migraine',
  'Anxiety','Depression','ADHD','PTSD','Interstitial Cystitis','Hidradenitis Suppurativa',
  'Chronic Pain Syndrome','Mast Cell Activation Syndrome','Small Fiber Neuropathy',
];

function Profile({ data, upd, user }) {
  const p = data.profile||{};
  const [name, setName]             = useState(p.name||'');
  const [careeName, setCareeName]   = useState(p.careeName||'');
  const [accountType, setAccountType] = useState(p.accountType||'self');
  const [goal, setGoal]             = useState(p.goal||'');
  // Always editable — conditions stored as array, displayed as tags
  const [conds, setConds] = useState(
    typeof p.conditions==='string'
      ? p.conditions.split(',').map(c=>c.trim()).filter(Boolean)
      : (Array.isArray(p.conditions) ? p.conditions : [])
  );
  const [custom, setCustom] = useState('');
  const [saved, setSaved]   = useState(false);

  const add = c => {
    const t = c.trim();
    if (!t || conds.includes(t)) return;
    setConds(prev=>[...prev, t]);
    setCustom('');
  };
  const rem = c => setConds(prev=>prev.filter(x=>x!==c));

  const save = () => {
    upd('profile', {
      ...p,
      name:        name.trim(),
      careeName:   careeName.trim(),
      accountType,
      goal:        goal.trim(),
      conditions:  conds.join(', '),
    });
    setSaved(true);
    setTimeout(()=>setSaved(false), 2500);
  };

  return(
    <div>
      <PH emoji="◈" title="My Health Profile" sub="Update your profile, conditions, and preferences at any time"/>
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

        {/* Account type */}
        <div className="glass-card-static" style={{ padding:22 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:'#C9A84C', marginBottom:14 }}>Account Type</div>
          <div className="two-col">
            {[{v:'self',l:'Myself',d:'I have a chronic illness'},{v:'caree',l:'Someone I care for',d:'I help manage their health'}].map(o=>(
              <button key={o.v} onClick={()=>setAccountType(o.v)} style={{ padding:'12px 14px', borderRadius:13, border:`1.5px solid ${accountType===o.v?'#C9A84C':'rgba(123,47,190,.2)'}`, background:accountType===o.v?'rgba(201,168,76,.08)':'rgba(255,255,255,.03)', color:accountType===o.v?'#C9A84C':'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'left', transition:'all .15s' }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{o.l}</div>
                <div style={{ fontSize:11, opacity:.7 }}>{o.d}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Personal info */}
        <div className="glass-card-static" style={{ padding:22 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:'#C9A84C', marginBottom:14 }}>Personal Info</div>
          <div className="two-col">
            <div><label>Your Name</label><input className="field" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah"/></div>
            {accountType==='caree' && <div><label>Name of person you care for</label><input className="field" value={careeName} onChange={e=>setCareeName(e.target.value)} placeholder="e.g. Mom, Dad, Jamie…"/></div>}
            <div style={{ gridColumn:accountType==='caree'?undefined:'1/-1' }}>
              <label>Wellness Goal</label>
              <input className="field" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. Be better understood by my doctors"/>
            </div>
          </div>
          <div style={{ marginTop:10, padding:'9px 13px', background:'rgba(123,47,190,.06)', borderRadius:10, fontSize:11, color:'rgba(240,232,255,.3)' }}>
            📧 Account email: <span style={{ color:'rgba(240,232,255,.55)' }}>{user?.email}</span>
            <span style={{ marginLeft:12, color:'rgba(240,232,255,.2)' }}>· Use "Forgot password" on sign-in to change your password</span>
          </div>
        </div>

        {/* Conditions — fully unlocked, always editable */}
        <div className="glass-card-static" style={{ padding:22 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:'#C9A84C', marginBottom:6 }}>Diagnoses & Conditions</div>
          <div style={{ fontSize:12, color:'rgba(240,232,255,.35)', marginBottom:14, lineHeight:1.6 }}>
            Add, edit, or remove your diagnoses at any time. Your AI Advocate uses these to personalize every response.
          </div>

          {/* Active condition tags */}
          {conds.length>0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
              {conds.map(c=>(
                <div key={c} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(123,47,190,.15)', border:'1px solid rgba(123,47,190,.3)', borderRadius:20, padding:'5px 12px' }}>
                  <span style={{ fontSize:12, color:'#C084FC', fontWeight:500 }}>{c}</span>
                  <button onClick={()=>rem(c)} style={{ border:'none', background:'transparent', color:'rgba(192,132,252,.5)', cursor:'pointer', fontSize:14, lineHeight:1, padding:'0 0 0 2px' }} title="Remove">×</button>
                </div>
              ))}
            </div>
          )}
          {conds.length===0 && (
            <div style={{ padding:'12px 14px', background:'rgba(123,47,190,.06)', borderRadius:10, fontSize:12, color:'rgba(240,232,255,.3)', marginBottom:14, fontStyle:'italic' }}>
              No conditions added yet. Use the options below to add yours.
            </div>
          )}

          {/* Common conditions quick-add */}
          <div style={{ marginBottom:14 }}>
            <label>Common conditions (click to add)</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:7, maxHeight:180, overflowY:'auto' }}>
              {COMMON_CONDITIONS.filter(c=>!conds.includes(c)).map(c=>(
                <button key={c} onClick={()=>add(c)} style={{ padding:'4px 11px', borderRadius:20, fontSize:11, border:'1px solid rgba(123,47,190,.22)', background:'rgba(255,255,255,.03)', color:'rgba(240,232,255,.45)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .14s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.color='#C9A84C';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(123,47,190,.22)';e.currentTarget.style.color='rgba(240,232,255,.45)';}}>
                  + {c}
                </button>
              ))}
            </div>
          </div>

          {/* Custom condition input */}
          <div>
            <label>Add custom condition or diagnosis</label>
            <div style={{ display:'flex', gap:8, marginTop:6 }}>
              <input className="field" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Type a diagnosis not listed above…" onKeyDown={e=>e.key==='Enter'&&add(custom)}/>
              <button className="btn btn-ghost" onClick={()=>add(custom)} style={{ flexShrink:0, fontSize:13 }}>Add</button>
            </div>
          </div>
        </div>

        {/* Save feedback */}
        {saved && (
          <div style={{ padding:'11px 16px', background:'rgba(110,231,183,.1)', border:'1px solid rgba(110,231,183,.22)', borderRadius:11, fontSize:13, color:'#6ee7b7' }}>
            ✓ Profile saved successfully!
          </div>
        )}

        <button className="btn btn-gold" onClick={save} style={{ justifyContent:'center', padding:'13px', fontSize:14, width:'100%' }}>
          Save Profile
        </button>
      </div>
    </div>
  );
}

// ─── Share & Privacy ──────────────────────────────────────────
function SharePrivacy({ data, upd, user }) {
  const [pin,setPin]=useState('');
  const [shareLink,setShareLink]=useState('');
  const [sharePin,setSharePin]=useState('');
  const [generating,setGenerating]=useState(false);
  const [copied,setCopied]=useState(false);

  const buildSnapshot=()=>({
    name:          data.profile?.name||'Anonymous',
    conditions:    data.profile?.conditions,
    generatedAt:   new Date().toISOString(),
    recentSymptoms:data.symptoms?.slice(0,10).map(s=>({date:s.date,symptoms:s.entries?.map(e=>`${e.symptom}(${e.severity}/10)`).join(', '),pain:s.pain,energy:s.energy,mood:s.mood,notes:s.notes})),
    medications:   data.medications?.filter(m=>m.active).map(m=>({name:m.name,dose:m.dose,frequency:m.frequency})),
    bodyMap:       (data.bodyMap||[]).map(b=>({area:b.label,severity:b.severity,types:b.types})),
    appointments:  data.appointments?.slice(0,5).map(a=>({date:a.date,provider:a.provider,type:a.type})),
  });

  const generateLink=async()=>{
    if(!pin||pin.length<4){alert('Please enter a PIN of at least 4 characters.');return;}
    setGenerating(true);
    try{
      const encoded   = btoa(encodeURIComponent(JSON.stringify(buildSnapshot())));
      const pinEncoded= btoa(pin);
      const shareId   = uid()+uid();
      await setDoc(doc(db,'shares',shareId),{
        data:encoded, pin:pinEncoded,
        createdAt:  new Date().toISOString(),
        createdBy:  user.uid,
        expiresAt:  new Date(Date.now()+7*24*60*60*1000).toISOString(),
      });
      setShareLink(`${window.location.origin}?share=${shareId}`);
      setSharePin(pin);
    }catch(e){alert('Could not generate share link: '+e.message);}
    setGenerating(false);
  };

  const copyLink=()=>{
    navigator.clipboard.writeText(shareLink).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  return(
    <div>
      <PH emoji="⟡" title="Share & Privacy" sub="Share your health summary securely — PIN-protected, expiring links"/>
      <div className="share-card" style={{ marginBottom:18 }}>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:13 }}>
            <span style={{ fontSize:26 }}>🔗</span>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:19,color:'#C9A84C' }}>Generate Secure Share Link</div>
              <div style={{ fontSize:11,color:'rgba(240,232,255,.32)' }}>Read-only · PIN-protected · Expires 7 days · Diary never included</div>
            </div>
          </div>
          <div style={{ background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.12)',borderRadius:10,padding:'9px 13px',marginBottom:14,fontSize:12,color:'rgba(201,168,76,.6)',lineHeight:1.6 }}>
            ⚠ Shares: symptoms, medications, body map, appointments. Diary entries and documents are <strong style={{ color:'#C9A84C' }}>never</strong> included.
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:11,alignItems:'flex-end',marginBottom:14 }}>
            <div><label>Create a PIN (share this separately)</label><input className="field" type="text" value={pin} onChange={e=>setPin(e.target.value)} placeholder="e.g. 7482 or a word" maxLength={20}/></div>
            <button className="btn btn-gold" onClick={generateLink} disabled={generating} style={{ whiteSpace:'nowrap',opacity:generating?.7:1 }}>
              {generating?<span style={{ display:'inline-block',width:15,height:15,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#000',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>:'🔗 Generate'}
            </button>
          </div>
          {shareLink&&(
            <div style={{ background:'rgba(110,231,183,.06)',border:'1px solid rgba(110,231,183,.14)',borderRadius:11,padding:'14px 16px',animation:'popIn .25s ease' }}>
              <div style={{ fontSize:12,color:'#6ee7b7',fontWeight:600,marginBottom:7 }}>✓ Share link generated!</div>
              <div style={{ display:'flex',gap:7,marginBottom:10 }}>
                <input readOnly value={shareLink} className="field" style={{ fontSize:11 }}/>
                <button className="btn btn-ghost" style={{ fontSize:12,flexShrink:0 }} onClick={copyLink}>{copied?'✓ Copied!':'Copy'}</button>
              </div>
              <div style={{ fontSize:12,color:'rgba(240,232,255,.38)',padding:'7px 11px',background:'rgba(255,255,255,.03)',borderRadius:8,borderLeft:'3px solid rgba(201,168,76,.3)' }}>
                PIN: <strong style={{ color:'#C9A84C',letterSpacing:2 }}>{sharePin}</strong> — share this <em>separately</em>
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {[
          {icon:'🔐',title:'Your account is yours alone',color:'#6ee7b7',text:'Your data lives in a private Firebase Firestore database. Security rules ensure only you — authenticated with your credentials — can access it.'},
          {icon:'✦', title:'The AI features',color:'#C9A84C',text:'When you use AI Advocate or AI Diet, a summary of your health data is sent to the Gemini API to generate a response. No conversations are logged by Advy Health.'},
          {icon:'📖',title:'Your diary is always private',color:'#C084FC',text:'Diary entries are never included in share links. They exist only in your personal account.'},
          {icon:'💉',title:'Infusion Hub',color:'#f97316',text:'Your infusion schedules, prep checklists, and check-in logs are private to your account and never shared.'},
          {icon:'⚠️',title:'Medical disclaimer',color:'rgba(240,232,255,.4)',text:'Advy Health is a personal health diary — NOT a medical service. In an emergency, call 911.'},
        ].map((s,i)=>(
          <div key={i} className="glass-card-static" style={{ padding:20,borderLeft:`3px solid ${s.color}33` }}>
            <div style={{ display:'flex',gap:13,alignItems:'flex-start' }}>
              <div style={{ fontSize:22,flexShrink:0 }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:600,fontSize:16,color:s.color,marginBottom:7 }}>{s.title}</div>
                <div style={{ fontSize:13,color:'rgba(240,232,255,.48)',lineHeight:1.7 }}>{s.text}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
