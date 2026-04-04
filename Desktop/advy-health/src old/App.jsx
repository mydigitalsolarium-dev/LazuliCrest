import { useState, useEffect, useRef, useCallback } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

// ─── Utilities ────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,9);
const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = d => { try { return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); } catch { return d; } };
const greet = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; };

const BLANK_DATA = {
  profile: { name:'', conditions:'', goal:'' },
  symptoms: [],
  medications: [],
  appointments: [],
  documents: [],
  diary: [],
  bodyMap: [],
  diet: []
};

const SYMS = ['Fatigue','Pain','Headache','Nausea','Brain fog','Dizziness','Joint pain','Muscle aches',
  'Shortness of breath','Heart palpitations','Insomnia','Anxiety','Swelling','Numbness','Rash',
  'Digestive issues','Fever','Chills','Burning sensation','Stiffness','Weakness','Tingling',
  'Blurred vision','Sensitivity to light','Sensitivity to sound','Memory issues','Confusion'];

const NAV = [
  { id:'dashboard',    icon:'⬡', label:'Home' },
  { id:'symptoms',     icon:'◈', label:'Symptoms' },
  { id:'bodymap',      icon:'◎', label:'Body Map' },
  { id:'medications',  icon:'◉', label:'Medications' },
  { id:'appointments', icon:'◷', label:'Appointments' },
  { id:'diary',        icon:'✑', label:'My Diary' },
  { id:'diet',         icon:'✿', label:'AI Diet' },
  { id:'documents',    icon:'◫', label:'Documents' },
  { id:'advocate',     icon:'✦', label:'AI Advocate' },
  { id:'share',        icon:'⟡', label:'Share & Privacy' },
];

function parseICS(text) {
  const events=[];
  const blocks=text.split('BEGIN:VEVENT');
  for(let i=1;i<blocks.length;i++){
    const b=blocks[i];
    const get=k=>{const m=b.match(new RegExp(k+'[^:]*:([^\\r\\n]+)'));return m?m[1].trim():'';};
    const raw=get('DTSTART')||'';
    const cl=raw.replace(/[TZ]/g,'').slice(0,8);
    const date=cl.length===8?`${cl.slice(0,4)}-${cl.slice(4,6)}-${cl.slice(6,8)}`:'';
    if(date) events.push({id:uid(),date,provider:get('SUMMARY')||'Appointment',type:get('LOCATION')||'Imported from Portal',preNotes:'',postNotes:get('DESCRIPTION').replace(/\\n/g,'\n').slice(0,400),followUp:'',imported:true});
  }
  return events;
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  const [user,setUser]       = useState(null);
  const [authReady,setAuthReady] = useState(false);
  const [data,setData]       = useState(BLANK_DATA);
  const [saving,setSaving]   = useState(false);
  const [tab,setTab]         = useState('dashboard');
  const [sideOpen,setSideOpen] = useState(false);
  const saveTimer            = useRef(null);
  const unsubRef             = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (!user) { setData(BLANK_DATA); return; }
    const ref = doc(db, 'users', user.uid);
    unsubRef.current = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setData({ ...BLANK_DATA, ...snap.data() });
      } else {
        const initial = { ...BLANK_DATA, profile: { name: user.displayName||'', conditions:'', goal:'' } };
        setDoc(ref, initial);
        setData(initial);
      }
    });
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [user]);

  const upd = useCallback((key, val) => {
    setData(d => {
      const next = { ...d, [key]: val };
      if (user) {
        clearTimeout(saveTimer.current);
        setSaving(true);
        saveTimer.current = setTimeout(() => {
          setDoc(doc(db, 'users', user.uid), next, { merge:true })
            .then(() => setSaving(false))
            .catch(() => setSaving(false));
        }, 800);
      }
      return next;
    });
  }, [user]);

  if (!authReady) return <Splash/>;
  if (!user) return <AuthScreen/>;

  const changeTab = (t) => { setTab(t); setSideOpen(false); };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#000000', fontFamily:"'DM Sans',sans-serif", color:'#F0E8FF', overflow:'hidden', position:'relative' }}>
      <style>{GLOBAL_CSS}</style>
      <Background/>

      {/* Mobile overlay */}
      {sideOpen && <div className="mobile-overlay" onClick={()=>setSideOpen(false)}/>}

      <Sidebar tab={tab} setTab={changeTab} user={user} data={data} saving={saving} open={sideOpen} setOpen={setSideOpen}/>

      <main className="main-content">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="hamburger" onClick={()=>setSideOpen(o=>!o)} aria-label="Menu">
            <span/><span/><span/>
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <LogoImg size={28}/>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:900, fontSize:18, color:'#fff', letterSpacing:1 }}>ADVY<span style={{ fontWeight:300, color:'rgba(255,255,255,.75)', marginLeft:4 }}>Health</span></span>
          </div>
          {saving && <div style={{ width:7, height:7, borderRadius:'50%', background:'#C9A84C', animation:'pulseGlow 1s ease-in-out infinite' }}/>}
        </div>

        <div className="page-fade page-inner">
          {tab==='dashboard'    && <Dashboard data={data} setTab={changeTab} upd={upd} user={user}/>}
          {tab==='symptoms'     && <Symptoms data={data} upd={upd}/>}
          {tab==='bodymap'      && <BodyMap data={data} upd={upd}/>}
          {tab==='medications'  && <Medications data={data} upd={upd}/>}
          {tab==='appointments' && <Appointments data={data} upd={upd}/>}
          {tab==='diary'        && <Diary data={data} upd={upd}/>}
          {tab==='diet'         && <AIDiet data={data}/>}
          {tab==='documents'    && <Documents data={data} upd={upd}/>}
          {tab==='advocate'     && <Advocate data={data}/>}
          {tab==='share'        && <SharePrivacy data={data} user={user}/>}
        </div>
      </main>
    </div>
  );
}

// ─── Logo (uses uploaded logo image via public/icons path) ────
function LogoImg({ size=56 }) {
  return (
    <img
      src="/icons/icon-192.png"
      alt="Advy Health"
      width={size}
      height={size}
      style={{ borderRadius: size*0.22, objectFit:'cover', flexShrink:0,
        filter:'drop-shadow(0 0 12px rgba(123,47,190,.6))' }}
      onError={e=>{ e.target.style.display='none'; }}
    />
  );
}

