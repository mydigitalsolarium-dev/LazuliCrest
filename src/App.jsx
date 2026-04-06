import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

// Data and Utility Imports
import {
  uid, todayStr, fmtDate, greet, getDailyMessage,
  getProactiveGreeting, buildDoctorSummary,
  FRONT_MUSCLES, BACK_MUSCLES, getMuscleBaseColor, BODY_PAIN_TYPES, BODY_PART_GROUPS,
  BRAIN_LOBES, BRAIN_SYMPTOMS,
  BLANK_DATA, SYMS, NAV // Importing these from helpers to avoid "already defined" errors
} from './utils/helpers';

// Hook Imports
import { useShare, getShareButtonLabel } from './hooks/useShare';
import { usePersistedTab } from './hooks/useLocalStorage';

// Component Imports - Ensure these files exist in your src/components folder!
import BodyMap from './components/BodyMap';
import BrainSection from './components/BrainSection';
import InfusionHub from './components/InfusionHub';
import MetabolicLab from './components/MetabolicLab';
import HydrationTracker from './components/HydrationTracker';
import Dashboard from './components/Dashboard';
import Symptoms from './components/Symptoms';
import Medications from './components/Medications';
import Appointments from './components/Appointments';
import Diary from './components/Diary';
import AIDiet from './components/AIDiet';
import Documents from './components/Documents';
import Advocate from './components/Advocate';
import Profile from './components/Profile';
import SharePrivacy from './components/SharePrivacy';

// Constants that are unique to App.jsx
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
  const [tab, setTab]               = usePersistedTab('dashboard');
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

  if (!authReady) return <Splash />;
  if (!user)      return <AuthScreen />;

  const go = t => { setTab(t); setSideOpen(false); };

  return (
    <div style={{ minHeight:'100vh', background:'#030008', fontFamily:"'DM Sans',sans-serif", color:'#F0E8FF', position:'relative', overflow:'hidden' }}>
      <style>{GLOBAL_CSS}</style>
      <AnimatedBackground />

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

  @media(max-width:768px){
    .sidebar{position:fixed;top:0;left:0;bottom:0;transform:translateX(-100%)}
    .sidebar.open{transform:translateX(0)}
    .main-content{margin-left:0}
    .mobile-topbar{display:flex}
    .page-inner{padding:18px 14px 32px}
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
  const [mode, setMode]            = useState('signin');
  const [name, setName]            = useState('');
  const [email, setEmail]          = useState('');
  const [pass, setPass]            = useState('');
  const [confirm, setConfirm]      = useState('');
  const [accountType, setAccountType] = useState('self');
  const [careeName, setCareeName] = useState('');
  const [error, setError]          = useState('');
  const [msg, setMsg]              = useState('');
  const [loading, setLoading]      = useState(false);
  const clear = () => { setError(''); setMsg(''); };

  const handleSignin = async () => {
    if (!email||!pass) { setError('Please enter your email and password.'); return; }
    setLoading(true); clear();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
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
            </button>
          );
        })}
      </nav>
      <div style={{ padding:12, borderTop:'1px solid rgba(123,47,190,.12)' }}>
        <button onClick={()=>signOut(auth)} className="nav-item" style={{ color:'#ff8080' }}>
          <span style={{ fontSize:13, width:20, textAlign:'center' }}>⎋</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}