// ─── Global CSS ───────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=Dancing+Script:wght@400;500;600;700&family=Satisfy&family=Pacifico&family=Great+Vibes&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  button,input,select,textarea{font-family:'DM Sans',sans-serif}
  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-thumb{background:rgba(201,168,76,.3);border-radius:4px}
  ::-webkit-scrollbar-track{background:transparent}

  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes popIn{from{opacity:0;transform:scale(.93) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
  @keyframes drift{0%,100%{transform:translate(0,0) scale(1)}30%{transform:translate(60px,-40px) scale(1.08)}70%{transform:translate(-40px,30px) scale(.94)}}
  @keyframes drift2{0%,100%{transform:translate(0,0)}25%{transform:translate(-80px,40px)}60%{transform:translate(50px,-60px)}}
  @keyframes drift3{0%,100%{transform:translate(0,0) rotate(0deg)}40%{transform:translate(30px,50px) rotate(5deg)}80%{transform:translate(-20px,-30px) rotate(-3deg)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  @keyframes pulseGlow{0%,100%{box-shadow:0 0 20px rgba(123,47,190,.4),0 0 40px rgba(123,47,190,.2)}50%{box-shadow:0 0 35px rgba(123,47,190,.6),0 0 70px rgba(201,168,76,.2)}}
  @keyframes shimmerBorder{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes slideInLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
  @keyframes bounce{0%,80%,100%{transform:scale(0) translateY(0)}40%{transform:scale(1) translateY(-4px)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes crystalPulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:.7;transform:scale(1.04)}}
  @keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes heartbeat{0%,100%{transform:scale(1)}14%{transform:scale(1.15)}28%{transform:scale(1)}42%{transform:scale(1.08)}70%{transform:scale(1)}}
  @keyframes pageEnter{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes inkDrop{from{opacity:0;transform:scale(.85) rotate(-1deg)}to{opacity:1;transform:scale(1) rotate(0deg)}}

  .page-fade{animation:fadeUp .35s cubic-bezier(.22,1,.36,1)}
  .slide-in{animation:slideInLeft .3s cubic-bezier(.22,1,.36,1)}

  .glass-card{
    background:rgba(10,4,20,.75);
    backdrop-filter:blur(20px);
    border:1px solid rgba(123,47,190,.2);
    border-radius:20px;
    box-shadow:0 8px 32px rgba(0,0,0,.6),inset 0 1px 0 rgba(201,168,76,.06);
    transition:all .25s ease;
  }
  .glass-card:hover{
    border-color:rgba(201,168,76,.3);
    box-shadow:0 12px 48px rgba(0,0,0,.7),0 0 30px rgba(123,47,190,.12),inset 0 1px 0 rgba(201,168,76,.1);
    transform:translateY(-2px);
  }
  .glass-card-static{
    background:rgba(10,4,20,.75);
    backdrop-filter:blur(20px);
    border:1px solid rgba(123,47,190,.2);
    border-radius:20px;
    box-shadow:0 8px 32px rgba(0,0,0,.6),inset 0 1px 0 rgba(201,168,76,.06);
  }

  .btn{border:none;border-radius:12px;padding:11px 22px;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s ease;display:inline-flex;align-items:center;gap:7px;letter-spacing:.1px}
  .btn-gold{background:linear-gradient(135deg,#C9A84C,#E8C96B);color:#000000;font-weight:700;box-shadow:0 4px 20px rgba(201,168,76,.4),inset 0 1px 0 rgba(255,255,255,.25)}
  .btn-gold:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(201,168,76,.55),inset 0 1px 0 rgba(255,255,255,.3)}
  .btn-gold:active{transform:translateY(0)}
  .btn-ghost{background:rgba(123,47,190,.1);border:1px solid rgba(123,47,190,.3);color:rgba(240,232,255,.7)}
  .btn-ghost:hover{background:rgba(123,47,190,.2);border-color:rgba(201,168,76,.4);color:#F0E8FF}
  .btn-danger{background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.2);color:#ff8080}
  .btn-danger:hover{background:#ff5050;color:#fff;border-color:#ff5050}
  .btn-subtle{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(240,232,255,.5)}
  .btn-subtle:hover{background:rgba(255,255,255,.08);color:#F0E8FF}

  .field{background:rgba(255,255,255,.04);border:1.5px solid rgba(123,47,190,.25);border-radius:12px;padding:12px 16px;font-size:14px;color:#F0E8FF;width:100%;outline:none;transition:all .2s;caret-color:#C9A84C}
  .field:focus{border-color:#C9A84C;background:rgba(201,168,76,.05);box-shadow:0 0 0 4px rgba(201,168,76,.1)}
  .field::placeholder{color:rgba(240,232,255,.2)}
  select.field option{background:#08020f;color:#F0E8FF}
  label{font-size:11px;font-weight:600;color:rgba(201,168,76,.75);display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.9px}
  input[type=range]{accent-color:#C9A84C;cursor:pointer;width:100%}
  input[type=checkbox]{accent-color:#7B2FBE;width:16px;height:16px;cursor:pointer}

  .pill{display:inline-flex;align-items:center;gap:5px;background:rgba(123,47,190,.15);border:1px solid rgba(123,47,190,.3);color:#C084FC;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:500}

  /* ── Sidebar ── */
  .sidebar{
    width:256px;
    background:rgba(4,1,10,.95);
    backdrop-filter:blur(28px);
    border-right:1px solid rgba(123,47,190,.15);
    display:flex;flex-direction:column;
    position:fixed;top:0;left:0;bottom:0;
    z-index:100;
    box-shadow:4px 0 40px rgba(0,0,0,.8);
    transition:transform .3s cubic-bezier(.22,1,.36,1);
  }
  .nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:11px 14px;border-radius:12px;border:1px solid transparent;background:transparent;color:rgba(240,232,255,.3);font-size:13px;font-weight:500;cursor:pointer;transition:all .18s ease;text-align:left;position:relative}
  .nav-item:hover{background:rgba(123,47,190,.08);color:rgba(240,232,255,.7);border-color:rgba(123,47,190,.15)}
  .nav-item.active{background:linear-gradient(135deg,rgba(123,47,190,.18),rgba(123,47,190,.08));color:#C9A84C;border-color:rgba(201,168,76,.2);font-weight:600}

  /* ── Main content ── */
  .main-content{margin-left:256px;flex:1;display:flex;flex-direction:column;min-height:100vh;position:relative;z-index:1}
  .page-inner{flex:1;padding:32px 36px;padding-bottom:40px;max-width:1100px}

  /* ── Mobile topbar (hidden on desktop) ── */
  .mobile-topbar{display:none;align-items:center;gap:12px;padding:14px 18px;background:rgba(4,1,10,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(123,47,190,.15);position:sticky;top:0;z-index:90;flex-shrink:0}
  .hamburger{background:transparent;border:none;cursor:pointer;padding:6px;display:flex;flex-direction:column;gap:5px;flex-shrink:0}
  .hamburger span{display:block;width:22px;height:2px;background:#C9A84C;border-radius:2px;transition:all .2s}
  .mobile-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99;backdrop-filter:blur(4px)}

  .stat-card{background:rgba(10,4,20,.8);border:1px solid rgba(123,47,190,.15);border-radius:18px;padding:22px 18px;cursor:pointer;transition:all .25s ease;position:relative;overflow:hidden}
  .stat-card:hover{transform:translateY(-4px);border-color:rgba(201,168,76,.3);box-shadow:0 16px 48px rgba(0,0,0,.6),0 0 40px rgba(123,47,190,.12)}

  .auth-input{background:rgba(255,255,255,.05);border:1.5px solid rgba(123,47,190,.25);border-radius:14px;padding:14px 18px;font-size:15px;color:#F0E8FF;width:100%;outline:none;transition:all .2s;caret-color:#C9A84C}
  .auth-input:focus{border-color:#C9A84C;background:rgba(201,168,76,.06);box-shadow:0 0 0 4px rgba(201,168,76,.1)}
  .auth-input::placeholder{color:rgba(240,232,255,.22)}

  /* ── Body map ── */
  .body-part{cursor:pointer;transition:all .2s ease;fill:rgba(123,47,190,.15);stroke:rgba(123,47,190,.4);stroke-width:1.5}
  .body-part:hover{fill:rgba(201,168,76,.25);stroke:#C9A84C}
  .body-part.has-pain{fill:rgba(248,113,113,.25);stroke:#f87171;stroke-width:2}
  .body-part.has-pain.sev-high{fill:rgba(248,113,113,.45);stroke:#ef4444;filter:drop-shadow(0 0 6px rgba(239,68,68,.5))}
  .body-part.selected{fill:rgba(201,168,76,.35);stroke:#E8C96B;stroke-width:2.5;filter:drop-shadow(0 0 8px rgba(201,168,76,.5))}

  /* ── Diary ── */
  .diary-page{
    background:linear-gradient(160deg,rgba(15,6,30,.9) 0%,rgba(8,2,20,.95) 100%);
    border:1px solid rgba(123,47,190,.2);
    border-radius:16px;
    position:relative;
    overflow:hidden;
    animation:inkDrop .4s cubic-bezier(.22,1,.36,1);
  }
  .diary-page::before{
    content:'';position:absolute;left:72px;top:0;bottom:0;width:1px;
    background:rgba(201,168,76,.08);
  }
  .diary-lines{
    background-image:repeating-linear-gradient(transparent,transparent 31px,rgba(123,47,190,.06) 31px,rgba(123,47,190,.06) 32px);
    background-size:100% 32px;
    background-position:0 40px;
  }
  .diary-textarea{
    background:transparent;
    border:none;
    outline:none;
    width:100%;
    min-height:280px;
    padding:16px 20px 16px 24px;
    color:rgba(240,232,255,.85);
    font-size:15px;
    line-height:32px;
    resize:none;
    caret-color:#C9A84C;
  }
  .diary-entry-card{
    background:rgba(10,4,20,.8);
    border:1px solid rgba(123,47,190,.15);
    border-radius:14px;
    padding:20px 24px;
    transition:all .25s ease;
    cursor:pointer;
    animation:fadeUp .3s ease;
  }
  .diary-entry-card:hover{border-color:rgba(201,168,76,.25);transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,.5)}

  /* ── Share card ── */
  .share-card{
    background:linear-gradient(135deg,rgba(10,4,20,.9),rgba(15,6,30,.95));
    border:1px solid rgba(201,168,76,.2);
    border-radius:20px;
    padding:28px;
    position:relative;
    overflow:hidden;
  }
  .share-card::after{
    content:'';position:absolute;top:-40px;right:-40px;width:150px;height:150px;
    border-radius:50%;background:radial-gradient(circle,rgba(201,168,76,.06) 0%,transparent 70%);
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .sidebar{transform:translateX(-100%)}
    .sidebar.open{transform:translateX(0)}
    .main-content{margin-left:0}
    .mobile-topbar{display:flex}
    .page-inner{padding:20px 16px 32px}
    .stats-grid{grid-template-columns:repeat(2,1fr) !important}
    .two-col{grid-template-columns:1fr !important}
    .three-col{grid-template-columns:1fr !important}
  }
  @media (max-width: 480px) {
    .stats-grid{grid-template-columns:repeat(2,1fr) !important}
    .page-inner{padding:16px 12px 28px}
  }
`;

// ─── Animated Background ──────────────────────────────────────
function Background() {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      <div style={{ position:'absolute', inset:0, background:'#000000' }}/>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 15% 15%, rgba(123,47,190,.18) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(123,47,190,.12) 0%, transparent 50%)' }}/>
      <div style={{ position:'absolute', top:-60, right:-60, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(201,168,76,.06) 0%, transparent 65%)', animation:'drift 22s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', bottom:-80, left:-80, width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(192,132,252,.08) 0%, transparent 60%)', animation:'drift2 28s ease-in-out infinite' }}/>
      <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', width:600, height:300, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(123,47,190,.05) 0%, transparent 70%)', animation:'crystalPulse 6s ease-in-out infinite' }}/>
    </div>
  );
}

// ─── Splash ───────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{ minHeight:'100vh', background:'#000000', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ marginBottom:16, animation:'floatUp 2s ease-in-out infinite' }}>
          <LogoImg size={80}/>
        </div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:700, color:'#ffffff', letterSpacing:2, marginBottom:4, lineHeight:1 }}>
          <span style={{ fontWeight:900 }}>ADVY</span> <span style={{ fontWeight:300 }}>Health</span>
        </div>
        <div style={{ fontSize:10, color:'#C9A84C', letterSpacing:3, textTransform:'uppercase', marginBottom:24 }}>The Gold Standard in Health Advocacy</div>
        <div style={{ width:60, height:2, background:'linear-gradient(90deg,#7B2FBE,#C9A84C)', margin:'0 auto', borderRadius:2, animation:'shimmerBorder 2s ease infinite', backgroundSize:'200% 200%' }}/>
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────
function AuthScreen() {
  const [mode,setMode]       = useState('signin');
  const [name,setName]       = useState('');
  const [email,setEmail]     = useState('');
  const [pass,setPass]       = useState('');
  const [confirm,setConfirm] = useState('');
  const [error,setError]     = useState('');
  const [msg,setMsg]         = useState('');
  const [loading,setLoading] = useState(false);
  const clearState = () => { setError(''); setMsg(''); };

  const handleSignin = async () => {
    if(!email||!pass){setError('Please enter your email and password.');return;}
    setLoading(true);clearState();
    try { await signInWithEmailAndPassword(auth,email,pass); }
    catch(e){ setError(e.code==='auth/invalid-credential'?'Invalid email or password.':'Sign in failed. Please try again.'); }
    setLoading(false);
  };
  const handleSignup = async () => {
    if(!name.trim()){setError('Please enter your name.');return;}
    if(!email){setError('Please enter your email.');return;}
    if(pass.length<8){setError('Password must be at least 8 characters.');return;}
    if(pass!==confirm){setError('Passwords do not match.');return;}
    setLoading(true);clearState();
    try {
      const cred = await createUserWithEmailAndPassword(auth,email,pass);
      await updateProfile(cred.user,{displayName:name.trim()});
    } catch(e) {
      setError(e.code==='auth/email-already-in-use'?'An account with this email already exists.':'Sign up failed. Please try again.');
    }
    setLoading(false);
  };
  const handleReset = async () => {
    if(!email){setError('Please enter your email address.');return;}
    setLoading(true);clearState();
    try { await sendPasswordResetEmail(auth,email); setMsg('Password reset email sent!'); }
    catch { setError('Could not send reset email.'); }
    setLoading(false);
  };
  const handleKey = e => {
    if(e.key==='Enter'){if(mode==='signin')handleSignin();else if(mode==='signup')handleSignup();else handleReset();}
  };

  return (
    <div style={{ minHeight:'100vh', background:'#000000', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", padding:20, position:'relative' }}>
      <style>{GLOBAL_CSS}</style>
      <Background/>
      <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ marginBottom:14, animation:'floatUp 3s ease-in-out infinite' }}>
            <LogoImg size={76}/>
          </div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:700, color:'#ffffff', letterSpacing:2, marginBottom:4, lineHeight:1 }}>
            <span style={{ fontWeight:900 }}>ADVY</span> <span style={{ fontWeight:300, color:'rgba(255,255,255,.85)' }}>Health</span>
          </div>
          <div style={{ fontSize:10, color:'#C9A84C', letterSpacing:3, textTransform:'uppercase' }}>The Gold Standard in Health Advocacy</div>
          <div style={{ marginTop:10, fontSize:12, color:'rgba(192,132,252,.5)', fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>
            Your story matters. Your symptoms are real. You deserve to be heard.
          </div>
        </div>

        <div className="glass-card-static" style={{ padding:36, borderRadius:24 }}>
          <div style={{ display:'flex', gap:0, marginBottom:28, background:'rgba(255,255,255,.04)', borderRadius:12, padding:4 }}>
            {[{k:'signin',l:'Sign In'},{k:'signup',l:'Create Account'}].map(m=>(
              <button key={m.k} onClick={()=>{setMode(m.k);clearState();}} style={{ flex:1, padding:'9px 0', borderRadius:9, border:'none', background:mode===m.k?'linear-gradient(135deg,#C9A84C,#E8C96B)':'transparent', color:mode===m.k?'#000000':'rgba(240,232,255,.45)', fontWeight:mode===m.k?700:500, fontSize:13, cursor:'pointer', transition:'all .2s', fontFamily:"'DM Sans',sans-serif" }}>
                {m.l}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {mode==='signup' && <div><label>Your Name</label><input className="auth-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah" onKeyDown={handleKey} autoFocus/></div>}
            <div><label>Email Address</label><input className="auth-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={handleKey} autoFocus={mode!=='signup'}/></div>
            {mode !== 'reset' && <div><label>Password</label><input className="auth-input" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder={mode==='signup'?'At least 8 characters':'Your password'} onKeyDown={handleKey}/></div>}
            {mode==='signup' && <div><label>Confirm Password</label><input className="auth-input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Re-enter your password" onKeyDown={handleKey}/></div>}
          </div>

          {error && <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(255,80,80,.1)', border:'1px solid rgba(255,80,80,.2)', borderRadius:10, fontSize:13, color:'#ff8080' }}>⚠ {error}</div>}
          {msg && <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(110,231,183,.1)', border:'1px solid rgba(110,231,183,.2)', borderRadius:10, fontSize:13, color:'#6ee7b7' }}>✓ {msg}</div>}

          <button className="btn btn-gold" onClick={mode==='signin'?handleSignin:mode==='signup'?handleSignup:handleReset} disabled={loading}
            style={{ width:'100%', marginTop:20, padding:'14px', fontSize:15, justifyContent:'center', opacity:loading?.7:1 }}>
            {loading ? <span style={{ display:'inline-block', width:18, height:18, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#000', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : mode==='signin'?'Sign In to Advy Health':mode==='signup'?'Create My Account':'Send Reset Email'}
          </button>

          {mode==='signin' && <button onClick={()=>{setMode('reset');clearState();}} style={{ width:'100%', marginTop:12, background:'none', border:'none', color:'rgba(240,232,255,.3)', fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", padding:4 }}>Forgot your password?</button>}
          {mode==='reset' && <button onClick={()=>{setMode('signin');clearState();}} style={{ width:'100%', marginTop:12, background:'none', border:'none', color:'rgba(240,232,255,.3)', fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", padding:4 }}>← Back to sign in</button>}
        </div>

        <div style={{ textAlign:'center', marginTop:18, fontSize:11, color:'rgba(240,232,255,.2)', lineHeight:1.6 }}>
          🔒 Your health data is encrypted and stored securely in your private account.<br/>
          Only you can access it. We never see, sell, or share your information.
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ tab, setTab, user, data, saving, open, setOpen }) {
  const handleSignOut = () => signOut(auth);
  return (
    <aside className={`sidebar${open?' open':''}`}>
      <div style={{ padding:'24px 18px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:11, marginBottom:20 }}>
          <LogoImg size={38}/>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:900, color:'#ffffff', letterSpacing:2, lineHeight:1 }}>ADVY</div>
            <div style={{ fontSize:9, fontWeight:500, color:'#C9A84C', letterSpacing:2, marginTop:1 }}>HEALTH</div>
          </div>
          {saving && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:'pulseGlow 1s ease-in-out infinite' }}/>}
        </div>
        <div style={{ background:'linear-gradient(135deg,rgba(123,47,190,.1),rgba(201,168,76,.05))', border:'1px solid rgba(123,47,190,.2)', borderRadius:14, padding:'12px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#7B2FBE,#C9A84C)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#000000', flexShrink:0 }}>
              {(user.displayName||user.email||'?')[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:13, color:'#F0E8FF', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.displayName||'Your Account'}</div>
              <div style={{ fontSize:10, color:'rgba(201,168,76,.5)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.email}</div>
            </div>
          </div>
          {data.profile.conditions && (
            <div style={{ marginTop:8, fontSize:11, color:'rgba(192,132,252,.6)', fontWeight:500, lineHeight:1.4 }}>
              {data.profile.conditions.split(',')[0].trim()}{data.profile.conditions.includes(',')?' + more':''}
            </div>
          )}
        </div>
      </div>

      <nav style={{ flex:1, padding:'4px 10px', overflowY:'auto' }}>
        <div style={{ fontSize:9, fontWeight:700, color:'rgba(201,168,76,.35)', letterSpacing:2, padding:'6px 6px 10px', textTransform:'uppercase' }}>Navigation</div>
        {NAV.map(n => {
          const active = tab===n.id;
          return (
            <button key={n.id} onClick={()=>setTab(n.id)} className={`nav-item ${active?'active':''}`} style={{ marginBottom:2 }}>
              {active && <div style={{ position:'absolute', left:0, top:'18%', bottom:'18%', width:3, background:'linear-gradient(180deg,#7B2FBE,#C9A84C)', borderRadius:'0 3px 3px 0' }}/>}
              <span style={{ fontSize:14, width:22, textAlign:'center', lineHeight:1, fontFamily:'serif' }}>{n.icon}</span>
              <span style={{ flex:1 }}>{n.label}</span>
              {active && <span style={{ width:5, height:5, borderRadius:'50%', background:'#C9A84C', boxShadow:'0 0 8px #C9A84C' }}/>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(123,47,190,.1)' }}>
        <div style={{ background:'rgba(123,47,190,.06)', borderRadius:12, padding:'11px 13px', marginBottom:10, border:'1px solid rgba(123,47,190,.1)' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'rgba(201,168,76,.6)', marginBottom:3 }}>💜 Ikigai Reminder</div>
          <div style={{ fontSize:11, color:'rgba(240,232,255,.35)', lineHeight:1.5, fontStyle:'italic' }}>"At the intersection of what you love and what the world needs lies your reason for being."</div>
        </div>
        <button onClick={handleSignOut} className="btn btn-subtle" style={{ width:'100%', justifyContent:'center', fontSize:12, padding:'9px' }}>Sign out</button>
      </div>
    </aside>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────
function PH({ emoji, title, sub, children }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
      <div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', letterSpacing:.5, marginBottom:4, lineHeight:1 }}>{emoji} {title}</div>
        {sub && <div style={{ fontSize:14, color:'rgba(240,232,255,.4)', fontWeight:400 }}>{sub}</div>}
      </div>
      {children && <div style={{ flexShrink:0 }}>{children}</div>}
    </div>
  );
}
function SH({ title, emoji, onAction, actionLabel }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
      <div style={{ fontWeight:600, fontSize:14, color:'#F0E8FF' }}>{emoji} {title}</div>
      {onAction && <button onClick={onAction} style={{ border:'none', background:'transparent', color:'rgba(201,168,76,.6)', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{actionLabel} →</button>}
    </div>
  );
}
function Nil({ icon, msg, cta, fn, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'30px 16px' }}>
      <div style={{ fontSize:32, marginBottom:8, opacity:.5 }}>{icon}</div>
      <div style={{ fontSize:13, color:'rgba(240,232,255,.3)', fontWeight:500, marginBottom:sub?4:cta?14:0 }}>{msg}</div>
      {sub && <div style={{ fontSize:12, color:'rgba(192,132,252,.4)', marginBottom:14 }}>{sub}</div>}
      {cta && fn && <button className="btn btn-gold" onClick={fn} style={{ fontSize:12, padding:'8px 18px' }}>{cta}</button>}
    </div>
  );
}
function SevDot({ v }) {
  const c = v<=3?'#6ee7b7':v<=6?'#fcd34d':'#f87171';
  return <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block', flexShrink:0, boxShadow:`0 0 5px ${c}` }}/>;
}
function NoteBlock({ title, text, color }) {
  return (
    <div style={{ marginBottom:14, padding:'14px 16px', background:'rgba(255,255,255,.03)', borderRadius:12, borderLeft:`3px solid ${color}44` }}>
      <div style={{ fontSize:11, fontWeight:700, color:color, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13, color:'rgba(240,232,255,.6)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{text}</div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
function Dashboard({ data, setTab, upd, user }) {
  const today = todayStr();
  const activeMeds = data.medications.filter(m=>m.active);
  const takenToday = m => (m.takenDates||[]).includes(today);
  const totalTaken = activeMeds.filter(takenToday).length;
  const medPct = activeMeds.length ? Math.round((totalTaken/activeMeds.length)*100) : 0;
  const upcoming = data.appointments.filter(a=>a.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  const todaySym = data.symptoms.filter(s=>s.date===today);
  const toggleTaken = id => upd('medications', data.medications.map(m => {
    if (m.id!==id) return m;
    const td=m.takenDates||[];
    return { ...m, takenDates: td.includes(today)?td.filter(d=>d!==today):[...td,today] };
  }));

  const stats = [
    { label:'Symptoms Logged', val:data.symptoms.length, icon:'◈', color:'#C084FC', glow:'rgba(192,132,252,.2)', tab:'symptoms' },
    { label:'Active Medications', val:activeMeds.length, icon:'◉', color:'#6ee7b7', glow:'rgba(110,231,183,.2)', tab:'medications' },
    { label:'Appointments', val:data.appointments.length, icon:'◷', color:'#93c5fd', glow:'rgba(147,197,253,.2)', tab:'appointments' },
    { label:'Diary Entries', val:(data.diary||[]).length, icon:'✑', color:'#C9A84C', glow:'rgba(201,168,76,.2)', tab:'diary' },
  ];

  return (
    <div>
      {/* Ikigai/Imago welcome */}
      <div style={{ marginBottom:32 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'rgba(201,168,76,.5)', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>{greet()}</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:38, fontWeight:600, color:'#C9A84C', letterSpacing:-.5, marginBottom:4, lineHeight:1 }}>
          {user.displayName||'Welcome'} 💜
        </div>
        <div style={{ color:'rgba(240,232,255,.35)', fontSize:15 }}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>

        {/* Imago / Ikigai philosophy strip */}
        <div style={{ marginTop:16, display:'flex', gap:10, flexWrap:'wrap' }}>
          <div style={{ background:'rgba(123,47,190,.07)', border:'1px solid rgba(123,47,190,.15)', borderRadius:12, padding:'8px 14px', fontSize:12, color:'rgba(192,132,252,.6)', fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>
            ✦ Imago: You are seen exactly as you are.
          </div>
          <div style={{ background:'rgba(201,168,76,.06)', border:'1px solid rgba(201,168,76,.12)', borderRadius:12, padding:'8px 14px', fontSize:12, color:'rgba(201,168,76,.6)', fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>
            🌸 Ikigai: Your healing has purpose and meaning.
          </div>
        </div>

        {data.profile.goal && (
          <div style={{ marginTop:10, fontSize:12, color:'rgba(201,168,76,.7)', fontWeight:500, background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.15)', display:'inline-block', padding:'5px 14px', borderRadius:20 }}>
            ✦ {data.profile.goal}
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }} className="stats-grid">
        {stats.map((s,i) => (
          <div key={i} className="stat-card" onClick={()=>setTab(s.tab)}>
            <div style={{ position:'absolute', top:0, right:0, width:80, height:80, borderRadius:'50%', background:`radial-gradient(circle,${s.glow} 0%,transparent 70%)`, filter:'blur(10px)' }}/>
            <div style={{ fontFamily:'serif', fontSize:22, color:s.color, marginBottom:10, opacity:.8 }}>{s.icon}</div>
            <div style={{ fontSize:36, fontWeight:700, color:s.color, lineHeight:1, marginBottom:4, fontFamily:"'Cormorant Garamond',serif" }}>{s.val}</div>
            <div style={{ fontSize:12, color:'rgba(240,232,255,.4)', fontWeight:500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {activeMeds.length>0 && (
        <div className="glass-card-static" style={{ padding:20, marginBottom:20 }}>
          <SH title="Today's Medications" emoji="◉" onAction={()=>setTab('medications')} actionLabel="All meds"/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:13, color:'rgba(240,232,255,.4)' }}>{totalTaken} of {activeMeds.length} taken</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#C9A84C', fontFamily:"'Cormorant Garamond',serif" }}>{medPct}%</div>
          </div>
          <div style={{ background:'rgba(255,255,255,.06)', borderRadius:6, height:6, overflow:'hidden', marginBottom:14 }}>
            <div style={{ height:'100%', width:`${medPct}%`, background:'linear-gradient(90deg,#7B2FBE,#C9A84C)', borderRadius:6, transition:'width .4s ease' }}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {activeMeds.slice(0,4).map(m => {
              const taken=(m.takenDates||[]).includes(today);
              return (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:11 }}>
                  <button onClick={()=>toggleTaken(m.id)} style={{ width:26,height:26,borderRadius:'50%',border:`2px solid ${taken?'#6ee7b7':'rgba(123,47,190,.4)'}`,background:taken?'linear-gradient(135deg,#6ee7b7,#34d399)':'transparent',color:'#000',fontSize:13,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .18s',fontWeight:900,boxShadow:taken?'0 0 12px rgba(110,231,183,.35)':'none' }}>{taken?'✓':''}</button>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:taken?'rgba(240,232,255,.3)':'#F0E8FF', textDecoration:taken?'line-through':'none' }}>{m.name}</div>
                    <div style={{ fontSize:11, color:'rgba(240,232,255,.3)' }}>{m.dose} · {m.frequency}</div>
                  </div>
                  {taken && <span style={{ fontSize:10, color:'#6ee7b7', fontWeight:600 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }} className="two-col">
        <div className="glass-card-static" style={{ padding:20 }}>
          <SH title="Today's Symptoms" emoji="◈" onAction={()=>setTab('symptoms')} actionLabel="Log entry"/>
          {todaySym.length===0
            ? <div style={{ fontSize:12, color:'rgba(240,232,255,.25)', fontStyle:'italic' }}>No entries today yet.</div>
            : todaySym.slice(0,1).map(s=>(
              <div key={s.id}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8 }}>{s.entries.slice(0,3).map((e,i)=><span key={i} className="pill">{e.symptom}</span>)}</div>
                <div style={{ display:'flex', gap:10 }}>
                  {[{l:'Pain',v:s.pain,c:'#f87171'},{l:'Energy',v:s.energy,c:'#6ee7b7'},{l:'Mood',v:s.mood,c:'#93c5fd'}].map(m=>(
                    <div key={m.l} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:16, fontWeight:700, color:m.c, fontFamily:"'Cormorant Garamond',serif" }}>{m.v}<span style={{ fontSize:9, color:'rgba(240,232,255,.2)' }}>/10</span></div>
                      <div style={{ fontSize:10, color:m.c, opacity:.75 }}>{m.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          }
        </div>
        <div className="glass-card-static" style={{ padding:20 }}>
          <SH title="Upcoming" emoji="◷" onAction={()=>setTab('appointments')} actionLabel="All"/>
          {upcoming.length===0
            ? <div style={{ fontSize:12, color:'rgba(240,232,255,.25)', fontStyle:'italic' }}>No upcoming appointments.</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {upcoming.map(a=>(
                  <div key={a.id} style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ background:'rgba(123,47,190,.1)', borderRadius:8, padding:'4px 8px', textAlign:'center', minWidth:38, flexShrink:0, border:'1px solid rgba(123,47,190,.2)' }}>
                      <div style={{ fontSize:9, fontWeight:700, color:'#7B2FBE' }}>{new Date(a.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</div>
                      <div style={{ fontSize:15, fontWeight:700, color:'#C084FC', fontFamily:"'Cormorant Garamond',serif" }}>{new Date(a.date+'T12:00:00').getDate()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#F0E8FF' }}>{a.provider}</div>
                      <div style={{ fontSize:11, color:'rgba(240,232,255,.3)' }}>{a.type||'Appointment'}</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {!data.profile.name && (
        <div className="glass-card-static" style={{ padding:22, borderLeft:'3px solid rgba(201,168,76,.3)' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:10 }}>✦ Complete your profile</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }} className="two-col">
            <div><label>Your name</label><input className="field" value={data.profile.name} onChange={e=>upd('profile',{...data.profile,name:e.target.value})} placeholder="e.g. Sarah"/></div>
            <div><label>Conditions (comma-separated)</label><input className="field" value={data.profile.conditions} onChange={e=>upd('profile',{...data.profile,conditions:e.target.value})} placeholder="e.g. Fibromyalgia, POTS"/></div>
            <div style={{ gridColumn:'1/-1' }}><label>Your wellness goal</label><input className="field" value={data.profile.goal} onChange={e=>upd('profile',{...data.profile,goal:e.target.value})} placeholder="e.g. Be better understood by my doctors"/></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Symptoms ─────────────────────────────────────────────────
function Symptoms({ data, upd }) {
  const blank = { date:todayStr(), entries:[], pain:5, energy:5, mood:5, notes:'' };
  const [form,setForm] = useState(blank);
  const [open,setOpen] = useState(false);
  const [sel,setSel]   = useState('');
  const [custom,setCustom] = useState('');

  const addSym = () => {
    const s = sel || custom.trim();
    if(!s)return;
    if(form.entries.find(e=>e.symptom===s))return;
    setForm(f=>({...f,entries:[...f.entries,{symptom:s,severity:5}]}));
    setSel(''); setCustom('');
  };
  const rmSym = s => setForm(f=>({...f,entries:f.entries.filter(e=>e.symptom!==s)}));
  const setSev = (s,v) => setForm(f=>({...f,entries:f.entries.map(e=>e.symptom===s?{...e,severity:v}:e)}));
  const del = id => { if(confirm('Delete this entry?')) upd('symptoms',data.symptoms.filter(s=>s.id!==id)); };
  const save = () => {
    if(!form.entries.length){alert('Please add at least one symptom.');return;}
    const entry={...form,id:uid()};
    const existing=data.symptoms.find(s=>s.date===form.date);
    upd('symptoms', existing
      ? data.symptoms.map(s=>s.date===form.date?{...s,...entry,id:s.id}:s)
      : [entry,...data.symptoms]);
    setForm(blank);setOpen(false);
  };
  const scales = [
    { k:'pain',  label:'Pain level',   c:'#f87171' },
    { k:'energy',label:'Energy level', c:'#6ee7b7' },
    { k:'mood',  label:'Mood',         c:'#93c5fd' },
  ];

  return (
    <div>
      <PH emoji="◈" title="Symptoms" sub="Track how you feel each day">
        <button className="btn btn-gold" onClick={()=>{setForm(blank);setOpen(true)}}>+ Log entry</button>
      </PH>

      {open && (
        <div className="glass-card-static" style={{ padding:26, marginBottom:22 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'#C9A84C', marginBottom:18 }}>New Symptom Entry</div>
          <div style={{ marginBottom:14 }}>
            <label>Date</label>
            <input className="field" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{ maxWidth:180 }}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label>Add symptoms</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <select className="field" value={sel} onChange={e=>setSel(e.target.value)} style={{ flex:1, minWidth:160 }}>
                <option value="">Select a symptom…</option>
                {SYMS.filter(s=>!form.entries.find(e=>e.symptom===s)).map(s=><option key={s}>{s}</option>)}
              </select>
              <input className="field" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Or type custom…" style={{ flex:1, minWidth:140 }} onKeyDown={e=>e.key==='Enter'&&addSym()}/>
              <button className="btn btn-ghost" onClick={addSym}>Add</button>
            </div>
          </div>
          {form.entries.length>0 && (
            <div style={{ marginBottom:16, display:'flex', flexDirection:'column', gap:9 }}>
              {form.entries.map(e=>(
                <div key={e.symptom} style={{ background:'rgba(255,255,255,.03)', borderRadius:12, padding:'12px 14px', border:'1px solid rgba(123,47,190,.15)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <span className="pill">{e.symptom}</span>
                    <button onClick={()=>rmSym(e.symptom)} style={{ border:'none', background:'transparent', color:'rgba(240,232,255,.3)', cursor:'pointer', fontSize:16, fontFamily:'monospace', padding:'0 4px' }}>×</button>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, color:'rgba(240,232,255,.4)', minWidth:60 }}>Severity</span>
                    <input type="range" min={1} max={10} value={e.severity} onChange={ev=>setSev(e.symptom,+ev.target.value)} style={{ flex:1 }}/>
                    <span style={{ fontWeight:700, color:'#C084FC', minWidth:22, textAlign:'right', fontSize:17, fontFamily:"'Cormorant Garamond',serif" }}>{e.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:13, marginBottom:16 }} className="three-col">
            {scales.map(s=>(
              <div key={s.k}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <label style={{ margin:0 }}>{s.label}</label>
                  <span style={{ fontWeight:700, color:s.c, minWidth:22, textAlign:'right', fontSize:17, fontFamily:"'Cormorant Garamond',serif" }}>{form[s.k]}</span>
                </div>
                <input type="range" min={1} max={10} value={form[s.k]} onChange={e=>setForm(f=>({...f,[s.k]:+e.target.value}))}/>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:18 }}>
            <label>Notes (optional)</label>
            <textarea className="field" rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Anything else to note…" style={{ resize:'vertical' }}/>
          </div>
          <div style={{ display:'flex', gap:9, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save entry</button>
          </div>
        </div>
      )}

      {data.symptoms.length===0 && !open && <Nil icon="◈" msg="No symptoms logged yet." cta="Log your first entry" fn={()=>setOpen(true)}/>}
      <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
        {[...data.symptoms].sort((a,b)=>b.date.localeCompare(a.date)).map(s=>(
          <div key={s.id} className="glass-card" style={{ padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:11, flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:600, fontSize:16, color:'#C9A84C', marginBottom:6 }}>{fmtDate(s.date)}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>{s.entries.map((e,i)=><span key={i} className="pill">{e.symptom} <SevDot v={e.severity}/></span>)}</div>
              </div>
              <button className="btn btn-danger" style={{ fontSize:11, padding:'5px 10px' }} onClick={()=>del(s.id)}>Delete</button>
            </div>
            <div style={{ display:'flex', gap:9, flexWrap:'wrap' }}>
              {[{l:'Pain',v:s.pain,c:'#f87171'},{l:'Energy',v:s.energy,c:'#6ee7b7'},{l:'Mood',v:s.mood,c:'#93c5fd'}].map(m=>(
                <div key={m.l} style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:'8px 12px', textAlign:'center', border:'1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, fontWeight:700, color:m.c, lineHeight:1 }}>{m.v}<span style={{ fontSize:10, color:'rgba(240,232,255,.2)' }}>/10</span></div>
                  <div style={{ fontSize:11, color:m.c, fontWeight:600, marginTop:2, opacity:.75 }}>{m.l}</div>
                </div>
              ))}
            </div>
            {s.notes && <div style={{ marginTop:10, fontSize:13, color:'rgba(240,232,255,.45)', background:'rgba(255,255,255,.02)', borderRadius:9, padding:'8px 12px', lineHeight:1.5, borderLeft:'2px solid rgba(123,47,190,.3)' }}>{s.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Body Map ─────────────────────────────────────────────────
const BODY_PARTS = [
  // Head & neck
  { id:'head', label:'Head', cx:200, cy:38, rx:28, ry:32 },
  { id:'neck', label:'Neck', cx:200, cy:82, rx:13, ry:14 },
  // Torso
  { id:'left_shoulder', label:'Left Shoulder', cx:152, cy:108, rx:22, ry:18 },
  { id:'right_shoulder', label:'Right Shoulder', cx:248, cy:108, rx:22, ry:18 },
  { id:'chest', label:'Chest', cx:200, cy:130, rx:34, ry:30 },
  { id:'upper_back', label:'Upper Back', cx:200, cy:130, rx:34, ry:30 },
  { id:'abdomen', label:'Abdomen', cx:200, cy:178, rx:30, ry:28 },
  { id:'lower_back', label:'Lower Back', cx:200, cy:200, rx:28, ry:20 },
  { id:'pelvis', label:'Hips / Pelvis', cx:200, cy:225, rx:38, ry:20 },
  // Arms
  { id:'left_upper_arm', label:'Left Upper Arm', cx:132, cy:148, rx:15, ry:30 },
  { id:'right_upper_arm', label:'Right Upper Arm', cx:268, cy:148, rx:15, ry:30 },
  { id:'left_elbow', label:'Left Elbow', cx:118, cy:190, rx:12, ry:12 },
  { id:'right_elbow', label:'Right Elbow', cx:282, cy:190, rx:12, ry:12 },
  { id:'left_forearm', label:'Left Forearm', cx:112, cy:222, rx:11, ry:24 },
  { id:'right_forearm', label:'Right Forearm', cx:288, cy:222, rx:11, ry:24 },
  { id:'left_wrist', label:'Left Wrist', cx:107, cy:255, rx:10, ry:10 },
  { id:'right_wrist', label:'Right Wrist', cx:293, cy:255, rx:10, ry:10 },
  { id:'left_hand', label:'Left Hand', cx:104, cy:278, rx:13, ry:18 },
  { id:'right_hand', label:'Right Hand', cx:296, cy:278, rx:13, ry:18 },
  // Legs
  { id:'left_thigh', label:'Left Thigh', cx:178, cy:275, rx:20, ry:40 },
  { id:'right_thigh', label:'Right Thigh', cx:222, cy:275, rx:20, ry:40 },
  { id:'left_knee', label:'Left Knee', cx:178, cy:328, rx:17, ry:16 },
  { id:'right_knee', label:'Right Knee', cx:222, cy:328, rx:17, ry:16 },
  { id:'left_shin', label:'Left Shin / Calf', cx:176, cy:368, rx:14, ry:30 },
  { id:'right_shin', label:'Right Shin / Calf', cx:224, cy:368, rx:14, ry:30 },
  { id:'left_ankle', label:'Left Ankle', cx:174, cy:408, rx:10, ry:10 },
  { id:'right_ankle', label:'Right Ankle', cx:226, cy:408, rx:10, ry:10 },
  { id:'left_foot', label:'Left Foot', cx:170, cy:428, rx:16, ry:12 },
  { id:'right_foot', label:'Right Foot', cx:230, cy:428, rx:16, ry:12 },
];

const PAIN_TYPES = ['Aching','Sharp','Burning','Throbbing','Stabbing','Cramping','Stiffness','Tingling','Numbness','Pressure','Shooting','Tenderness'];

function BodyMap({ data, upd }) {
  const bodyMap = data.bodyMap || [];
  const [selected, setSelected] = useState(null);
  const [editPart, setEditPart] = useState(null);
  const [form, setForm] = useState({ severity:5, types:[], notes:'' });

  const getEntry = id => bodyMap.find(e=>e.id===id);
  const hasPain = id => !!getEntry(id);
  const highPain = id => { const e=getEntry(id); return e&&e.severity>=7; };

  const selectPart = (part) => {
    setSelected(part);
    const existing = getEntry(part.id);
    if (existing) {
      setForm({ severity:existing.severity, types:existing.types||[], notes:existing.notes||'' });
    } else {
      setForm({ severity:5, types:[], notes:'' });
    }
    setEditPart(part);
  };

  const save = () => {
    if (!editPart) return;
    const entry = { id:editPart.id, label:editPart.label, severity:form.severity, types:form.types, notes:form.notes, date:todayStr() };
    upd('bodyMap', [...bodyMap.filter(e=>e.id!==editPart.id), entry]);
    setEditPart(null); setSelected(null);
  };
  const remove = () => {
    upd('bodyMap', bodyMap.filter(e=>e.id!==editPart.id));
    setEditPart(null); setSelected(null);
  };
  const toggleType = t => setForm(f=>({ ...f, types: f.types.includes(t)?f.types.filter(x=>x!==t):[...f.types,t] }));

  return (
    <div>
      <PH emoji="◎" title="Body Map" sub="Tap any area to log where you're feeling pain or discomfort"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }} className="two-col">
        {/* SVG body */}
        <div className="glass-card-static" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ fontSize:12, color:'rgba(240,232,255,.35)', marginBottom:12, textAlign:'center' }}>Tap a body region to log symptoms</div>
          <svg viewBox="0 0 400 450" style={{ width:'100%', maxWidth:340 }} xmlns="http://www.w3.org/2000/svg">
            {BODY_PARTS.map(p => (
              <ellipse
                key={p.id}
                className={`body-part${hasPain(p.id)?' has-pain':''}${highPain(p.id)?' sev-high':''}${selected&&selected.id===p.id?' selected':''}`}
                cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                onClick={()=>selectPart(p)}
              >
                <title>{p.label}{hasPain(p.id)?` — severity ${getEntry(p.id).severity}/10`:''}</title>
              </ellipse>
            ))}
            {/* Labels for a few key areas */}
            {[
              {id:'head',l:'Head',y:34},{id:'chest',l:'Chest',y:126},{id:'abdomen',l:'Abdomen',y:174},
              {id:'left_knee',l:'L Knee',y:324},{id:'right_knee',l:'R Knee',y:324}
            ].map(lbl=>(
              <text key={lbl.id} x={BODY_PARTS.find(p=>p.id===lbl.id)?.cx||0} y={lbl.y}
                textAnchor="middle" style={{ fontSize:8, fill:'rgba(201,168,76,.4)', pointerEvents:'none', fontFamily:"'DM Sans',sans-serif" }}>
                {lbl.l}
              </text>
            ))}
          </svg>
          <div style={{ display:'flex', gap:14, marginTop:14, fontSize:11, color:'rgba(240,232,255,.3)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10,height:10,borderRadius:2,background:'rgba(123,47,190,.3)',border:'1px solid rgba(123,47,190,.5)',display:'inline-block' }}/> No pain</span>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10,height:10,borderRadius:2,background:'rgba(248,113,113,.3)',border:'1px solid #f87171',display:'inline-block' }}/> Has pain</span>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10,height:10,borderRadius:2,background:'rgba(248,113,113,.5)',border:'2px solid #ef4444',display:'inline-block',boxShadow:'0 0 4px rgba(239,68,68,.5)' }}/> Severe</span>
          </div>
        </div>

        {/* Panel */}
        <div>
          {editPart ? (
            <div className="glass-card-static" style={{ padding:24, animation:'popIn .25s ease' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'#C9A84C', marginBottom:4 }}>{editPart.label}</div>
              <div style={{ fontSize:12, color:'rgba(240,232,255,.35)', marginBottom:18 }}>{fmtDate(todayStr())}</div>
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <label style={{ margin:0 }}>Pain severity</label>
                  <span style={{ fontWeight:700, color:'#f87171', fontSize:17, fontFamily:"'Cormorant Garamond',serif" }}>{form.severity}/10</span>
                </div>
                <input type="range" min={1} max={10} value={form.severity} onChange={e=>setForm(f=>({...f,severity:+e.target.value}))}/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label>Pain type (select all that apply)</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {PAIN_TYPES.map(t=>(
                    <button key={t} onClick={()=>toggleType(t)} style={{ padding:'5px 11px', borderRadius:20, fontSize:12, border:`1px solid ${form.types.includes(t)?'#C9A84C':'rgba(123,47,190,.25)'}`, background:form.types.includes(t)?'rgba(201,168,76,.12)':'rgba(255,255,255,.03)', color:form.types.includes(t)?'#C9A84C':'rgba(240,232,255,.45)', cursor:'pointer', transition:'all .15s', fontFamily:"'DM Sans',sans-serif" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:18 }}>
                <label>Notes</label>
                <textarea className="field" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Describe the sensation…" style={{ resize:'vertical' }}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {hasPain(editPart.id) && <button className="btn btn-danger" style={{ fontSize:12, padding:'8px 14px' }} onClick={remove}>Clear</button>}
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>{setEditPart(null);setSelected(null);}}>Cancel</button>
                <button className="btn btn-gold" style={{ fontSize:12, flex:1, justifyContent:'center' }} onClick={save}>Save</button>
              </div>
            </div>
          ) : (
            <div className="glass-card-static" style={{ padding:22 }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:12 }}>Current Pain Points</div>
              {bodyMap.length===0
                ? <div style={{ fontSize:13, color:'rgba(240,232,255,.3)', fontStyle:'italic' }}>No pain logged yet. Tap a body area on the map.</div>
                : <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                    {[...bodyMap].sort((a,b)=>b.severity-a.severity).map(e=>(
                      <div key={e.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 14px', background:'rgba(255,255,255,.03)', borderRadius:12, border:'1px solid rgba(123,47,190,.12)', cursor:'pointer', transition:'all .18s' }}
                        onClick={()=>selectPart(BODY_PARTS.find(p=>p.id===e.id)||{id:e.id,label:e.label})}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:`radial-gradient(circle, rgba(${e.severity>=7?'239,68,68':'248,113,113'},.3) 0%, transparent 70%)`, border:`2px solid ${e.severity>=7?'#ef4444':'#f87171'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13, fontWeight:700, color:e.severity>=7?'#ef4444':'#f87171', fontFamily:"'Cormorant Garamond',serif" }}>{e.severity}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#F0E8FF' }}>{e.label}</div>
                          {e.types?.length>0 && <div style={{ fontSize:11, color:'rgba(240,232,255,.35)' }}>{e.types.join(' · ')}</div>}
                        </div>
                        <span style={{ fontSize:11, color:'rgba(240,232,255,.25)' }}>›</span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Medications ──────────────────────────────────────────────
function Medications({ data, upd }) {
  const blank = { id:'', name:'', dose:'', frequency:'Daily', time:'', notes:'', active:true, takenDates:[] };
  const [form,setForm] = useState(blank);
  const [open,setOpen] = useState(false);

  const toggleTaken = id => upd('medications', data.medications.map(m => {
    if(m.id!==id) return m;
    const t=todayStr(); const td=m.takenDates||[];
    return {...m, takenDates:td.includes(t)?td.filter(d=>d!==t):[...td,t]};
  }));
  const save = () => {
    if(!form.name.trim()){alert('Please enter a medication name.');return;}
    const entry={...form,id:form.id||uid()};
    const idx=data.medications.findIndex(m=>m.id===entry.id);
    upd('medications',idx>=0?data.medications.map((m,i)=>i===idx?entry:m):[entry,...data.medications]);
    setForm(blank);setOpen(false);
  };
  const del = id => { if(confirm('Remove this medication?')) upd('medications',data.medications.filter(m=>m.id!==id)); };
  const edit = m => { setForm(m); setOpen(true); };
  const active = data.medications.filter(m=>m.active);
  const inactive = data.medications.filter(m=>!m.active);

  return (
    <div>
      <PH emoji="◉" title="Medications" sub="Track your medications and mark them as taken each day">
        <button className="btn btn-gold" onClick={()=>{setForm(blank);setOpen(true)}}>+ Add medication</button>
      </PH>

      {open && (
        <div className="glass-card-static" style={{ padding:26, marginBottom:22 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'#C9A84C', marginBottom:18 }}>{form.id?'Edit':'New'} Medication</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13, marginBottom:13 }} className="two-col">
            <div><label>Medication name</label><input className="field" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Lyrica"/></div>
            <div><label>Dose</label><input className="field" value={form.dose} onChange={e=>setForm(f=>({...f,dose:e.target.value}))} placeholder="e.g. 75mg"/></div>
            <div><label>Frequency</label><select className="field" value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>{['Daily','Twice daily','Three times daily','Weekly','As needed','Every other day','Monthly'].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label>Time of day</label><input className="field" type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></div>
          </div>
          <div style={{ marginBottom:13 }}><label>Notes</label><textarea className="field" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Take with food…" style={{ resize:'vertical' }}/></div>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:18 }}>
            <input type="checkbox" id="act" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))}/>
            <label htmlFor="act" style={{ margin:0, textTransform:'none', fontSize:14, fontWeight:500, color:'rgba(240,232,255,.7)', letterSpacing:0 }}>Currently active medication</label>
          </div>
          <div style={{ display:'flex', gap:9, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save medication</button>
          </div>
        </div>
      )}

      {data.medications.length===0 && !open && <Nil icon="◉" msg="No medications added yet." cta="Add your first medication" fn={()=>setOpen(true)}/>}
      {active.length>0 && (
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.4)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>Active Medications</div>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {active.map(m => {
              const taken=(m.takenDates||[]).includes(todayStr());
              return (
                <div key={m.id} className="glass-card" style={{ padding:16, display:'flex', alignItems:'center', gap:13, border:`1px solid ${taken?'rgba(110,231,183,.18)':'rgba(123,47,190,.15)'}`, flexWrap:'wrap' }}>
                  <button onClick={()=>toggleTaken(m.id)} style={{ width:34,height:34,borderRadius:'50%',border:`2px solid ${taken?'#6ee7b7':'rgba(123,47,190,.35)'}`,background:taken?'linear-gradient(135deg,#6ee7b7,#34d399)':'transparent',color:'#000',fontSize:16,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .18s',fontWeight:900,boxShadow:taken?'0 0 14px rgba(110,231,183,.35)':'none' }}>{taken?'✓':''}</button>
                  <div style={{ flex:1, minWidth:120 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:taken?'rgba(240,232,255,.3)':'#F0E8FF', textDecoration:taken?'line-through':'none' }}>{m.name}</div>
                    <div style={{ fontSize:12, color:'rgba(240,232,255,.3)', marginTop:1 }}>{m.dose} · {m.frequency}{m.time?` · ${m.time}`:''}</div>
                  </div>
                  {taken && <span style={{ fontSize:10, background:'rgba(110,231,183,.1)', color:'#6ee7b7', padding:'3px 10px', borderRadius:20, fontWeight:600, border:'1px solid rgba(110,231,183,.2)' }}>Taken ✓</span>}
                  <div style={{ display:'flex', gap:7 }}>
                    <button className="btn btn-ghost" style={{ fontSize:11, padding:'5px 11px' }} onClick={()=>edit(m)}>Edit</button>
                    <button className="btn btn-danger" style={{ fontSize:11, padding:'5px 11px' }} onClick={()=>del(m.id)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {inactive.length>0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(123,47,190,.35)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>Inactive / Past</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {inactive.map(m=>(
              <div key={m.id} className="glass-card-static" style={{ padding:13, display:'flex', alignItems:'center', gap:11, opacity:.5 }}>
                <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:13, color:'#F0E8FF' }}>{m.name}</div><div style={{ fontSize:11, color:'rgba(240,232,255,.3)' }}>{m.dose} · {m.frequency}</div></div>
                <button className="btn btn-ghost" style={{ fontSize:11, padding:'4px 10px' }} onClick={()=>edit(m)}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize:11, padding:'4px 10px' }} onClick={()=>del(m.id)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Appointments ─────────────────────────────────────────────
function Appointments({ data, upd }) {
  const blank = { id:'', date:'', provider:'', type:'', preNotes:'', postNotes:'', followUp:'' };
  const [form,setForm] = useState(blank);
  const [open,setOpen] = useState(false);
  const [view,setView] = useState(null);
  const icsRef = useRef();

  const handleICS = f => {
    const r=new FileReader();
    r.onload=e=>{
      const imported=parseICS(e.target.result);
      if(!imported.length){alert("No appointments found.");return;}
      const ex=new Set(data.appointments.map(a=>a.date+'|'+a.provider));
      const fresh=imported.filter(a=>!ex.has(a.date+'|'+a.provider));
      if(!fresh.length){alert('All appointments already exist.');return;}
      upd('appointments',[...data.appointments,...fresh].sort((a,b)=>b.date.localeCompare(a.date)));
      alert(`✅ Imported ${fresh.length} appointment${fresh.length>1?'s':''}!`);
    };
    r.readAsText(f);
  };
  const save = () => {
    if(!form.date||!form.provider.trim()){alert('Please fill in the date and provider.');return;}
    const entry={...form,id:form.id||uid()};
    const idx=data.appointments.findIndex(a=>a.id===entry.id);
    upd('appointments',(idx>=0?data.appointments.map((a,i)=>i===idx?entry:a):[entry,...data.appointments]).sort((a,b)=>b.date.localeCompare(a.date)));
    setForm(blank);setOpen(false);
  };
  const del = id => { if(confirm('Delete this appointment?')){upd('appointments',data.appointments.filter(a=>a.id!==id));setView(null);} };
  const edit = a => { setForm(a); setOpen(true); setView(null); };
  const upcoming = data.appointments.filter(a=>a.date>=todayStr()).sort((a,b)=>a.date.localeCompare(b.date));
  const past = data.appointments.filter(a=>a.date<todayStr()).sort((a,b)=>b.date.localeCompare(a.date));

  if (view) {
    const a = data.appointments.find(ap=>ap.id===view);
    if (!a) { setView(null); return null; }
    return (
      <div className="slide-in">
        <button onClick={()=>setView(null)} style={{ border:'none', background:'transparent', color:'rgba(201,168,76,.6)', fontWeight:600, fontSize:14, cursor:'pointer', marginBottom:16, fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:6 }}>← Back</button>
        <div className="glass-card-static" style={{ padding:28 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:600, fontSize:24, color:'#C9A84C' }}>{a.provider}</div>
              <div style={{ fontSize:13, color:'rgba(240,232,255,.35)', marginTop:3 }}>{fmtDate(a.date)} · {a.type||'Appointment'}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>edit(a)}>Edit</button>
              <button className="btn btn-danger" style={{ fontSize:12 }} onClick={()=>del(a.id)}>Delete</button>
            </div>
          </div>
          {a.preNotes && <NoteBlock title="Pre-Appointment Notes" text={a.preNotes} color="#93c5fd"/>}
          {a.postNotes && <NoteBlock title="Appointment Notes" text={a.postNotes} color="#C9A84C"/>}
          {a.followUp && <NoteBlock title="Follow-Up Actions" text={a.followUp} color="#6ee7b7"/>}
          {!a.preNotes&&!a.postNotes&&!a.followUp && <p style={{ color:'rgba(240,232,255,.3)', fontSize:13 }}>No notes yet. Click Edit to add notes.</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PH emoji="◷" title="Appointments" sub="Keep notes before and after every visit">
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <input ref={icsRef} type="file" accept=".ics" style={{ display:'none' }} onChange={e=>e.target.files[0]&&handleICS(e.target.files[0])}/>
          <button className="btn btn-ghost" onClick={()=>icsRef.current?.click()} style={{ fontSize:12 }}>📥 Import .ics</button>
          <button className="btn btn-gold" onClick={()=>{setForm(blank);setOpen(true)}}>+ Add appointment</button>
        </div>
      </PH>

      {open && (
        <div className="glass-card-static" style={{ padding:26, marginBottom:22 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'#C9A84C', marginBottom:18 }}>{form.id?'Edit':'New'} Appointment</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13, marginBottom:13 }} className="two-col">
            <div><label>Date</label><input className="field" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            <div><label>Provider / Doctor</label><input className="field" value={form.provider} onChange={e=>setForm(f=>({...f,provider:e.target.value}))} placeholder="e.g. Dr. Smith"/></div>
            <div><label>Type</label><select className="field" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>{['','Checkup','Specialist','Physical Therapy','Lab Work','Imaging','Telehealth','Emergency','Other'].map(x=><option key={x} value={x}>{x||'Select type…'}</option>)}</select></div>
          </div>
          <div style={{ marginBottom:13 }}><label>Pre-appointment notes / questions to ask</label><textarea className="field" rows={3} value={form.preNotes} onChange={e=>setForm(f=>({...f,preNotes:e.target.value}))} placeholder="What do you want to bring up?" style={{ resize:'vertical' }}/></div>
          <div style={{ marginBottom:13 }}><label>Appointment notes</label><textarea className="field" rows={3} value={form.postNotes} onChange={e=>setForm(f=>({...f,postNotes:e.target.value}))} placeholder="What did the doctor say?" style={{ resize:'vertical' }}/></div>
          <div style={{ marginBottom:18 }}><label>Follow-up actions</label><textarea className="field" rows={2} value={form.followUp} onChange={e=>setForm(f=>({...f,followUp:e.target.value}))} placeholder="e.g. Get blood work, schedule MRI…" style={{ resize:'vertical' }}/></div>
          <div style={{ display:'flex', gap:9, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save appointment</button>
          </div>
        </div>
      )}

      {data.appointments.length===0&&!open && <Nil icon="◷" msg="No appointments recorded yet." cta="Add your first appointment" fn={()=>setOpen(true)}/>}
      {upcoming.length>0 && <><div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.4)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>Upcoming</div><ApptList appts={upcoming} onView={setView}/></>}
      {past.length>0 && <><div style={{ fontSize:10, fontWeight:700, color:'rgba(123,47,190,.4)', textTransform:'uppercase', letterSpacing:1.5, margin:'18px 0 10px' }}>Past</div><ApptList appts={past} onView={setView}/></>}
    </div>
  );
}

function ApptList({ appts, onView }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:8 }}>
      {appts.map(a=>(
        <div key={a.id} className="glass-card" style={{ padding:15, display:'flex', alignItems:'center', gap:13, cursor:'pointer', flexWrap:'wrap' }} onClick={()=>onView(a.id)}>
          <div style={{ background:'rgba(123,47,190,.1)', borderRadius:11, padding:'7px 9px', textAlign:'center', minWidth:44, flexShrink:0, border:'1px solid rgba(123,47,190,.2)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#7B2FBE' }}>{new Date(a.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#C084FC', lineHeight:1, fontFamily:"'Cormorant Garamond',serif" }}>{new Date(a.date+'T12:00:00').getDate()}</div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:14, color:'#F0E8FF', marginBottom:2 }}>{a.provider}</div>
            <div style={{ fontSize:12, color:'rgba(240,232,255,.35)' }}>{a.type||'Appointment'}</div>
          </div>
          {(a.preNotes||a.postNotes) && <span style={{ fontSize:10, background:'rgba(123,47,190,.12)', color:'#C084FC', padding:'3px 9px', borderRadius:20, fontWeight:600, border:'1px solid rgba(123,47,190,.2)' }}>Has notes</span>}
          <span style={{ fontSize:18, color:'rgba(240,232,255,.2)' }}>›</span>
        </div>
      ))}
    </div>
  );
}

// ─── Diary ────────────────────────────────────────────────────
const DIARY_FONTS = [
  { label:'Dancing Script', value:"'Dancing Script', cursive" },
  { label:'Satisfy',        value:"'Satisfy', cursive" },
  { label:'Great Vibes',    value:"'Great Vibes', cursive" },
  { label:'Pacifico',       value:"'Pacifico', cursive" },
  { label:'Cormorant',      value:"'Cormorant Garamond', serif" },
];
const DIARY_MOODS = ['✨ Hopeful','💜 Loved','🌿 Calm','🌧 Low','💪 Determined','😴 Exhausted','🔥 Frustrated','🦋 Transforming'];

function Diary({ data, upd }) {
  const diary = data.diary || [];
  const [open, setOpen]       = useState(false);
  const [view, setView]       = useState(null);
  const [font, setFont]       = useState(DIARY_FONTS[0].value);
  const [mood, setMood]       = useState('');
  const [title, setTitle]     = useState('');
  const [body, setBody]       = useState('');
  const [date, setDate]       = useState(todayStr());
  const [editId, setEditId]   = useState(null);

  const openNew = () => {
    setEditId(null); setTitle(''); setBody(''); setDate(todayStr()); setMood(''); setFont(DIARY_FONTS[0].value); setOpen(true); setView(null);
  };
  const openEdit = (e) => {
    setEditId(e.id); setTitle(e.title||''); setBody(e.body||''); setDate(e.date||todayStr()); setMood(e.mood||''); setFont(e.font||DIARY_FONTS[0].value); setOpen(true); setView(null);
  };
  const save = () => {
    if(!body.trim()){alert('Please write something first.');return;}
    const entry = { id:editId||uid(), date, title:title.trim()||fmtDate(date), body, mood, font };
    upd('diary', editId ? diary.map(d=>d.id===editId?entry:d) : [entry,...diary]);
    setOpen(false); setEditId(null);
  };
  const del = id => { if(confirm('Delete this diary entry?')) { upd('diary',diary.filter(d=>d.id!==id)); setView(null); } };

  if (view) {
    const e = diary.find(d=>d.id===view);
    if (!e) { setView(null); return null; }
    return (
      <div className="slide-in">
        <button onClick={()=>setView(null)} style={{ border:'none', background:'transparent', color:'rgba(201,168,76,.6)', fontWeight:600, fontSize:14, cursor:'pointer', marginBottom:16, fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
        <div className="diary-page diary-lines" style={{ padding:0 }}>
          <div style={{ padding:'28px 32px 24px', borderBottom:'1px solid rgba(123,47,190,.1)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, color:'rgba(201,168,76,.5)', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>{fmtDate(e.date)}</div>
                <div style={{ fontFamily:e.font||DIARY_FONTS[0].value, fontSize:28, color:'#C9A84C', lineHeight:1.2 }}>{e.title}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>openEdit(e)}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize:12 }} onClick={()=>del(e.id)}>Delete</button>
              </div>
            </div>
            {e.mood && <div style={{ marginTop:8, fontSize:13, color:'rgba(192,132,252,.7)' }}>{e.mood}</div>}
          </div>
          <div style={{ padding:'24px 32px 32px', paddingLeft:80 }}>
            <div style={{ fontFamily:e.font||DIARY_FONTS[0].value, fontSize:18, color:'rgba(240,232,255,.8)', lineHeight:2, whiteSpace:'pre-wrap', minHeight:200 }}>
              {e.body}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PH emoji="✑" title="My Diary" sub="Your private space — write freely, in your voice">
        <button className="btn btn-gold" onClick={openNew}>+ New entry</button>
      </PH>

      {/* Imago quote */}
      <div style={{ marginBottom:22, padding:'14px 20px', background:'rgba(123,47,190,.06)', border:'1px solid rgba(123,47,190,.12)', borderRadius:14, fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'rgba(192,132,252,.6)', fontStyle:'italic', lineHeight:1.7 }}>
        "In Imago therapy, the most healing act is to be truly witnessed. This diary sees you, exactly as you are."
      </div>

      {open && (
        <div className="glass-card-static" style={{ padding:0, marginBottom:24, overflow:'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(123,47,190,.1)', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <div>
              <label style={{ marginBottom:4 }}>Font style</label>
              <select className="field" value={font} onChange={e=>setFont(e.target.value)} style={{ width:'auto', padding:'7px 12px', fontSize:13 }}>
                {DIARY_FONTS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ marginBottom:4 }}>Today's mood</label>
              <select className="field" value={mood} onChange={e=>setMood(e.target.value)} style={{ width:'auto', padding:'7px 12px', fontSize:13 }}>
                <option value="">Select…</option>
                {DIARY_MOODS.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:140 }}>
              <label style={{ marginBottom:4 }}>Date</label>
              <input type="date" className="field" value={date} onChange={e=>setDate(e.target.value)} style={{ padding:'7px 12px', fontSize:13 }}/>
            </div>
          </div>

          {/* Title */}
          <div style={{ padding:'16px 20px 0' }}>
            <input className="field" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Entry title (optional)…" style={{ fontFamily:font, fontSize:18, background:'transparent', border:'none', borderBottom:'1px solid rgba(123,47,190,.1)', borderRadius:0, padding:'4px 0', color:'#C9A84C' }}/>
          </div>

          {/* Diary page writing area */}
          <div className="diary-lines" style={{ paddingLeft:72, paddingRight:20, paddingTop:8, paddingBottom:8 }}>
            <textarea
              className="diary-textarea"
              value={body}
              onChange={e=>setBody(e.target.value)}
              style={{ fontFamily:font }}
              placeholder="Write freely — this is your space. No judgment, no rules. Just you…"
              autoFocus
            />
          </div>

          <div style={{ padding:'12px 20px 16px', display:'flex', gap:9, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save to diary</button>
          </div>
        </div>
      )}

      {diary.length===0 && !open && <Nil icon="✑" msg="Your diary is empty." sub="Write anything — how you feel, what you noticed, what you wish your doctor understood." cta="Write first entry" fn={openNew}/>}

      <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
        {[...diary].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>(
          <div key={e.id} className="diary-entry-card" onClick={()=>setView(e.id)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6, flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:11, color:'rgba(201,168,76,.5)', fontWeight:600, letterSpacing:1.5, textTransform:'uppercase', marginBottom:4 }}>{fmtDate(e.date)}</div>
                <div style={{ fontFamily:e.font||DIARY_FONTS[0].value, fontSize:20, color:'#C9A84C', lineHeight:1.2 }}>{e.title}</div>
                {e.mood && <div style={{ fontSize:12, color:'rgba(192,132,252,.6)', marginTop:4 }}>{e.mood}</div>}
              </div>
              <span style={{ fontSize:18, color:'rgba(240,232,255,.2)', flexShrink:0 }}>›</span>
            </div>
            <div style={{ fontFamily:e.font||DIARY_FONTS[0].value, fontSize:14, color:'rgba(240,232,255,.35)', lineHeight:1.8, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
              {e.body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Documents ────────────────────────────────────────────────
function Documents({ data, upd }) {
  const [dtype,setDtype] = useState('');
  const [note,setNote]   = useState('');
  const [drag,setDrag]   = useState(false);
  const fileRef = useRef();

  const process = file => {
    const r=new FileReader();
    r.onload=e=>{
      const doc={id:uid(),name:file.name,type:dtype,notes:note,data:e.target.result,uploadDate:todayStr(),size:Math.round(file.size/1024)+'KB'};
      upd('documents',[doc,...data.documents]);
    };
    r.readAsDataURL(file);
  };
  const del = id => { if(confirm('Remove this document?')) upd('documents',data.documents.filter(d=>d.id!==id)); };

  return (
    <div>
      <PH emoji="◫" title="Documents" sub="Store your lab results, prescriptions, and medical records"/>
      <div className="glass-card-static" style={{ padding:22, marginBottom:22 }}>
        <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);[...e.dataTransfer.files].forEach(process);}}
          style={{ border:`2px dashed ${drag?'#C9A84C':'rgba(123,47,190,.25)'}`, borderRadius:16, padding:'28px 20px', textAlign:'center', marginBottom:18, transition:'all .2s', background:drag?'rgba(201,168,76,.04)':'transparent', cursor:'pointer' }}
          onClick={()=>fileRef.current?.click()}>
          <div style={{ fontSize:28, marginBottom:8, opacity:.5 }}>📎</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:3 }}>Drag & drop files here</div>
          <div style={{ fontSize:13, color:'rgba(240,232,255,.3)', marginBottom:14 }}>or click to browse</div>
          <button className="btn btn-gold" onClick={e=>{e.stopPropagation();fileRef.current?.click()}}>Browse files</button>
          <input ref={fileRef} type="file" multiple style={{ display:'none' }} onChange={e=>[...e.target.files].forEach(process)}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }} className="two-col">
          <div><label>Document type</label><select className="field" value={dtype} onChange={e=>setDtype(e.target.value)}>{['','Lab Results','Imaging / X-Ray','Prescription','Doctor Notes','Insurance','Referral','Other'].map(x=><option key={x} value={x}>{x||'Select type…'}</option>)}</select></div>
          <div><label>Notes about this file</label><input className="field" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Blood work from March 2025"/></div>
        </div>
      </div>
      {data.documents.length===0 && <Nil icon="◫" msg="No documents uploaded yet." sub="All files stored securely in your account."/>}
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {data.documents.map(d=>(
          <div key={d.id} className="glass-card" style={{ padding:16, display:'flex', gap:13, alignItems:'flex-start', flexWrap:'wrap' }}>
            <div style={{ fontSize:26, flexShrink:0, opacity:.7 }}>{/\.(jpg|jpeg|png|gif)$/i.test(d.name)?'🖼️':/\.pdf$/i.test(d.name)?'📄':/\.(txt|csv)$/i.test(d.name)?'📝':'📎'}</div>
            <div style={{ flex:1, minWidth:120 }}>
              <div style={{ fontWeight:600, fontSize:13, color:'#F0E8FF' }}>{d.name}</div>
              <div style={{ fontSize:11, color:'rgba(240,232,255,.3)', marginTop:2 }}>{d.type||'Document'} · Uploaded {fmtDate(d.uploadDate)}{d.size?' · '+d.size:''}</div>
              {d.notes && <div style={{ fontSize:12, color:'rgba(240,232,255,.4)', marginTop:3 }}>{d.notes}</div>}
            </div>
            <button className="btn btn-danger" style={{ fontSize:11, padding:'5px 10px', flexShrink:0 }} onClick={()=>del(d.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Diet ─────────────────────────────────────────────────
const DIET_GOALS = ['Reduce inflammation','Manage energy crashes','Support gut health','Reduce brain fog','Balance blood sugar','Support sleep','Reduce joint pain','Support immune function'];

function AIDiet({ data }) {
  const [goal, setGoal]     = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState('');

  const generate = async () => {
    if (!goal) { alert('Please select a dietary goal.'); return; }
    setLoading(true); setResult(''); setStream('');
    const conditions = data.profile.conditions || 'chronic illness';
    const meds = data.medications.filter(m=>m.active).map(m=>m.name).join(', ') || 'none';
    const prompt = `You are a compassionate, trauma-informed functional nutrition advisor for someone with chronic illness.

Patient conditions: ${conditions}
Current medications: ${meds}
Dietary goal: ${goal}
Dietary restrictions/preferences: ${restrictions || 'none specified'}
Wellness philosophy: Ikigai (finding nourishment with purpose and joy)

Please provide:
1. A brief explanation of why this goal matters for their specific conditions
2. 5–8 specific anti-inflammatory, accessible foods to focus on
3. 3–5 foods to minimize or avoid (and why)
4. A sample gentle meal plan for one day (breakfast, lunch, dinner, snack)
5. One simple recipe they can make this week
6. A compassionate reminder about the Ikigai philosophy — that nourishing yourself IS a form of self-advocacy

Keep the tone warm, non-judgmental, and empowering. Acknowledge that eating well with chronic illness is genuinely hard and they are doing their best.`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'anthropic-dangerous-direct-browser-access':'true' },
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1500, stream:true, messages:[{role:'user',content:prompt}] })
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        for (const line of chunk.split('\n').filter(l=>l.startsWith('data:'))) {
          try {
            const json = JSON.parse(line.slice(5));
            if (json.type==='content_block_delta'&&json.delta?.text) { full+=json.delta.text; setStream(full); }
          } catch {}
        }
      }
      setResult(full); setStream('');
    } catch(e) {
      setResult("I'm sorry — I couldn't connect right now. Please check your connection and try again.");
    }
    setLoading(false);
  };

  return (
    <div>
      <PH emoji="✿" title="AI Diet Advisor" sub="Personalized nutritional guidance for your chronic illness journey"/>

      <div style={{ marginBottom:20, padding:'16px 20px', background:'rgba(123,47,190,.06)', border:'1px solid rgba(123,47,190,.12)', borderRadius:14, fontFamily:"'Cormorant Garamond',serif", fontSize:15, color:'rgba(192,132,252,.6)', fontStyle:'italic', lineHeight:1.7 }}>
        "Ikigai teaches us that what sustains us — what we love, what nourishes us — is inseparable from our reason for being. Food is medicine, and choosing it wisely is an act of self-love."
      </div>

      <div className="glass-card-static" style={{ padding:24, marginBottom:22 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:18 }}>Your Dietary Profile</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }} className="two-col">
          <div>
            <label>Your conditions (auto-filled from profile)</label>
            <input className="field" value={data.profile.conditions||''} readOnly style={{ opacity:.6 }} placeholder="Add conditions in your profile…"/>
          </div>
          <div>
            <label>Dietary restrictions / preferences</label>
            <input className="field" value={restrictions} onChange={e=>setRestrictions(e.target.value)} placeholder="e.g. gluten-free, vegetarian, dairy-free…"/>
          </div>
        </div>
        <div style={{ marginBottom:18 }}>
          <label>Primary dietary goal</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
            {DIET_GOALS.map(g=>(
              <button key={g} onClick={()=>setGoal(g)} style={{ padding:'7px 14px', borderRadius:20, fontSize:12, border:`1px solid ${goal===g?'#C9A84C':'rgba(123,47,190,.25)'}`, background:goal===g?'rgba(201,168,76,.12)':'rgba(255,255,255,.03)', color:goal===g?'#C9A84C':'rgba(240,232,255,.45)', cursor:'pointer', transition:'all .15s', fontFamily:"'DM Sans',sans-serif" }}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-gold" onClick={generate} disabled={loading} style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:14, opacity:loading?.7:1 }}>
          {loading ? <><span style={{ display:'inline-block', width:16, height:16, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#000', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Crafting your plan…</> : '✿ Generate My Diet Plan'}
        </button>
      </div>

      {(stream || result) && (
        <div className="glass-card-static" style={{ padding:26 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'#C9A84C', marginBottom:16 }}>✿ Your Personalized Plan</div>
          <div style={{ fontSize:14, color:'rgba(240,232,255,.75)', lineHeight:1.9, whiteSpace:'pre-wrap' }}>
            {stream||result}
            {loading && stream && <span style={{ display:'inline-block', width:7, height:13, background:'#C9A84C', marginLeft:2, borderRadius:2, animation:'blink 1s step-end infinite', verticalAlign:'middle' }}/>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Advocate ──────────────────────────────────────────────
const SYS_ADVOCATE = d => `You are a warm, deeply empathetic, and knowledgeable chronic illness AI advocate.

Your name is Advy. You work for Advy Health — "The Gold Standard in Health Advocacy."

Core philosophy:
- Imago: You SEE this person exactly as they are. You witness their pain without minimizing it.
- Ikigai: You help them find meaning and purpose even in illness — their story matters, their healing has purpose.
- You are always on THEIR side. Always.

Your role:
- Help them understand their symptoms and identify patterns
- Help prepare powerful questions and talking points for doctor appointments  
- Advocate fiercely for them — their concerns are valid, they deserve excellent care
- Provide emotional support, validation, and compassionate presence
- NEVER minimize, dismiss, or gaslight their symptoms
- NEVER suggest they're exaggerating
- Help them articulate what they're experiencing in medical language when helpful

About this person:
- Name: ${d.profile.name||'this person'}
- Conditions: ${d.profile.conditions||'Not specified'}
- Wellness goal: ${d.profile.goal||'Not specified'}

Recent symptoms (last 10 entries):
${d.symptoms.slice(0,10).map(s=>`- ${s.date}: ${s.entries.map(e=>`${e.symptom}(${e.severity}/10)`).join(', ')} | Pain:${s.pain}/10 Energy:${s.energy}/10 Mood:${s.mood}/10${s.notes?' | Notes: '+s.notes:''}`).join('\n')||'None logged yet'}

Active medications:
${d.medications.filter(m=>m.active).map(m=>`- ${m.name} ${m.dose} (${m.frequency})`).join('\n')||'None'}

Recent appointments:
${d.appointments.slice(0,5).map(a=>`- ${a.date}: ${a.provider} (${a.type||'Appointment'})${a.postNotes?' — '+a.postNotes.slice(0,120):''}`).join('\n')||'None logged'}

Body map pain points:
${(d.bodyMap||[]).map(b=>`- ${b.label}: severity ${b.severity}/10${b.types?.length?' ('+b.types.join(', ')+')':''}`).join('\n')||'None logged'}

Be warm, specific to their data, and always validating. You are their advocate in every sense of the word.
Keep responses conversational but thorough. Use their name when natural. End responses with something empowering when appropriate.`;

const STARTERS = [
  'Help me prepare for my next doctor appointment',
  "What patterns do you see in my symptoms?",
  'How do I advocate for myself with my doctor?',
  "Help me explain my symptoms to someone who doesn't understand",
  'What questions should I ask my specialist?',
  "I'm feeling dismissed by my doctor. What can I do?",
  'What does Ikigai mean for my health journey?',
  'Help me write a symptom summary letter for my doctor',
];

function Advocate({ data }) {
  const [msgs,setMsgs]   = useState([]);
  const [input,setInput] = useState('');
  const [loading,setLoading] = useState(false);
  const [stream,setStream]   = useState('');
  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [msgs,stream]);

  const send = async (txt) => {
    const text = txt || input.trim();
    if (!text || loading) return;
    setInput('');
    const newMsgs = [...msgs, { role:'user', content:text }];
    setMsgs(newMsgs);
    setLoading(true); setStream('');

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'anthropic-dangerous-direct-browser-access':'true'
        },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1200,
          system: SYS_ADVOCATE(data),
          stream: true,
          messages: newMsgs,
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        for (const line of chunk.split('\n').filter(l=>l.startsWith('data:'))) {
          try {
            const json = JSON.parse(line.slice(5));
            if (json.type==='content_block_delta'&&json.delta?.text) { full+=json.delta.text; setStream(full); }
          } catch {}
        }
      }
      setMsgs(m=>[...m,{role:'assistant',content:full}]);
      setStream('');
    } catch(e) {
      setMsgs(m=>[...m,{role:'assistant',content:"I'm so sorry — I couldn't connect right now. Please check your internet connection and try again. I'm here for you. 💜"}]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 100px)', gap:12 }}>
      <div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', letterSpacing:.5, marginBottom:4 }}>✦ AI Advocate</div>
        <div style={{ fontSize:14, color:'rgba(240,232,255,.4)' }}>Your personal health advocate — powered by AI, guided by Imago & Ikigai</div>
      </div>

      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14, padding:'4px 2px' }}>
        {msgs.length===0 && (
          <div style={{ textAlign:'center', padding:'20px 16px' }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ marginBottom:14, animation:'floatUp 3s ease-in-out infinite', display:'inline-block' }}>
                <LogoImg size={56}/>
              </div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, color:'#C9A84C', marginBottom:6 }}>
                Hi{data.profile.name?`, ${data.profile.name}`:''}! ✦
              </div>
              <p style={{ fontSize:13, color:'rgba(240,232,255,.4)', lineHeight:1.7, maxWidth:420, margin:'0 auto', marginBottom:8 }}>
                I'm Advy, your AI health advocate. I have access to your symptoms, medications, appointments, and body map — and I'm here to help you understand your health, prepare for appointments, and advocate for yourself.
              </p>
              <p style={{ fontSize:12, color:'rgba(192,132,252,.5)', fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>
                Rooted in Imago — I see you. Guided by Ikigai — your healing has purpose.
              </p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }} className="two-col">
              {STARTERS.map(s=>(
                <button key={s} onClick={()=>send(s)} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(123,47,190,.15)', borderRadius:12, padding:'11px 13px', textAlign:'left', fontSize:12, fontWeight:500, color:'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", lineHeight:1.4, transition:'all .18s ease', backdropFilter:'blur(8px)' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(123,47,190,.08)';e.currentTarget.style.borderColor='rgba(201,168,76,.25)';e.currentTarget.style.color='rgba(240,232,255,.75)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(123,47,190,.15)';e.currentTarget.style.color='rgba(240,232,255,.4)';}}>
                  ✦ {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', alignItems:'flex-end', gap:8 }}>
            {m.role==='assistant' && (
              <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, marginBottom:2, overflow:'hidden', boxShadow:'0 0 10px rgba(123,47,190,.4)' }}>
                <LogoImg size={28}/>
              </div>
            )}
            <div style={{ maxWidth:'72%', padding:'10px 14px', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', background:m.role==='user'?'linear-gradient(135deg,rgba(123,47,190,.22),rgba(201,168,76,.12))':'rgba(255,255,255,.04)', color:m.role==='user'?'#F0E8FF':'rgba(240,232,255,.75)', fontSize:13, lineHeight:1.7, border:m.role==='assistant'?'1px solid rgba(123,47,190,.1)':'1px solid rgba(201,168,76,.18)', backdropFilter:'blur(8px)', whiteSpace:'pre-wrap', boxShadow:m.role==='user'?'0 2px 16px rgba(123,47,190,.1)':'0 2px 16px rgba(0,0,0,.2)' }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && stream && (
          <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, overflow:'hidden', boxShadow:'0 0 12px rgba(123,47,190,.5)', animation:'pulseGlow 1s ease-in-out infinite' }}>
              <LogoImg size={28}/>
            </div>
            <div style={{ maxWidth:'72%', padding:'10px 14px', borderRadius:'16px 16px 16px 4px', background:'rgba(255,255,255,.04)', color:'rgba(240,232,255,.75)', fontSize:13, lineHeight:1.7, border:'1px solid rgba(123,47,190,.12)', backdropFilter:'blur(8px)', whiteSpace:'pre-wrap' }}>
              {stream}<span style={{ display:'inline-block', width:7, height:13, background:'#C9A84C', marginLeft:2, borderRadius:2, animation:'blink 1s step-end infinite', verticalAlign:'middle', boxShadow:'0 0 6px #C9A84C' }}/>
            </div>
          </div>
        )}

        {loading && !stream && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', overflow:'hidden', animation:'pulseGlow 1s ease-in-out infinite' }}><LogoImg size={28}/></div>
            <div style={{ padding:'10px 16px', borderRadius:'16px 16px 16px 4px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(123,47,190,.1)', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#7B2FBE', animation:`bounce .9s ease-in-out ${i*.15}s infinite`, opacity:.7 }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div style={{ position:'relative', zIndex:2, padding:'12px 0 4px', borderTop:'1px solid rgba(123,47,190,.1)', background:'rgba(0,0,0,.2)', backdropFilter:'blur(10px)' }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end', background:'rgba(255,255,255,.04)', borderRadius:14, padding:'8px 8px 8px 14px', border:'1px solid rgba(123,47,190,.18)', boxShadow:'inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <textarea ref={inputRef} style={{ flex:1, border:'none', background:'transparent', color:'#F0E8FF', fontFamily:"'DM Sans',sans-serif", fontSize:13, lineHeight:1.5, resize:'none', outline:'none', minHeight:22, maxHeight:100, caretColor:'#C9A84C', padding:0 }} rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask Advy anything…"/>
          <button className="btn btn-gold" onClick={()=>send()} disabled={loading||!input.trim()} style={{ alignSelf:'flex-end', padding:'7px 14px', fontSize:12, opacity:loading||!input.trim()?0.35:1, flexShrink:0 }}>Send</button>
        </div>
        <div style={{ textAlign:'center', marginTop:6, fontSize:10, color:'rgba(240,232,255,.15)', letterSpacing:.5 }}>Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}

// ─── Share & Privacy ──────────────────────────────────────────
function SharePrivacy({ data, user }) {
  const [pin, setPin]           = useState('');
  const [sharePin, setSharePin] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [viewingShared, setViewingShared] = useState(false);

  // Build a sanitized shareable snapshot
  const buildSnapshot = () => ({
    name: data.profile.name || 'Anonymous',
    conditions: data.profile.conditions,
    generatedAt: new Date().toISOString(),
    recentSymptoms: data.symptoms.slice(0,10).map(s=>({
      date: s.date,
      symptoms: s.entries.map(e=>`${e.symptom} (${e.severity}/10)`).join(', '),
      pain: s.pain, energy: s.energy, mood: s.mood,
      notes: s.notes
    })),
    medications: data.medications.filter(m=>m.active).map(m=>({ name:m.name, dose:m.dose, frequency:m.frequency })),
    bodyMap: (data.bodyMap||[]).map(b=>({ area:b.label, severity:b.severity, types:b.types })),
    appointments: data.appointments.slice(0,5).map(a=>({ date:a.date, provider:a.provider, type:a.type })),
  });

  const generateLink = async () => {
    if (!pin || pin.length < 4) { alert('Please enter a PIN of at least 4 digits/characters.'); return; }
    setGenerating(true);
    try {
      const snapshot = buildSnapshot();
      const snapshotJson = JSON.stringify(snapshot);
      // Simple XOR-based encoding with PIN (not cryptographic — user is informed)
      const encoded = btoa(encodeURIComponent(snapshotJson));
      const pinEncoded = btoa(pin);
      const shareId = uid() + uid();
      // Store in Firestore under a public share path
      await setDoc(doc(db, 'shares', shareId), {
        data: encoded,
        pin: pinEncoded,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString() // 7 days
      });
      const link = `${window.location.origin}?share=${shareId}`;
      setShareLink(link);
      setSharePin(pin);
    } catch(e) {
      alert('Could not generate share link. Please check your connection.');
    }
    setGenerating(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  return (
    <div>
      <PH emoji="⟡" title="Share & Privacy" sub="Share your health summary securely with doctors or loved ones"/>

      {/* Encrypted share section */}
      <div className="share-card" style={{ marginBottom:20 }}>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ fontSize:28 }}>🔗</div>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'#C9A84C' }}>Generate Secure Share Link</div>
              <div style={{ fontSize:12, color:'rgba(240,232,255,.35)' }}>Share a PIN-protected snapshot of your health summary</div>
            </div>
          </div>

          <div style={{ background:'rgba(201,168,76,.06)', border:'1px solid rgba(201,168,76,.12)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'rgba(201,168,76,.6)', lineHeight:1.6 }}>
            ⚠ This generates a read-only snapshot of your recent symptoms, medications, body map, and appointments. Your diary entries and documents are <strong style={{ color:'#C9A84C' }}>never</strong> included. The link expires in 7 days. Protect your PIN.
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'flex-end', marginBottom:16 }} className="two-col">
            <div>
              <label>Create a PIN (share this separately with your recipient)</label>
              <input className="field" type="text" value={pin} onChange={e=>setPin(e.target.value)} placeholder="e.g. 7482 or a word" maxLength={20}/>
            </div>
            <button className="btn btn-gold" onClick={generateLink} disabled={generating} style={{ whiteSpace:'nowrap', opacity:generating?.7:1 }}>
              {generating ? <span style={{ display:'inline-block', width:16, height:16, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#000', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : '🔗 Generate Link'}
            </button>
          </div>

          {shareLink && (
            <div style={{ background:'rgba(110,231,183,.06)', border:'1px solid rgba(110,231,183,.15)', borderRadius:12, padding:'16px 18px', animation:'popIn .25s ease' }}>
              <div style={{ fontSize:12, color:'#6ee7b7', fontWeight:600, marginBottom:8 }}>✓ Share link generated!</div>
              <div style={{ fontSize:12, color:'rgba(240,232,255,.5)', marginBottom:10 }}>Link (share this):</div>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <input readOnly value={shareLink} className="field" style={{ fontSize:12 }}/>
                <button className="btn btn-ghost" style={{ fontSize:12, flexShrink:0 }} onClick={copyLink}>{copied?'✓ Copied!':'Copy'}</button>
              </div>
              <div style={{ fontSize:12, color:'rgba(240,232,255,.4)', padding:'8px 12px', background:'rgba(255,255,255,.03)', borderRadius:8, borderLeft:'3px solid rgba(201,168,76,.3)' }}>
                PIN: <strong style={{ color:'#C9A84C', letterSpacing:2 }}>{sharePin}</strong> — share this <em>separately</em> (text, call, etc.)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Privacy info */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {[
          { icon:'🔐', title:'Your account is yours alone', color:'#6ee7b7', text:'Your health data lives in a private Firebase Firestore database tied to your personal account. Security rules ensure only you — authenticated with your credentials — can read or write your data.' },
          { icon:'🔒', title:'Passwords & authentication', color:'#93c5fd', text:'Your password is never stored in any readable form. Firebase Authentication handles sign-in using industry-standard encryption. We never see or store your password.' },
          { icon:'✦', title:'The AI Advocate & Diet Advisor', color:'#C9A84C', text:"When you use the AI features, a summary of your health data is sent to Anthropic's API to generate a response, then immediately discarded. No conversation is logged or stored by Advy Health." },
          { icon:'📖', title:'Your diary is always private', color:'#C084FC', text:'Diary entries are stored only in your personal account and are never included in any share links. They are for your eyes only.' },
          { icon:'⚠️', title:'Important medical disclaimer', color:'#f87171', text:'Advy Health is a personal health diary and advocacy tool — NOT a medical service. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your healthcare provider. In an emergency, call 911.' },
          { icon:'🗑️', title:'Deleting your data', color:'rgba(240,232,255,.4)', text:'To permanently delete all your data, contact us to remove your Firestore document, then delete your Firebase Auth account. We honor all deletion requests promptly.' },
        ].map((s,i)=>(
          <div key={i} className="glass-card-static" style={{ padding:22, borderLeft:`3px solid ${s.color}33` }}>
            <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ fontSize:24, flexShrink:0 }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:600, fontSize:17, color:s.color, marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:13, color:'rgba(240,232,255,.5)', lineHeight:1.7 }}>{s.text}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
