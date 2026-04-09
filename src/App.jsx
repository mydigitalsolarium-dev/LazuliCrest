import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  uid, todayStr, fmtDate, greet, getDailyMessage,
  getProactiveGreeting,
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

const ILLNESS_TYPES = [
  'Cold / Flu','Respiratory infection','UTI','Sinus infection',
  'GI infection','Skin infection','Ear infection','Other infection',
];

const APPOINTMENT_TYPES = [
  'Checkup / Follow-up','Specialist Consultation','Physical Therapy',
  'Lab Work / Blood Draw','Imaging (MRI/CT/X-Ray)','Ultrasound',
  'Colonoscopy / Endoscopy','Biopsy','Minor Procedure',
  'Surgery / Pre-op','Surgery / Post-op','Infusion / IV Therapy',
  'Injection / Shot','Telehealth','Emergency / Urgent Care','Other',
];

const PHYSICIAN_TYPES = [
  'Primary Care Physician (PCP)','Rheumatologist','Neurologist','Gastroenterologist',
  'Cardiologist','Endocrinologist','Immunologist / Allergist','Hematologist','Oncologist',
  'Gynecologist / OB-GYN','Urologist','Dermatologist','Pulmonologist','Nephrologist',
  'Orthopedist','Pain Management Specialist','Psychiatrist / Psychologist',
  'Physical Therapist','Occupational Therapist','Nutritionist / Dietitian',
  'Infusion Nurse','Surgeon','Custom…',
];

const NAV = [
  { id:'dashboard',    icon:'🏠',  label:'Home'              },
  { id:'updates',      icon:'✦',   label:"What's New"        },
  { id:'profile',      icon:'◈',   label:'My Profile'        },
  { id:'symptoms',     icon:'◈',   label:'Symptoms'          },
  { id:'bodymap',      icon:'👤',  label:'Body Map'          },
  { id:'brain',        icon:'🧠',  label:'The Brain'         },
  { id:'medications',  icon:'◉',   label:'Medications'       },
  { id:'appointments', icon:'🗓',  label:'Appointments'      },
  { id:'infusion',     icon:'💉',  label:'Infusion Hub'      },
  { id:'metabolic',    icon:'🔬',  label:'Metabolic Lab'     },
  { id:'hydration',    icon:'💧',  label:'Hydration Station' },
  { id:'diet',         icon:'✿',   label:'AI Nutrition'      },
  { id:'diary',        icon:'📖',  label:'My Diary'          },
  { id:'documents',    icon:'🗂',  label:'Documents'         },
  { id:'gym',          icon:'🏋️',  label:'Lazuli Gym'        },
  { id:'mindfulness',  icon:'🌸',  label:'Mindfulness'       },
  { id:'advocate',     icon:'🫂',  label:'Lazuli AI'         },
  { id:'share',        icon:'🔗',  label:'Share & Privacy'   },
];

const DIARY_FONTS = [
  { label:'Dancing Script',    value:"'Dancing Script',cursive",      size:20 },
  { label:'Playfair Display',  value:"'Playfair Display',serif",      size:18 },
  { label:'Lora',              value:"'Lora',serif",                   size:18 },
  { label:'Cormorant',         value:"'Cormorant Garamond',serif",    size:20 },
  { label:'EB Garamond',       value:"'EB Garamond',serif",           size:18 },
];
const DIARY_MOODS = ['💜 Loved','✨ Hopeful','🌿 Calm','💪 Determined','🌧 Low','😴 Exhausted','🔥 Frustrated','🦋 Transforming','🌊 Overwhelmed','☀️ Grateful'];
// DIET_GOALS removed — replaced by DIET_PROTOCOLS in new AIDiet component

const CHRONIC_ILLNESS_QUOTES = [
  'You are not your diagnosis.',
  'Rest is medicine.',
  'Invisible illness is still illness.',
  'Your pain is real and valid.',
  'Healing is not linear.',
  'You deserve to be believed.',
  'Flares are not failures.',
  'Rest is not giving up.',
  'Your strength is immeasurable.',
  'One moment at a time.',
  'You are more than your symptoms.',
  'Surviving is enough.',
  'Advocating for yourself takes courage.',
  'Bad days do not erase good ones.',
  'Your body is doing its best.',
];

const ROTATING_QUOTES = [
  { quote: 'You are worthy of compassionate care.', author: 'Lazuli Crest' },
  { quote: 'Every doctor visit where you speak up is an act of bravery.', author: 'Lazuli Crest' },
  { quote: 'Your experience is the most important data in the room.', author: 'Lazuli Crest' },
  { quote: 'Being chronically ill and still showing up is extraordinary.', author: 'Lazuli Crest' },
  { quote: 'You deserve a medical team that listens — and we will help you find one.', author: 'Lazuli Crest' },
  { quote: 'Pain that persists deserves answers, not dismissal.', author: 'Lazuli Crest' },
  { quote: 'Your health story matters. Document it. Protect it. Share it on your terms.', author: 'Lazuli Crest' },
  { quote: 'In ancient Egypt, lapis lazuli was ground to heal the spirit. Your healing matters too.', author: 'Lazuli Crest' },
  { quote: 'Strength is asking for help when your body cannot do it alone.', author: 'Lazuli Crest' },
  { quote: 'You are the expert on your own body. Always.', author: 'Lazuli Crest' },
];

const LAZULI_FACTS = [
  '✦ In ancient Mesopotamia, lapis lazuli was prescribed to treat depression and restore the spirit.',
  '✦ Egyptian pharaohs wore lapis as a sacred healing stone for 6,000+ years.',
  '✦ The Sumerians called it the "stone of gods" — gifted for healing the ill.',
  '✦ Renaissance physicians prescribed powdered lapis for melancholy and liver ailments.',
  '✦ Lapis adorned Egyptian burial masks to guide souls toward healing in the afterlife.',
  '✦ Ancient Persian healers wore lapis as armor against illness and negative energy.',
  '✦ In Ayurveda, lapis lazuli is associated with the throat chakra — giving voice to the unheard.',
];

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
    <div style={{ minHeight:'100vh', background:'#03000C', fontFamily:"'DM Sans',sans-serif", color:'#F0E8FF', position:'relative', overflow:'hidden' }}>
      <style>{GLOBAL_CSS}</style>
      <AnimatedBackground/>

      <div style={{ display:'flex', maxWidth:1280, margin:'0 auto', minHeight:'100vh', position:'relative', zIndex:1 }}>
        {sideOpen && <div className="mobile-overlay" onClick={()=>setSideOpen(false)}/>}
        <Sidebar tab={tab} setTab={go} user={user} data={data} saving={saving} open={sideOpen} setOpen={setSideOpen}/>

        <main className="main-content" style={{ contain:'layout style' }}>
          <div className="mobile-topbar">
            <button className="hamburger" onClick={()=>setSideOpen(o=>!o)}>
              <span/><span/><span/>
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <LogoImg size={28}/>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:20, color:'#C9A84C', letterSpacing:1, textShadow:'0 0 15px rgba(201,168,76,.3)' }}>Lazuli <em style={{ fontStyle:'italic' }}>Crest</em></span>
            </div>
            {saving && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:'pulseGlow 1s infinite' }}/>}
          </div>

          <div className="page-fade page-inner" key={tab}>
            <RotatingQuoteBanner/>
            {tab==='dashboard'    && <Dashboard    data={data} setTab={go} upd={upd} user={user}/>}
            {tab==='symptoms'     && <Symptoms     data={data} upd={upd}/>}
            {tab==='bodymap'      && <BodyMap      data={data} upd={upd}/>}
            {tab==='brain'        && <BrainSection data={data} upd={upd}/>}
            {tab==='infusion'     && <InfusionHub  data={data} upd={upd}/>}
            {tab==='metabolic'    && <MetabolicLab data={data} upd={upd}/>}
            {tab==='hydration'    && <Hydration    data={data} upd={upd}/>}
            {tab==='medications'  && <Medications  data={data} upd={upd}/>}
            {tab==='appointments' && <Appointments data={data} upd={upd}/>}
            {tab==='diary'        && <Diary        data={data} upd={upd}/>}
            {tab==='mindfulness'  && <Mindfulness/>}
            {tab==='diet'         && <AIDiet       data={data} upd={upd}/>}
            {tab==='documents'    && <Documents    data={data} upd={upd}/>}
            {tab==='advocate'     && <Advocate     data={data} user={user}/>}
            {tab==='profile'      && <Profile      data={data} upd={upd} user={user}/>}
            {tab==='share'        && <SharePrivacy data={data} upd={upd} user={user}/>}
            {tab==='updates'      && <Updates/>}
            {tab==='gym'          && <LazuliGym data={data}/>}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────
function LogoImg({ size=56 }) {
  return <img src="/icons/icon-192.png" alt="Lazuli Crest" width={size} height={size}
    style={{ borderRadius:size*.22, objectFit:'cover', flexShrink:0, filter:'drop-shadow(0 0 10px rgba(42,92,173,.6))' }}
    onError={e=>e.target.style.display='none'}/>;
}

// ─── Animated background (symbols rise bottom → top) ──────────
// Scientific/medical outline symbols — Unicode chars that render as outlines
const FLOAT_ITEMS = [
  {sym:'⚕',  x:5,  size:44, delay:0,   dur:80},
  {sym:'∮',  x:14, size:38, delay:12,  dur:90},
  {sym:'∇',  x:24, size:36, delay:25,  dur:85},
  {sym:'⚛',  x:36, size:42, delay:5,   dur:95},
  {sym:'∞',  x:48, size:40, delay:18,  dur:88},
  {sym:'∑',  x:58, size:38, delay:30,  dur:92},
  {sym:'Ψ',  x:68, size:40, delay:8,   dur:78},
  {sym:'∆',  x:78, size:36, delay:22,  dur:86},
  {sym:'⊕',  x:88, size:38, delay:40,  dur:82},
  {sym:'ℏ',  x:10, size:34, delay:55,  dur:94},
  {sym:'∂',  x:42, size:36, delay:48,  dur:87},
  {sym:'⊗',  x:62, size:34, delay:62,  dur:91},
  {sym:'Ω',  x:82, size:38, delay:35,  dur:83},
  {sym:'π',  x:20, size:36, delay:70,  dur:89},
  {sym:'μ',  x:52, size:34, delay:15,  dur:96},
];

const FLOAT_QUOTES = CHRONIC_ILLNESS_QUOTES.map((q,i) => ({
  text: q,
  x: 2 + (i * 19) % 72,
  delay: i * 8,
  dur: 45 + (i % 5) * 8,
}));

function AnimatedBackground() {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      {/* Deep background */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 25% 15%, rgba(42,92,173,.22) 0%, transparent 50%), radial-gradient(ellipse at 75% 85%, rgba(88,28,135,.28) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(15,5,35,.85) 0%, #03000C 100%)' }}/>
      {/* Aurora orbs */}
      <div style={{ position:'absolute', width:'70vw', height:'50vh', top:'-15%', left:'-15%', borderRadius:'50%', background:'radial-gradient(ellipse,rgba(42,92,173,.22) 0%,transparent 65%)', filter:'blur(60px)', animation:'auroraFloat 22s ease-in-out infinite alternate' }}/>
      <div style={{ position:'absolute', width:'60vw', height:'45vh', bottom:'-10%', right:'-10%', borderRadius:'50%', background:'radial-gradient(ellipse,rgba(42,92,173,.18) 0%,transparent 65%)', filter:'blur(70px)', animation:'auroraFloat 28s ease-in-out infinite alternate-reverse' }}/>
      <div style={{ position:'absolute', width:'40vw', height:'35vh', top:'30%', left:'35%', borderRadius:'50%', background:'radial-gradient(ellipse,rgba(201,168,76,.1) 0%,transparent 65%)', filter:'blur(80px)', animation:'auroraFloat 18s ease-in-out infinite alternate' }}/>
      <div style={{ position:'absolute', width:'30vw', height:'25vh', top:'55%', left:'15%', borderRadius:'50%', background:'radial-gradient(ellipse,rgba(123,47,190,.12) 0%,transparent 65%)', filter:'blur(90px)', animation:'auroraFloat 32s ease-in-out infinite alternate-reverse' }}/>
      <div style={{ position:'absolute', width:'25vw', height:'20vh', top:'20%', right:'5%', borderRadius:'50%', background:'radial-gradient(ellipse,rgba(42,92,173,.15) 0%,transparent 65%)', filter:'blur(70px)', animation:'auroraFloat 24s 4s ease-in-out infinite alternate' }}/>
      {/* Rising scientific symbols — outline ghost style */}
      {FLOAT_ITEMS.map((s,i) => (
        <div key={`sym-${i}`} style={{
          position:'absolute', left:`${s.x}%`, bottom:'-10%',
          fontSize:s.size, opacity:0,
          animation:`riseUp ${s.dur}s ${s.delay}s ease-in-out infinite`,
          userSelect:'none',
          color:'transparent',
          WebkitTextStroke:`1px rgba(42,92,173,0.35)`,
          filter:'drop-shadow(0 0 8px rgba(42,92,173,.5)) drop-shadow(0 0 16px rgba(42,92,173,.2))',
          fontFamily:"'DM Sans',sans-serif",
          fontWeight:100,
        }}>{s.sym}</div>
      ))}
      {/* Floating chronic illness quotes */}
      {FLOAT_QUOTES.map((q,i) => (
        <div key={`quote-${i}`} style={{
          position:'absolute', left:`${q.x}%`, bottom:'-5%',
          fontSize:16, opacity:0, color:'rgba(201,168,76,.55)',
          fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic',
          whiteSpace:'nowrap', letterSpacing:.5,
          animation:`riseUp ${q.dur}s ${q.delay}s linear infinite`,
          userSelect:'none',
        }}>{q.text}</div>
      ))}
      {/* Named Medical Constellations */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="starGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* ORION — The Hunter/Healer (upper left) */}
        <g style={{animation:'constellFade 14s 0s ease-in-out infinite alternate'}}>
          <line x1="9%" y1="12%" x2="13%" y2="16%" stroke="rgba(168,196,240,.25)" strokeWidth="0.7"/>
          <line x1="13%" y1="16%" x2="11%" y2="21%" stroke="rgba(168,196,240,.22)" strokeWidth="0.7"/>
          <line x1="11%" y1="21%" x2="15%" y2="24%" stroke="rgba(168,196,240,.2)" strokeWidth="0.6"/>
          <line x1="15%" y1="24%" x2="18%" y2="21%" stroke="rgba(168,196,240,.22)" strokeWidth="0.6"/>
          <line x1="18%" y1="21%" x2="16%" y2="16%" stroke="rgba(168,196,240,.2)" strokeWidth="0.6"/>
          <line x1="16%" y1="16%" x2="13%" y2="16%" stroke="rgba(168,196,240,.22)" strokeWidth="0.6"/>
          <line x1="13%" y1="19%" x2="18%" y2="19%" stroke="rgba(168,196,240,.3)" strokeWidth="0.8"/>
          <circle cx="9%" cy="12%" r="2.2" fill="#A8C4F0" filter="url(#starGlow)" style={{animation:'twinkle 6s 0s infinite alternate'}}/>
          <circle cx="13%" cy="16%" r="1.6" fill="#A8C4F0" filter="url(#starGlow)" style={{animation:'twinkle 7s 1s infinite alternate'}}/>
          <circle cx="11%" cy="21%" r="1.4" fill="#C4D8F8" style={{animation:'twinkle 5s 2s infinite alternate'}}/>
          <circle cx="15%" cy="24%" r="1.6" fill="#A8C4F0" filter="url(#starGlow)" style={{animation:'twinkle 8s 0.5s infinite alternate'}}/>
          <circle cx="18%" cy="21%" r="1.4" fill="#C4D8F8" style={{animation:'twinkle 6s 3s infinite alternate'}}/>
          <circle cx="16%" cy="16%" r="2" fill="#A8C4F0" filter="url(#starGlow)" style={{animation:'twinkle 7s 1.5s infinite alternate'}}/>
          <circle cx="13%" cy="19%" r="1.5" fill="#ddd" style={{animation:'twinkle 5s 0.8s infinite alternate'}}/>
          <circle cx="15.5%" cy="19%" r="1.5" fill="#ddd" style={{animation:'twinkle 6s 1.2s infinite alternate'}}/>
          <circle cx="18%" cy="19%" r="1.4" fill="#ddd" style={{animation:'twinkle 5s 1.8s infinite alternate'}}/>
          <text x="9%" y="10%" fontSize="8" fill="rgba(201,168,76,.4)" fontFamily="Cinzel,serif" letterSpacing="1">ORION</text>
        </g>
        {/* PLEIADES — The Seven Sisters (upper right) */}
        <g style={{animation:'constellFade 12s 3s ease-in-out infinite alternate'}}>
          <line x1="72%" y1="8%" x2="76%" y2="10%" stroke="rgba(168,196,240,.2)" strokeWidth="0.5"/>
          <line x1="76%" y1="10%" x2="79%" y2="8%" stroke="rgba(168,196,240,.2)" strokeWidth="0.5"/>
          <line x1="79%" y1="8%" x2="82%" y2="11%" stroke="rgba(168,196,240,.18)" strokeWidth="0.5"/>
          <line x1="82%" y1="11%" x2="78%" y2="13%" stroke="rgba(168,196,240,.18)" strokeWidth="0.5"/>
          <line x1="78%" y1="13%" x2="74%" y2="12%" stroke="rgba(168,196,240,.2)" strokeWidth="0.5"/>
          <line x1="74%" y1="12%" x2="72%" y2="8%" stroke="rgba(168,196,240,.18)" strokeWidth="0.5"/>
          <circle cx="72%" cy="8%" r="1.8" fill="#C9A84C" filter="url(#starGlow)" style={{animation:'twinkle 7s 2s infinite alternate'}}/>
          <circle cx="76%" cy="10%" r="1.4" fill="#A8C4F0" style={{animation:'twinkle 5s 1s infinite alternate'}}/>
          <circle cx="79%" cy="8%" r="1.6" fill="#A8C4F0" filter="url(#starGlow)" style={{animation:'twinkle 8s 0s infinite alternate'}}/>
          <circle cx="82%" cy="11%" r="1.3" fill="#C4D8F8" style={{animation:'twinkle 6s 2.5s infinite alternate'}}/>
          <circle cx="78%" cy="13%" r="1.5" fill="#A8C4F0" style={{animation:'twinkle 7s 1.5s infinite alternate'}}/>
          <circle cx="74%" cy="12%" r="1.4" fill="#C4D8F8" style={{animation:'twinkle 5s 3s infinite alternate'}}/>
          <circle cx="80%" cy="10%" r="1.2" fill="#fff" style={{animation:'twinkle 9s 0.5s infinite alternate'}}/>
          <text x="70%" y="6%" fontSize="8" fill="rgba(201,168,76,.4)" fontFamily="Cinzel,serif" letterSpacing="1">PLEIADES</text>
        </g>
        {/* CADUCEUS — The Healer's Cross (center) */}
        <g style={{animation:'constellFade 16s 6s ease-in-out infinite alternate'}}>
          <line x1="47%" y1="42%" x2="47%" y2="58%" stroke="rgba(201,168,76,.2)" strokeWidth="0.6"/>
          <line x1="43%" y1="45%" x2="51%" y2="45%" stroke="rgba(201,168,76,.2)" strokeWidth="0.6"/>
          <line x1="43%" y1="50%" x2="51%" y2="50%" stroke="rgba(168,196,240,.2)" strokeWidth="0.5"/>
          <line x1="44%" y1="54%" x2="50%" y2="54%" stroke="rgba(168,196,240,.18)" strokeWidth="0.5"/>
          <circle cx="47%" cy="42%" r="2.2" fill="#C9A84C" filter="url(#starGlow)" style={{animation:'twinkle 8s 1s infinite alternate'}}/>
          <circle cx="47%" cy="45%" r="1.6" fill="#A8C4F0" style={{animation:'twinkle 6s 2s infinite alternate'}}/>
          <circle cx="43%" cy="45%" r="1.4" fill="#C4D8F8" style={{animation:'twinkle 5s 0.5s infinite alternate'}}/>
          <circle cx="51%" cy="45%" r="1.4" fill="#C4D8F8" style={{animation:'twinkle 7s 1.5s infinite alternate'}}/>
          <circle cx="43%" cy="50%" r="1.3" fill="#A8C4F0" style={{animation:'twinkle 6s 3s infinite alternate'}}/>
          <circle cx="51%" cy="50%" r="1.5" fill="#A8C4F0" style={{animation:'twinkle 5s 2.5s infinite alternate'}}/>
          <circle cx="44%" cy="54%" r="1.4" fill="#C4D8F8" style={{animation:'twinkle 8s 0s infinite alternate'}}/>
          <circle cx="50%" cy="54%" r="1.4" fill="#C4D8F8" style={{animation:'twinkle 6s 1s infinite alternate'}}/>
          <circle cx="47%" cy="58%" r="2" fill="#C9A84C" filter="url(#starGlow)" style={{animation:'twinkle 7s 2s infinite alternate'}}/>
          <text x="44%" y="40%" fontSize="8" fill="rgba(201,168,76,.35)" fontFamily="Cinzel,serif" letterSpacing="1">CADUCEUS</text>
        </g>
        {/* SCORPIUS — Resilience (lower right) */}
        <g style={{animation:'constellFade 11s 8s ease-in-out infinite alternate'}}>
          <line x1="78%" y1="68%" x2="82%" y2="65%" stroke="rgba(168,196,240,.2)" strokeWidth="0.6"/>
          <line x1="82%" y1="65%" x2="85%" y2="67%" stroke="rgba(168,196,240,.18)" strokeWidth="0.6"/>
          <line x1="85%" y1="67%" x2="87%" y2="71%" stroke="rgba(168,196,240,.18)" strokeWidth="0.5"/>
          <line x1="87%" y1="71%" x2="86%" y2="75%" stroke="rgba(168,196,240,.2)" strokeWidth="0.5"/>
          <line x1="86%" y1="75%" x2="88%" y2="79%" stroke="rgba(168,196,240,.18)" strokeWidth="0.5"/>
          <line x1="88%" y1="79%" x2="86%" y2="83%" stroke="rgba(168,196,240,.15)" strokeWidth="0.5"/>
          <circle cx="78%" cy="68%" r="2.4" fill="#f87171" filter="url(#starGlow)" style={{animation:'twinkle 7s 0s infinite alternate'}}/>
          <circle cx="82%" cy="65%" r="1.5" fill="#A8C4F0" style={{animation:'twinkle 5s 1s infinite alternate'}}/>
          <circle cx="85%" cy="67%" r="1.6" fill="#C4D8F8" style={{animation:'twinkle 8s 2s infinite alternate'}}/>
          <circle cx="87%" cy="71%" r="1.4" fill="#A8C4F0" style={{animation:'twinkle 6s 1.5s infinite alternate'}}/>
          <circle cx="86%" cy="75%" r="1.5" fill="#C4D8F8" style={{animation:'twinkle 7s 0.5s infinite alternate'}}/>
          <circle cx="88%" cy="79%" r="1.3" fill="#A8C4F0" style={{animation:'twinkle 5s 2.5s infinite alternate'}}/>
          <circle cx="86%" cy="83%" r="1.6" fill="#C4D8F8" filter="url(#starGlow)" style={{animation:'twinkle 9s 1s infinite alternate'}}/>
          <text x="76%" y="66%" fontSize="8" fill="rgba(168,196,240,.4)" fontFamily="Cinzel,serif" letterSpacing="1">SCORPIUS</text>
        </g>
        {/* URSA MAJOR — The Caregiver (lower left) */}
        <g style={{animation:'constellFade 13s 4s ease-in-out infinite alternate'}}>
          <line x1="8%" y1="72%" x2="12%" y2="70%" stroke="rgba(168,196,240,.2)" strokeWidth="0.6"/>
          <line x1="12%" y1="70%" x2="16%" y2="71%" stroke="rgba(168,196,240,.18)" strokeWidth="0.6"/>
          <line x1="16%" y1="71%" x2="19%" y2="74%" stroke="rgba(168,196,240,.2)" strokeWidth="0.5"/>
          <line x1="19%" y1="74%" x2="22%" y2="72%" stroke="rgba(168,196,240,.18)" strokeWidth="0.5"/>
          <line x1="22%" y1="72%" x2="25%" y2="69%" stroke="rgba(168,196,240,.2)" strokeWidth="0.5"/>
          <line x1="25%" y1="69%" x2="28%" y2="71%" stroke="rgba(168,196,240,.18)" strokeWidth="0.5"/>
          <line x1="28%" y1="71%" x2="30%" y2="68%" stroke="rgba(168,196,240,.15)" strokeWidth="0.5"/>
          <circle cx="8%" cy="72%" r="1.8" fill="#A8C4F0" filter="url(#starGlow)" style={{animation:'twinkle 7s 0s infinite alternate'}}/>
          <circle cx="12%" cy="70%" r="1.5" fill="#C4D8F8" style={{animation:'twinkle 5s 2s infinite alternate'}}/>
          <circle cx="16%" cy="71%" r="1.6" fill="#A8C4F0" style={{animation:'twinkle 8s 1s infinite alternate'}}/>
          <circle cx="19%" cy="74%" r="1.4" fill="#C4D8F8" style={{animation:'twinkle 6s 3s infinite alternate'}}/>
          <circle cx="22%" cy="72%" r="1.8" fill="#A8C4F0" filter="url(#starGlow)" style={{animation:'twinkle 7s 0.5s infinite alternate'}}/>
          <circle cx="25%" cy="69%" r="1.6" fill="#C4D8F8" style={{animation:'twinkle 5s 1.5s infinite alternate'}}/>
          <circle cx="28%" cy="71%" r="1.4" fill="#A8C4F0" style={{animation:'twinkle 9s 2s infinite alternate'}}/>
          <circle cx="30%" cy="68%" r="2" fill="#C9A84C" filter="url(#starGlow)" style={{animation:'twinkle 6s 1s infinite alternate'}}/>
          <text x="6%" y="70%" fontSize="8" fill="rgba(168,196,240,.4)" fontFamily="Cinzel,serif" letterSpacing="1">URSA MAJOR</text>
        </g>
      </svg>
      {/* Subtle grain */}
      <div style={{ position:'absolute', inset:0, opacity:.025, backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize:'200px 200px' }}/>
    </div>
  );
}

// ─── Rotating quote banner ─────────────────────────────────────
function RotatingQuoteBanner() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i+1) % ROTATING_QUOTES.length); setFade(true); }, 600);
    }, 20000);
    return () => clearInterval(t);
  }, []);
  const q = ROTATING_QUOTES[idx];
  return (
    <div style={{ marginBottom:18, padding:'10px 18px', background:'rgba(42,92,173,.06)', border:'1px solid rgba(42,92,173,.18)', borderRadius:12, display:'flex', gap:10, alignItems:'center', transition:'opacity .6s', opacity:fade?1:0, minHeight:44 }}>
      <span style={{ fontSize:16, flexShrink:0 }}>✦</span>
      <div style={{ flex:1 }}>
        <span style={{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:15, color:'rgba(201,168,76,.85)', lineHeight:1.5 }}>{q.quote}</span>
        <span style={{ fontSize:16, color:'rgba(240,232,255,.25)', marginLeft:8 }}>— {q.author}</span>
      </div>
    </div>
  );
}

// ─── Global CSS ───────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cinzel+Decorative:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&family=Dancing+Script:wght@500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lora:ital,wght@0,400;1,400;1,600&family=EB+Garamond:ital,wght@0,400;1,400;1,500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  html{font-size:20px}
  body{font-size:20px;line-height:1.7;-webkit-font-smoothing:antialiased}
  button,input,select,textarea{font-family:'DM Sans',sans-serif;font-size:18px}
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-thumb{background:rgba(42,92,173,.5);border-radius:4px}
  ::-webkit-scrollbar-track{background:transparent}

  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes popIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
  @keyframes genieIn{0%{opacity:0;transform:scale(.1) translateY(60px) rotate(-8deg);filter:blur(12px)}40%{opacity:.8;transform:scale(1.06) translateY(-10px) rotate(2deg);filter:blur(2px)}70%{transform:scale(.97) translateY(4px) rotate(-1deg)}100%{opacity:1;transform:scale(1) translateY(0) rotate(0deg);filter:blur(0)}}
  @keyframes smokeRise{0%{opacity:0;transform:translateY(0) scaleX(1)}50%{opacity:.4;transform:translateY(-40px) scaleX(1.5)}100%{opacity:0;transform:translateY(-80px) scaleX(2)}}
  @keyframes pulseGlow{0%,100%{box-shadow:0 0 12px rgba(42,92,173,.5)}50%{box-shadow:0 0 28px rgba(42,92,173,.9)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1) translateY(-4px)}}
  @keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes heartbeat{0%,100%{transform:scale(1)}14%{transform:scale(1.15)}28%{transform:scale(1)}42%{transform:scale(1.08)}70%{transform:scale(1)}}
  @keyframes inkDrop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
  @keyframes slideInLeft{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
  @keyframes auroraFloat{0%{transform:translate(0,0) scale(1);opacity:.8}25%{transform:translate(20px,-14px) scale(1.08);opacity:1}50%{transform:translate(5px,10px) scale(1.04);opacity:.85}75%{transform:translate(-10px,5px) scale(0.96);opacity:.95}100%{transform:translate(-12px,20px) scale(1.02);opacity:.9}}
  @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
  @keyframes orbitX{0%,100%{transform:translateX(0)}50%{transform:translateX(30px)}}
  @keyframes breathePulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.08);opacity:.9}}
  @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  @keyframes riseUp{0%{transform:translateY(0) rotate(0deg);opacity:0}8%{opacity:.22}50%{opacity:.18}85%{opacity:.1}100%{transform:translateY(-108vh) rotate(5deg);opacity:0}}
  @keyframes breatheIn{0%{transform:scale(.75);opacity:.5}100%{transform:scale(1.18);opacity:1}}
  @keyframes breatheOut{0%{transform:scale(1.18);opacity:1}100%{transform:scale(.75);opacity:.5}}
  @keyframes breatheHold{0%,100%{transform:scale(1.18)}}
  @keyframes breatheRest{0%,100%{transform:scale(.75)}}
  @keyframes pageTurn{from{transform:rotateY(-15deg) translateX(-10px);opacity:.7}to{transform:rotateY(0deg) translateX(0);opacity:1}}
  @keyframes fogDrift{0%,100%{opacity:.3}50%{opacity:.6}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  @keyframes ripple0{0%{opacity:.7;transform:translateX(-50%) scale(.3)}100%{opacity:0;transform:translateX(-50%) scale(2)}}
  @keyframes ripple1{0%{opacity:.5;transform:translateX(-50%) scale(.3)}100%{opacity:0;transform:translateX(-50%) scale(2.5)}}
  @keyframes ripple2{0%{opacity:.3;transform:translateX(-50%) scale(.3)}100%{opacity:0;transform:translateX(-50%) scale(3)}}
  @keyframes twinkle{0%{opacity:.2;r:1}50%{opacity:.9;r:2.5}100%{opacity:.35;r:1.5}}
  @keyframes constellFade{0%{opacity:.04}50%{opacity:.22}100%{opacity:.06}}

  .page-fade{animation:fadeUp .32s cubic-bezier(.22,1,.36,1)}
  .slide-in{animation:slideInLeft .28s cubic-bezier(.22,1,.36,1)}

  /* ── Luxury glass cards — lapis gem ─────────────────────── */
  .glass-card{
    background:rgba(6,18,52,.86);
    backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);
    border:1px solid rgba(42,92,173,.4);
    border-radius:20px;
    box-shadow:0 8px 32px rgba(0,0,0,.55),inset 0 1px 0 rgba(168,196,240,.1),inset 0 0 40px rgba(42,92,173,.04);
    transition:all .22s ease
  }
  .glass-card:hover{
    border-color:rgba(201,168,76,.4);
    box-shadow:0 14px 48px rgba(0,0,0,.6),0 0 30px rgba(42,92,173,.12);
    transform:translateY(-2px)
  }
  .glass-card-static{
    background:rgba(6,18,52,.86);
    backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);
    border:1px solid rgba(42,92,173,.35);
    border-radius:20px;
    box-shadow:0 8px 32px rgba(0,0,0,.5),inset 0 1px 0 rgba(168,196,240,.08);
    transition:border-color .22s;will-change:auto;
  }

  .matriarch-quote{font-family:'Cormorant Garamond',serif;font-style:italic;color:#C9A84C;line-height:1.8;font-size:18px;text-shadow:0 0 10px rgba(201,168,76,.25)}
  .matriarch-tag{text-transform:uppercase;letter-spacing:.45em;font-size:13px;color:rgba(255,255,255,.4);margin-bottom:6px;display:block}

  /* ── Buttons ─────────────────────────────────────────────── */
  .btn{border:none;border-radius:12px;padding:13px 26px;font-weight:600;font-size:17px;cursor:pointer;transition:all .18s;display:inline-flex;align-items:center;gap:8px;letter-spacing:.15px}
  .btn-gold{background:linear-gradient(135deg,#C9A84C,#E8C96B);color:#000;font-weight:700;box-shadow:0 4px 20px rgba(201,168,76,.4),inset 0 1px 0 rgba(255,255,255,.25)}
  .btn-gold:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(201,168,76,.55)}
  .btn-gold:active{transform:translateY(0)}
  .btn-ghost{background:rgba(42,92,173,.15);border:1.5px solid rgba(42,92,173,.45);color:#A8C4F0}
  .btn-ghost:hover{background:rgba(42,92,173,.28);border-color:rgba(201,168,76,.5);color:#fff}
  .btn-danger{background:rgba(255,80,80,.1);border:1.5px solid rgba(255,80,80,.35);color:#ff9090}
  .btn-danger:hover{background:#ff5050;color:#fff;border-color:#ff5050}
  .btn-subtle{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(240,232,255,.6)}
  .btn-subtle:hover{background:rgba(255,255,255,.12);color:#F0E8FF}
  .btn-lapis{background:linear-gradient(135deg,#1E3A8A,#2A5CAD);color:#E0EFFF;font-weight:600;border:none;box-shadow:0 4px 18px rgba(42,92,173,.4)}
  .btn-lapis:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(42,92,173,.6)}

  /* ── Form fields ─────────────────────────────────────────── */
  .field{background:rgba(255,255,255,.055);border:1.5px solid rgba(42,92,173,.4);border-radius:12px;padding:13px 16px;font-size:18px;color:#F0E8FF;width:100%;outline:none;transition:all .18s;caret-color:#C9A84C}
  .field:focus{border-color:#C9A84C;background:rgba(201,168,76,.055);box-shadow:0 0 0 3px rgba(201,168,76,.12)}
  .field::placeholder{color:rgba(240,232,255,.32)}
  select.field option{background:#080316;color:#F0E8FF}
  label{font-size:16px;font-weight:600;color:#C9A84C;display:block;margin-bottom:7px;text-transform:uppercase;letter-spacing:.9px}
  input[type=range]{accent-color:#C9A84C;cursor:pointer;width:100%}
  input[type=checkbox]{accent-color:#2A5CAD;width:18px;height:18px;cursor:pointer}
  .pill{display:inline-flex;align-items:center;gap:6px;background:rgba(42,92,173,.2);border:1.5px solid rgba(42,92,173,.45);color:#A8C4F0;border-radius:20px;padding:5px 14px;font-size:13px;font-weight:500}

  /* ── Sidebar — z-index fix for mobile ────────────────────── */
  .sidebar{width:272px;background:rgba(4,1,16,.98);backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);border-right:1.5px solid rgba(42,92,173,.22);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;overscroll-behavior:contain;z-index:100;flex-shrink:0;box-shadow:4px 0 40px rgba(0,0,0,.7);transition:transform .3s cubic-bezier(.22,1,.36,1)}
  .nav-item{display:flex;align-items:center;gap:11px;width:100%;padding:12px 16px;border-radius:12px;border:1px solid transparent;background:transparent;color:rgba(240,232,255,.62);font-size:16px;font-weight:500;cursor:pointer;transition:all .16s;text-align:left;position:relative}
  .nav-item:hover{background:rgba(42,92,173,.14);color:rgba(240,232,255,.9);border-color:rgba(42,92,173,.28)}
  .nav-item.active{background:linear-gradient(135deg,rgba(42,92,173,.3),rgba(42,92,173,.12));color:#C9A84C;border-color:rgba(201,168,76,.3);font-weight:600}

  .main-content{flex:1;display:flex;flex-direction:column;min-height:100vh;position:relative;z-index:1;min-width:0;contain:layout style}
  .page-inner{flex:1;padding:28px 36px;padding-bottom:48px}
  .mobile-topbar{display:none;align-items:center;gap:12px;padding:14px 18px;background:rgba(4,1,16,.97);backdrop-filter:blur(20px);border-bottom:1.5px solid rgba(42,92,173,.2);position:sticky;top:0;z-index:90;flex-shrink:0}
  .hamburger{background:transparent;border:none;cursor:pointer;padding:5px;display:flex;flex-direction:column;gap:5px;flex-shrink:0}
  .hamburger span{display:block;width:24px;height:2px;background:#C9A84C;border-radius:2px}
  .mobile-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99;backdrop-filter:blur(4px)}

  /* ── Stat cards ──────────────────────────────────────────── */
  .stat-card{background:rgba(8,3,22,.9);border:1.5px solid rgba(42,92,173,.25);border-radius:18px;padding:22px 18px;cursor:pointer;transition:all .22s;position:relative;overflow:hidden}
  .stat-card:hover{transform:translateY(-4px);border-color:rgba(201,168,76,.38);box-shadow:0 16px 48px rgba(0,0,0,.6),0 0 36px rgba(42,92,173,.15)}
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}

  /* ── Auth inputs ─────────────────────────────────────────── */
  .auth-input{background:rgba(255,255,255,.055);border:1.5px solid rgba(42,92,173,.4);border-radius:14px;padding:15px 18px;font-size:16px;color:#F0E8FF;width:100%;outline:none;transition:all .18s;caret-color:#C9A84C}
  .auth-input:focus{border-color:#C9A84C;background:rgba(201,168,76,.055);box-shadow:0 0 0 3px rgba(201,168,76,.12)}
  .auth-input::placeholder{color:rgba(240,232,255,.32)}

  /* ── Diary — real notebook ───────────────────────────────── */
  .diary-book{
    background:linear-gradient(160deg,rgba(20,10,40,.97) 0%,rgba(12,4,26,.99) 100%);
    border:1.5px solid rgba(42,92,173,.28);
    border-radius:4px 18px 18px 4px;
    box-shadow:inset -5px 0 18px rgba(0,0,0,.4),-3px 0 0 rgba(42,92,173,.3),0 12px 40px rgba(0,0,0,.5);
    position:relative;overflow:hidden;
    animation:pageTurn .4s cubic-bezier(.22,1,.36,1)
  }
  .diary-book::before{content:'';position:absolute;left:72px;top:0;bottom:0;width:1px;background:rgba(201,168,76,.12)}
  .diary-book::after{content:'';position:absolute;left:0;top:0;bottom:0;width:72px;background:linear-gradient(90deg,rgba(42,92,173,.08),transparent)}
  .diary-lines{background-image:repeating-linear-gradient(transparent,transparent 37px,rgba(42,92,173,.08) 37px,rgba(42,92,173,.08) 38px);background-size:100% 38px;background-position:0 48px}
  .diary-textarea{background:transparent;border:none;outline:none;width:100%;min-height:320px;padding:16px 24px 16px 18px;color:rgba(240,232,255,.9);line-height:38px;resize:none;caret-color:#C9A84C;font-size:17px}
  .diary-entry-card{background:rgba(8,3,22,.85);border:1.5px solid rgba(42,92,173,.22);border-radius:14px;padding:20px 24px;transition:all .22s;cursor:pointer}
  .diary-entry-card:hover{border-color:rgba(201,168,76,.32);transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,.5)}

  .share-card{background:linear-gradient(135deg,rgba(8,3,22,.94),rgba(15,6,36,.97));border:1.5px solid rgba(201,168,76,.28);border-radius:20px;padding:28px;position:relative;overflow:hidden}

  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .three-col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}

  /* ── Mindfulness ─────────────────────────────────────────── */
  .breathe-ring{border-radius:50%;position:absolute;inset:0;border:2px solid}

  @media(max-width:768px){
    .sidebar{position:fixed;top:0;left:0;bottom:0;transform:translateX(-100%);z-index:100}
    .sidebar.open{transform:translateX(0)}
    .main-content{margin-left:0}
    .mobile-topbar{display:flex}
    .page-inner{padding:16px 15px 40px}
    .two-col{grid-template-columns:1fr !important}
    .three-col{grid-template-columns:1fr !important}
    .stats-grid{grid-template-columns:repeat(2,1fr) !important}
  }
`;

// ─── Splash ───────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{ minHeight:'100vh', background:'#03000C', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ textAlign:'center' }}>
        <div style={{ marginBottom:18, animation:'floatUp 2.5s ease-in-out infinite' }}><LogoImg size={80}/></div>
        <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:28, fontWeight:700, color:'#fff', letterSpacing:3, marginBottom:4 }}>LAZULI CREST</div>
        <div style={{ fontSize:16, color:'#C9A84C', letterSpacing:4, textTransform:'uppercase', marginBottom:24 }}>The Gold Standard in Health Advocacy</div>
        <div style={{ width:64, height:2, background:'linear-gradient(90deg,#2A5CAD,#C9A84C)', margin:'0 auto', borderRadius:2 }}/>
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
      fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'user_login', email }) }).catch(()=>{});
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
      fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'user_signup', email, name:name.trim() }) }).catch(()=>{});
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

  const hk = e => { if (e.key==='Enter') { if(mode==='signin')handleSignin(); else if(mode==='signup')handleSignup(); else handleReset(); } };

  return (
    <div style={{ minHeight:'100vh', background:'#03000C', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative' }}>
      <style>{GLOBAL_CSS}</style>
      <AnimatedBackground/>
      <div style={{ width:'100%', maxWidth:480, position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ marginBottom:16, animation:'floatUp 3s ease-in-out infinite' }}><LogoImg size={78}/></div>
          <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:26, fontWeight:700, color:'#fff', letterSpacing:3, marginBottom:5 }}>LAZULI CREST</div>
          <div style={{ fontSize:16, color:'#C9A84C', letterSpacing:3.5, textTransform:'uppercase', marginBottom:6 }}>The Gold Standard in Health Advocacy</div>
          <div style={{ fontSize:16, color:'rgba(168,196,240,.52)', fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>{getDailyMessage()}</div>
        </div>

        <div style={{ position:'relative' }}>
        {/* Genie smoke */}
        {[...Array(6)].map((_,i)=>(
          <div key={i} style={{ position:'absolute', bottom: -20, left:`${20+i*12}%`, width:30+i*8, height:60+i*10, borderRadius:'50%', background:`radial-gradient(ellipse,rgba(42,92,173,${.15+i*.04}) 0%,transparent 70%)`, animation:`smokeRise ${1.2+i*.2}s ${i*.1}s ease-out both`, pointerEvents:'none', filter:'blur(8px)' }}/>
        ))}
        <div className="glass-card-static" style={{ padding:36, borderRadius:24, animation:'genieIn .7s cubic-bezier(.22,1,.36,1)' }}>
          <div style={{ display:'flex', gap:0, marginBottom:26, background:'rgba(255,255,255,.04)', borderRadius:12, padding:4 }}>
            {[{k:'signin',l:'Sign In'},{k:'signup',l:'Create Account'}].map(m=>(
              <button key={m.k} onClick={()=>{setMode(m.k);clear();}} style={{ flex:1, padding:'9px 0', borderRadius:9, border:'none', background:mode===m.k?'linear-gradient(135deg,#C9A84C,#E8C96B)':'transparent', color:mode===m.k?'#000':'rgba(240,232,255,.42)', fontWeight:mode===m.k?700:500, fontSize:16, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{m.l}</button>
            ))}
          </div>

          {/* Care account info banner */}
          {mode==='signin' && (
            <div style={{ marginBottom:18, padding:'10px 14px', background:'rgba(42,92,173,.08)', border:'1px solid rgba(42,92,173,.2)', borderRadius:11, fontSize:16, color:'rgba(168,196,240,.7)', lineHeight:1.6 }}>
              💙 Lazuli patient accounts: sign in with the email and password set up for you by your care advocate.
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {mode==='signup' && <>
              <div><label>Your Name</label><input className="auth-input" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah" onKeyDown={hk} autoFocus/></div>
              <div>
                <label>This account is for</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 }}>
                  {[{v:'self',l:'Myself',d:'I have a chronic illness'},{v:'caree',l:'Someone I care for',d:'I manage their health'}].map(o=>(
                    <button key={o.v} onClick={()=>setAccountType(o.v)} style={{ padding:'11px 13px', borderRadius:12, border:`1.5px solid ${accountType===o.v?'#C9A84C':'rgba(42,92,173,.25)'}`, background:accountType===o.v?'rgba(201,168,76,.08)':'rgba(255,255,255,.03)', color:accountType===o.v?'#C9A84C':'rgba(240,232,255,.4)', cursor:'pointer', textAlign:'left', fontFamily:"'DM Sans',sans-serif" }}>
                      <div style={{ fontSize:16, fontWeight:600, marginBottom:2 }}>{o.l}</div>
                      <div style={{ fontSize:16, opacity:.7 }}>{o.d}</div>
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

          {error && <div style={{ marginTop:14, padding:'11px 14px', background:'rgba(255,80,80,.1)', border:'1px solid rgba(255,80,80,.22)', borderRadius:11, fontSize:16, color:'#ff8080' }}>⚠ {error}</div>}
          {msg   && <div style={{ marginTop:14, padding:'11px 14px', background:'rgba(110,231,183,.1)', border:'1px solid rgba(110,231,183,.22)', borderRadius:11, fontSize:16, color:'#6ee7b7' }}>✓ {msg}</div>}

          <button className="btn btn-gold" onClick={mode==='signin'?handleSignin:mode==='signup'?handleSignup:handleReset} disabled={loading} style={{ width:'100%', marginTop:20, padding:'14px', fontSize:15, justifyContent:'center', opacity:loading?.7:1 }}>
            {loading ? <span style={{ display:'inline-block', width:17, height:17, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#000', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : mode==='signin' ? 'Sign In' : mode==='signup' ? 'Create My Account' : 'Send Reset Email'}
          </button>
          {mode==='signin' && <button onClick={()=>{setMode('reset');clear();}} style={{ width:'100%', marginTop:10, background:'none', border:'none', color:'rgba(240,232,255,.28)', fontSize:16, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", padding:4 }}>Forgot your password?</button>}
          {mode==='reset'  && <button onClick={()=>{setMode('signin');clear();}} style={{ width:'100%', marginTop:10, background:'none', border:'none', color:'rgba(240,232,255,.28)', fontSize:16, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", padding:4 }}>← Back to sign in</button>}
        </div>
        </div>
        <div style={{ textAlign:'center', marginTop:14, fontSize:16, color:'rgba(240,232,255,.18)', lineHeight:1.6 }}>🔒 Your health data is encrypted and stored privately. Only you can access it.</div>
      </div>
    </div>
  );
}

const SIDEBAR_QUOTES = [
  "Data is the new black. And you, darling, are wearing it well.",
  "High standards, higher clarity. Let's make this appointment count.",
  "Precision is the ultimate luxury. Your records are looking impeccable.",
  "A well-kept log is the best accessory a patient can carry.",
  "Your story is the most important one in the room. Let's tell it clearly.",
  "Healing isn't a race; it's a rhythm. Find yours today.",
  "You are the expert on your own experience. We're just here to document the brilliance.",
  "Rest is a strategic decision. Take it when you need it.",
  "Hydrate like you're preparing for a red carpet. Your cells will thank you.",
  "Every entry is a bridge to a better conversation with your team.",
  "Knowledge is power, but organized knowledge is an advantage.",
  "The most important voice in this room is yours. We're just here to amplify it.",
  "Healing isn't about being perfect; it's about being present. You're doing great.",
  "Your body is a masterpiece in progress. Every log is a brushstroke.",
  "Take a breath. Your history is recorded, your future is focused, and you are seen.",
  "Quiet strength is still strength. Honor your pace today.",
  "You aren't just a chart number; you're the CEO of this journey.",
  "Rest is productive. Never let anyone tell you otherwise.",
  "Think of your doctor as a consultant — you're the one running the board meeting.",
  "Clarity is the ultimate luxury. Let's clear the fog today.",
  "Your health is your most exclusive asset. Protect it fiercely.",
  "Great conversations start with great records. You're already ahead of the curve.",
  "Evidence is the antidote to uncertainty. Keep building your case.",
  "They'll call it 'difficult.' We call it 'discerning.' Never apologize for having a pulse on your own body.",
  "Precision isn't just a metric; it's a power move.",
  "If you can read this, you have time for three sips of water.",
  "Hydration isn't a suggestion, it's maintenance.",
  "Your brain needs more than just focus to run this empire.",
  "Brain fog is just your mind being in Airplane Mode. Let's land safely together.",
  "Flaring? It's not a failure — it's a technical difficulty. Rest is the only productive thing on the agenda today.",
  "Your energy is the ultimate currency. Spend it wisely.",
  "Listen to what your body isn't saying. Silence is a diagnostic tool.",
  "We're going to show the doctor these charts so they can finally see that your 'vague symptoms' are a data masterpiece.",
  "A well-organized log is the ultimate 'No' to anyone trying to tell you it's all in your head.",
  "They call it 'medical history.' I call it 'the receipts.' And we're keeping every single one.",
  "Your data is a love letter to your future self. It says: 'I was listening.'",
  "Tracking isn't about being 'sick'; it's about being 'present' with your body.",
  "When you know your patterns, you can stop reacting and start responding.",
  "A symptom is just a sensation looking for a name. Help it find one.",
  "You are the lead architect of your own well-being. Keep the blueprints updated.",
  "Don't just track the storm; track the moments the sun breaks through.",
  "Your sensitivity isn't a symptom; it's your soul's way of staying awake to the world.",
  "I see the effort you're putting in, even on the days you feel invisible.",
  "Connection is the medicine. Don't skip your dose.",
  "You are the lead architect of your healing, but you don't have to carry the bricks alone.",
  "The strength it takes to get through a hard health day is immeasurable.",
  "You are not your diagnosis — you are so much more.",
  "Rest is not giving up. Rest is how you survive.",
  "Your pain is real, your experience is valid, you deserve to be believed.",
  "Every doctor visit where you speak up is an act of bravery.",
  "You are the expert on your own body. Always.",
  "Flares do not erase your progress.",
  "Surviving is enough. Thriving is a bonus.",
  "Bad days do not cancel out good ones.",
  "Your body is doing its absolute best.",
];

function DailyQuoteSidebar() {
  const [idx, setIdx] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setTextVisible(false);
      setTimeout(() => {
        setIdx(i => (i+1) % SIDEBAR_QUOTES.length);
        setTextVisible(true);
      }, 700);
    }, 12000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ background:'rgba(4,14,52,.78)', backdropFilter:'blur(16px)', borderRadius:14, padding:'16px 15px', border:'1px solid rgba(42,92,173,.28)', flex:1, display:'flex', flexDirection:'column', justifyContent:'center', minHeight:120 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'rgba(201,168,76,.8)', marginBottom:8, letterSpacing:1.8, textTransform:'uppercase' }}>💜 Today</div>
      <div style={{ fontSize:15, color:'rgba(240,232,255,.88)', lineHeight:1.75, fontFamily:"Georgia,serif", transition:'opacity .7s ease, transform .7s ease', opacity:textVisible?1:0, transform:textVisible?'translateY(0)':'translateY(6px)' }}>
        {SIDEBAR_QUOTES[idx]}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ tab, setTab, user, data, saving, open, setOpen }) {
  const isCare      = data.profile?.accountType === 'caree';
  const displayName = isCare ? data.profile?.careeName||'Your Caree' : (user.displayName||'Your Account');
  const [factIdx, setFactIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFactIdx(i => (i+1) % LAZULI_FACTS.length), 12000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className={`sidebar${open?' open':''}`}>
      <div style={{ padding:'22px 16px 14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <LogoImg size={38}/>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:'#C9A84C', letterSpacing:1, lineHeight:1, textShadow:'0 0 20px rgba(201,168,76,.4)' }}>Lazuli <span style={{ fontStyle:'italic' }}>Crest</span></div>
            <div style={{ fontSize:16, fontWeight:600, color:'rgba(168,196,240,.5)', letterSpacing:3, textTransform:'uppercase', marginTop:2 }}>Health Advocacy</div>
          </div>
          {saving && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'#C9A84C', animation:'pulseGlow 1s infinite' }}/>}
        </div>
        <div style={{ background:'linear-gradient(135deg,rgba(42,92,173,.12),rgba(201,168,76,.05))', border:'1px solid rgba(42,92,173,.2)', borderRadius:13, padding:'11px 13px', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1E3A8A,#C9A84C)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff', flexShrink:0 }}>
              {(displayName||'?')[0].toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:16, color:'#F0E8FF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div>
              {isCare && <div style={{ fontSize:9, color:'rgba(201,168,76,.6)', fontWeight:600, letterSpacing:1 }}>CARE MODE</div>}
              {!isCare && <div style={{ fontSize:16, color:'rgba(168,196,240,.45)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</div>}
            </div>
          </div>
          {data.profile?.conditions && <div style={{ marginTop:7, fontSize:16, color:'rgba(168,196,240,.5)', fontWeight:500 }}>{data.profile.conditions.split(',')[0].trim()}{data.profile.conditions.includes(',')?' + more':''}</div>}
        </div>
        {/* Lazuli lapis fact */}
        <div style={{ background:'rgba(42,92,173,.07)', border:'1px solid rgba(42,92,173,.15)', borderRadius:11, padding:'9px 12px', marginBottom:8 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'rgba(201,168,76,.55)', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>✦ Lazuli History</div>
          <div style={{ fontSize:16, color:'rgba(168,196,240,.75)', lineHeight:1.6, fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif", transition:'opacity .5s' }}>{LAZULI_FACTS[factIdx]}</div>
        </div>
      </div>
      <nav style={{ padding:'4px 8px', overflowY:'auto' }}>
        {NAV.map(n => {
          const active = tab===n.id;
          return (
            <button key={n.id} onClick={()=>setTab(n.id)} className={`nav-item${active?' active':''}`} style={{ marginBottom:1 }}>
              {active && <div style={{ position:'absolute', left:0, top:'18%', bottom:'18%', width:3, background:'linear-gradient(180deg,#2A5CAD,#C9A84C)', borderRadius:'0 3px 3px 0' }}/>}
              <span style={{ fontSize:16, width:20, textAlign:'center', lineHeight:1 }}>{n.icon}</span>
              <span style={{ flex:1, fontSize:13 }}>{n.label}</span>
              {active && <span style={{ width:4, height:4, borderRadius:'50%', background:'#C9A84C', boxShadow:'0 0 6px #C9A84C' }}/>}
            </button>
          );
        })}
      </nav>
      <div style={{ padding:'10px 12px 14px', borderTop:'1px solid rgba(42,92,173,.15)', display:'flex', flexDirection:'column', gap:8, flex:1 }}>
        <DailyQuoteSidebar/>
        <button onClick={()=>signOut(auth)} className="btn btn-subtle" style={{ width:'100%', justifyContent:'center', fontSize:16, padding:'9px' }}>Sign out</button>
      </div>
    </aside>
  );
}

// ─── Shared helpers ───────────────────────────────────────────
function PH({ emoji, title, sub, children }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <span style={{ fontSize:22 }}>{emoji}</span>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:700, color:'#C9A84C', letterSpacing:.5, lineHeight:1.1, textShadow:'0 0 20px rgba(201,168,76,.25)' }}>{title}</span>
        </div>
        {sub && <div style={{ fontSize:16, color:'rgba(240,232,255,.45)', marginLeft:32 }}>{sub}</div>}
      </div>
      {children && <div style={{ flexShrink:0 }}>{children}</div>}
    </div>
  );
}
function SH({ title, emoji, onAction, actionLabel }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:13 }}>
      <div style={{ fontWeight:600, fontSize:16, color:'#F0E8FF' }}>{emoji} {title}</div>
      {onAction && <button onClick={onAction} style={{ border:'none', background:'transparent', color:'rgba(201,168,76,.58)', fontWeight:600, fontSize:16, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{actionLabel} →</button>}
    </div>
  );
}
function Nil({ icon, msg, cta, fn, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'32px 16px' }}>
      <div style={{ fontSize:32, marginBottom:10, opacity:.4 }}>{icon}</div>
      <div style={{ fontSize:16, color:'rgba(240,232,255,.3)', marginBottom:sub?4:cta?14:0 }}>{msg}</div>
      {sub && <div style={{ fontSize:16, color:'rgba(168,196,240,.35)', marginBottom:14 }}>{sub}</div>}
      {cta && fn && <button className="btn btn-gold" onClick={fn} style={{ fontSize:16, padding:'8px 18px' }}>{cta}</button>}
    </div>
  );
}
function SevDot({ v }) {
  const c = v<=3?'#6ee7b7':v<=6?'#fcd34d':'#f87171';
  return <span style={{ width:7, height:7, borderRadius:'50%', background:c, display:'inline-block', flexShrink:0, boxShadow:`0 0 4px ${c}` }}/>;
}
function NoteBlock({ title, text, color }) {
  return (
    <div style={{ marginBottom:14, padding:'13px 16px', background:'rgba(255,255,255,.03)', borderRadius:12, borderLeft:`3px solid ${color}44` }}>
      <div style={{ fontSize:16, fontWeight:700, color, textTransform:'uppercase', letterSpacing:1, marginBottom:5 }}>{title}</div>
      <div style={{ fontSize:16, color:'rgba(240,232,255,.58)', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{text}</div>
    </div>
  );
}

// Pattern detection hook — runs silently in background
function usePatternDetection(data) {
  const [pattern, setPattern] = useState(null);
  useEffect(() => {
    if (!data?.symptoms?.length) return;
    const recent = data.symptoms.slice(0, 14);
    if (recent.length < 3) return;
    // Pain trend check
    const pains = recent.slice(0,7).map(s=>s.pain||0).filter(Boolean);
    const older = recent.slice(7,14).map(s=>s.pain||0).filter(Boolean);
    if (pains.length>=3 && older.length>=3) {
      const avgNew = pains.reduce((a,b)=>a+b,0)/pains.length;
      const avgOld = older.reduce((a,b)=>a+b,0)/older.length;
      if (avgNew - avgOld >= 1.5) {
        setPattern(`Your average pain score has increased by ${(avgNew-avgOld).toFixed(1)} points over the past week. This trend may be worth discussing with your care team.`);
        return;
      }
    }
    // Low energy days check
    const lowEnergy = recent.slice(0,7).filter(s=>(s.energy||10)<4);
    if (lowEnergy.length >= 4) {
      setPattern(`You've logged low energy (below 4/10) on ${lowEnergy.length} of the last 7 tracked days. Consider mentioning this pattern at your next appointment.`);
      return;
    }
    // Recurring symptom check
    const symCounts = {};
    recent.slice(0,7).forEach(s=>(s.entries||[]).forEach(e=>{symCounts[e.symptom]=(symCounts[e.symptom]||0)+1;}));
    const top = Object.entries(symCounts).sort((a,b)=>b[1]-a[1])[0];
    if (top && top[1]>=4) {
      setPattern(`"${top[0]}" has appeared in ${top[1]} of your recent symptom logs. Tracking a recurring symptom like this builds a stronger case for your doctor.`);
    }
  }, [data?.symptoms]);
  return pattern;
}

// ─── Pattern Detection AI ─────────────────────────────────────
function PatternAlert({ data, setTab }) {
  const pattern = usePatternDetection(data);
  if (!pattern) return null;
  return (
    <div style={{ marginBottom:14, padding:'16px 20px', background:'linear-gradient(135deg,rgba(201,168,76,.1),rgba(42,92,173,.08))', border:'1.5px solid rgba(201,168,76,.35)', borderRadius:16, display:'flex', gap:14, alignItems:'flex-start', animation:'popIn .4s ease' }}>
      <div style={{ fontSize:22, flexShrink:0 }}>🔍</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'rgba(201,168,76,.8)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:6 }}>Pattern Detected by Lazuli</div>
        <div style={{ fontSize:16, color:'rgba(240,232,255,.88)', lineHeight:1.75, fontFamily:"Georgia,serif" }}>{pattern}</div>
      </div>
      <button onClick={()=>setTab('advocate')} style={{ background:'rgba(201,168,76,.1)', border:'1px solid rgba(201,168,76,.3)', borderRadius:10, padding:'7px 14px', fontSize:14, color:'#C9A84C', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap', flexShrink:0 }}>Ask Lazuli →</button>
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
  const proactive   = getProactiveGreeting(data.profile?.name, data.appointments);

  const toggleTaken = id => {
    if (isCare) return;
    upd('medications', data.medications.map(m=>{
      if(m.id!==id) return m;
      const td=m.takenDates||[];
      return {...m,takenDates:td.includes(today)?td.filter(d=>d!==today):[...td,today]};
    }));
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:16, fontWeight:600, color:'rgba(201,168,76,.5)', letterSpacing:2, textTransform:'uppercase', marginBottom:5 }}>{greet()}</div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:700, color:'#C9A84C', marginBottom:3, lineHeight:1, textShadow:'0 0 24px rgba(201,168,76,.3)' }}>{displayName}</div>
        <div style={{ color:'rgba(240,232,255,.3)', fontSize:15, marginBottom:18 }}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>

        {/* Lazuli says — prominent banner */}
        <div style={{ padding:'18px 22px', background:'linear-gradient(135deg,rgba(42,92,173,.14),rgba(201,168,76,.06))', border:'1px solid rgba(201,168,76,.2)', borderRadius:16, display:'flex', gap:14, alignItems:'flex-start', marginBottom:14 }}>
          <div style={{ fontSize:26, flexShrink:0, animation:'heartbeat 3s ease-in-out infinite' }}>💙</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'rgba(201,168,76,.65)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:5 }}>Lazuli says</div>
            <div style={{ fontSize:16, color:'rgba(240,232,255,.82)', lineHeight:1.75, fontStyle:'italic', fontFamily:"'Cormorant Garamond',serif" }}>{proactive}</div>
          </div>
        </div>
        {data.profile?.goal && <div style={{ marginTop:8, fontSize:16, color:'rgba(201,168,76,.65)', fontWeight:500, background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.14)', display:'inline-block', padding:'5px 14px', borderRadius:20 }}>✦ {data.profile.goal}</div>}
      </div>

        {/* Pattern Detection Banner */}
        <PatternAlert data={data} setTab={setTab}/>

      {/* Stat cards */}
      <div className="stats-grid">
        {[
          {label:'Symptoms',     val:data.symptoms.length,                                   icon:'◈',  color:'#A8C4F0',glow:'rgba(42,92,173,.18)',  tab:'symptoms'},
          {label:'Medications',  val:activeMeds.length,                                      icon:'◉',  color:'#6ee7b7',glow:'rgba(110,231,183,.18)',tab:'medications'},
          {label:'Infusions',    val:(data.appointments||[]).filter(a=>a.isInfusion).length, icon:'💉', color:'#f97316',glow:'rgba(249,115,22,.18)', tab:'infusion'},
          {label:'Diary Entries',val:(data.diary||[]).length,                                icon:'✑',  color:'#C9A84C',glow:'rgba(201,168,76,.18)', tab:'diary'},
        ].map((s,i)=>(
          <div key={i} className="stat-card" onClick={()=>setTab(s.tab)}>
            <div style={{ position:'absolute', top:0, right:0, width:70, height:70, borderRadius:'50%', background:`radial-gradient(circle,${s.glow} 0%,transparent 70%)`, filter:'blur(9px)' }}/>
            <div style={{ fontFamily:'serif', fontSize:20, color:s.color, marginBottom:8, opacity:.85 }}>{s.icon}</div>
            <div style={{ fontSize:34, fontWeight:700, color:s.color, lineHeight:1, marginBottom:4, fontFamily:"'Cinzel',serif" }}>{s.val}</div>
            <div style={{ fontSize:16, color:'rgba(240,232,255,.38)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Hydration preview */}
      <div style={{ marginBottom:18 }}>
        <HydrationFridge data={data} upd={upd} compact/>
      </div>

      {/* Meds today */}
      {activeMeds.length > 0 && (
        <div className="glass-card-static" style={{ padding:18, marginBottom:18 }}>
          <SH title="Today's Medications" emoji="◉" onAction={()=>setTab('medications')} actionLabel="All"/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:9 }}>
            <div style={{ fontSize:16, color:'rgba(240,232,255,.38)' }}>{totalTaken} of {activeMeds.length} taken</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#C9A84C', fontFamily:"'Cinzel',serif" }}>{medPct}%</div>
          </div>
          <div style={{ background:'rgba(255,255,255,.06)', borderRadius:5, height:5, overflow:'hidden', marginBottom:13 }}>
            <div style={{ height:'100%', width:`${medPct}%`, background:'linear-gradient(90deg,#2A5CAD,#C9A84C)', borderRadius:5, transition:'width .4s ease' }}/>
          </div>
          {activeMeds.slice(0,4).map(m=>{
            const taken=(m.takenDates||[]).includes(today);
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <button onClick={()=>toggleTaken(m.id)} style={{ width:24,height:24,borderRadius:'50%',border:`2px solid ${taken?'#6ee7b7':'rgba(42,92,173,.4)'}`,background:taken?'linear-gradient(135deg,#6ee7b7,#34d399)':'transparent',color:'#000',fontSize:16,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:isCare?'not-allowed':'pointer',fontWeight:900 }}>{taken?'✓':''}</button>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:500, color:taken?'rgba(240,232,255,.28)':'#F0E8FF', textDecoration:taken?'line-through':'none' }}>{m.name}</div>
                  <div style={{ fontSize:16, color:'rgba(240,232,255,.28)' }}>{m.dose} · {m.frequency}</div>
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
            ? <div style={{ fontSize:16, color:'rgba(240,232,255,.22)', fontStyle:'italic' }}>No entries today yet.</div>
            : todaySym.slice(0,1).map(s=>(
              <div key={s.id}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>{s.entries?.slice(0,3).map((e,i)=><span key={i} className="pill">{e.symptom}</span>)}</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[{l:'Pain',v:s.pain,c:'#f87171'},{l:'Energy',v:s.energy,c:'#6ee7b7'},{l:'Mood',v:s.mood,c:'#93c5fd'}].map(m=>(
                    <div key={m.l} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:16, fontWeight:700, color:m.c, fontFamily:"'Cinzel',serif" }}>{m.v}<span style={{ fontSize:9, color:'rgba(240,232,255,.2)' }}>/10</span></div>
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
            ? <div style={{ fontSize:16, color:'rgba(240,232,255,.22)', fontStyle:'italic' }}>No upcoming appointments.</div>
            : upcoming.map(a=>(
              <div key={a.id} style={{ display:'flex', gap:9, alignItems:'center', marginBottom:9 }}>
                <div style={{ background:'rgba(42,92,173,.12)', borderRadius:9, padding:'3px 7px', textAlign:'center', minWidth:36, flexShrink:0, border:'1px solid rgba(42,92,173,.22)' }}>
                  <div style={{ fontSize:8, fontWeight:700, color:'#2A5CAD' }}>{new Date(a.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#A8C4F0', fontFamily:"'Cinzel',serif", lineHeight:1 }}>{new Date(a.date+'T12:00:00').getDate()}</div>
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:500, color:'#F0E8FF' }}>{a.provider}</div>
                  <div style={{ fontSize:16, color:'rgba(240,232,255,.28)' }}>{a.type||'Appointment'}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── Symptoms (with illness tracking + photo upload) ──────────
function Symptoms({ data, upd }) {
  const blank = { date:todayStr(), entries:[], pain:5, energy:5, mood:5, notes:'', illnesses:[], photos:[] };
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [sel, setSel]   = useState('');
  const [custom, setCustom] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewPhoto, setViewPhoto] = useState(null);
  const photoRef = useRef();

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
  const toggleIllness = ill => setForm(f=>({ ...f, illnesses: (f.illnesses||[]).includes(ill) ? (f.illnesses||[]).filter(x=>x!==ill) : [...(f.illnesses||[]), ill] }));

  const addPhoto = file => {
    const r = new FileReader();
    r.onload = e => setForm(f=>({...f,photos:[...(f.photos||[]),{id:uid(),name:file.name,data:e.target.result}]}));
    r.readAsDataURL(file);
  };
  const removePhoto = id => setForm(f=>({...f,photos:(f.photos||[]).filter(p=>p.id!==id)}));

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
      {viewPhoto && (
        <div onClick={()=>setViewPhoto(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.9)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
          <img src={viewPhoto} alt="Symptom" style={{ maxWidth:'90vw',maxHeight:'90vh',borderRadius:12,objectFit:'contain' }}/>
        </div>
      )}
      <PH emoji="◈" title="Symptoms" sub="Track how you feel — log symptoms, vitals, and photos">
        <button className="btn btn-gold" onClick={()=>{setForm(blank);setOpen(true)}}>+ Log entry</button>
      </PH>
      {open && (
        <div className="glass-card-static" style={{ padding:26, marginBottom:22 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:17, color:'#C9A84C', marginBottom:18 }}>New Symptom Entry</div>
          <div style={{ marginBottom:14 }}><label>Date</label><input className="field" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} max={todayStr()} style={{ maxWidth:190 }}/></div>

          {/* Symptom selector */}
          <div style={{ marginBottom:14 }}>
            <label>Add Symptoms</label>
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
                <div key={e.symptom} style={{ background:'rgba(255,255,255,.03)', borderRadius:12, padding:'11px 14px', border:'1px solid rgba(42,92,173,.15)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                    <span className="pill">{e.symptom}</span>
                    <button onClick={()=>rmSym(e.symptom)} style={{ border:'none', background:'transparent', color:'rgba(240,232,255,.3)', cursor:'pointer', fontSize:16 }}>×</button>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:16, color:'rgba(240,232,255,.38)', minWidth:58 }}>Severity</span>
                    <input type="range" min={1} max={10} value={e.severity} onChange={ev=>setSev(e.symptom,+ev.target.value)} style={{ flex:1 }}/>
                    <span style={{ fontWeight:700, color:'#A8C4F0', minWidth:22, textAlign:'right', fontSize:17, fontFamily:"'Cinzel',serif" }}>{e.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Illness tracking */}
          <div style={{ marginBottom:14 }}>
            <label>Active Illness / Infection (optional)</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
              {ILLNESS_TYPES.map(ill=>(
                <button key={ill} onClick={()=>toggleIllness(ill)} style={{ padding:'5px 12px', borderRadius:20, fontSize:16, border:`1px solid ${(form.illnesses||[]).includes(ill)?'#f87171':'rgba(42,92,173,.25)'}`, background:(form.illnesses||[]).includes(ill)?'rgba(248,113,113,.12)':'rgba(255,255,255,.03)', color:(form.illnesses||[]).includes(ill)?'#f87171':'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .14s' }}>{ill}</button>
              ))}
            </div>
          </div>

          {/* Vitals */}
          <div className="three-col" style={{ marginBottom:14 }}>
            {[{k:'pain',l:'Pain',c:'#f87171'},{k:'energy',l:'Energy',c:'#6ee7b7'},{k:'mood',l:'Mood',c:'#93c5fd'}].map(s=>(
              <div key={s.k}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}><label style={{ margin:0 }}>{s.l}</label><span style={{ fontWeight:700, color:s.c, fontSize:16, fontFamily:"'Cinzel',serif" }}>{form[s.k]}</span></div>
                <input type="range" min={1} max={10} value={form[s.k]} onChange={e=>setForm(f=>({...f,[s.k]:+e.target.value}))}/>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div style={{ marginBottom:14 }}><label>Notes</label><textarea className="field" rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Anything else to note…" style={{ resize:'vertical' }}/></div>

          {/* Photo upload */}
          <div style={{ marginBottom:16 }}>
            <label>Symptom Photos (optional)</label>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginTop:6 }}>
              {(form.photos||[]).map(p=>(
                <div key={p.id} style={{ position:'relative' }}>
                  <img src={p.data} alt={p.name} style={{ width:64,height:64,objectFit:'cover',borderRadius:10,border:'1px solid rgba(42,92,173,.3)',cursor:'pointer' }} onClick={()=>setViewPhoto(p.data)}/>
                  <button onClick={()=>removePhoto(p.id)} style={{ position:'absolute',top:-6,right:-6,width:18,height:18,borderRadius:'50%',background:'#f87171',border:'none',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900 }}>×</button>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ fontSize:16,padding:'8px 14px' }} onClick={()=>photoRef.current?.click()}>📷 Add Photo</button>
              <input ref={photoRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e=>[...e.target.files].forEach(addPhoto)}/>
            </div>
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save entry</button>
          </div>
        </div>
      )}

      {data.symptoms.length>0 && (
        <div style={{ display:'flex', gap:7, marginBottom:14, flexWrap:'wrap' }}>
          {[{v:'all',l:'All time'},{v:'today',l:'Today'},{v:'week',l:'Last 7 days'}].map(f=>(
            <button key={f.v} onClick={()=>setFilter(f.v)} style={{ padding:'5px 14px', borderRadius:20, fontSize:16, border:`1px solid ${filter===f.v?'#C9A84C':'rgba(42,92,173,.25)'}`, background:filter===f.v?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)', color:filter===f.v?'#C9A84C':'rgba(240,232,255,.42)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{f.l}</button>
          ))}
        </div>
      )}
      {filtered.length===0&&!open && <Nil icon="◈" msg="No symptom entries found." cta={data.symptoms.length===0?'Log your first entry':undefined} fn={()=>setOpen(true)}/>}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {filtered.map(s=>(
          <div key={s.id} className="glass-card" style={{ padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:11, flexWrap:'wrap', gap:7 }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:600, fontSize:15, color:'#C9A84C', marginBottom:5 }}>
                  {fmtDate(s.date)}{s.date===todayStr()&&<span style={{ fontSize:16, background:'rgba(201,168,76,.12)', color:'#C9A84C', padding:'2px 8px', borderRadius:20, marginLeft:8, fontFamily:"'DM Sans',sans-serif" }}>Today</span>}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>{s.entries?.map((e,i)=><span key={i} className="pill">{e.symptom} <SevDot v={e.severity}/></span>)}</div>
                {(s.illnesses||[]).length>0 && <div style={{ marginTop:5, display:'flex', gap:4, flexWrap:'wrap' }}>{(s.illnesses||[]).map(ill=><span key={ill} style={{ fontSize:16,background:'rgba(248,113,113,.1)',color:'#f87171',padding:'2px 9px',borderRadius:20,border:'1px solid rgba(248,113,113,.25)' }}>{ill}</span>)}</div>}
              </div>
              <button className="btn btn-danger" style={{ fontSize:16, padding:'3px 9px' }} onClick={()=>del(s.id)}>Delete</button>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:(s.photos||[]).length>0?10:0 }}>
              {[{l:'Pain',v:s.pain,c:'#f87171'},{l:'Energy',v:s.energy,c:'#6ee7b7'},{l:'Mood',v:s.mood,c:'#93c5fd'}].map(m=>(
                <div key={m.l} style={{ background:'rgba(255,255,255,.03)', borderRadius:10, padding:'7px 11px', textAlign:'center', border:'1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:17, fontWeight:700, color:m.c }}>{m.v}<span style={{ fontSize:9, color:'rgba(240,232,255,.18)' }}>/10</span></div>
                  <div style={{ fontSize:16, color:m.c, opacity:.75, fontWeight:600 }}>{m.l}</div>
                </div>
              ))}
            </div>
            {(s.photos||[]).length>0 && (
              <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:8 }}>
                {(s.photos||[]).map(p=>(
                  <img key={p.id} src={p.data} alt="symptom" style={{ width:56,height:56,objectFit:'cover',borderRadius:9,border:'1px solid rgba(42,92,173,.3)',cursor:'pointer' }} onClick={()=>setViewPhoto(p.data)}/>
                ))}
              </div>
            )}
            {s.notes && <div style={{ marginTop:9, fontSize:16, color:'rgba(240,232,255,.42)', background:'rgba(255,255,255,.02)', borderRadius:9, padding:'7px 12px', lineHeight:1.6, borderLeft:'2px solid rgba(42,92,173,.35)' }}>{s.notes}</div>}
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
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:17, color:'#C9A84C', marginBottom:18 }}>{form.id?'Edit':'New'} Medication</div>
          <div className="two-col" style={{ marginBottom:13 }}>
            <div><label>Name</label><input className="field" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Lyrica"/></div>
            <div><label>Dose</label><input className="field" value={form.dose} onChange={e=>setForm(f=>({...f,dose:e.target.value}))} placeholder="e.g. 75mg"/></div>
            <div><label>Frequency</label><select className="field" value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>{['Daily','Twice daily','Three times daily','Weekly','As needed','Every other day','Monthly'].map(x=><option key={x}>{x}</option>)}</select></div>
            <div><label>Time</label><input className="field" type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></div>
          </div>
          <div style={{ marginBottom:13 }}><label>Notes</label><textarea className="field" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{ resize:'vertical' }}/></div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:17 }}>
            <input type="checkbox" id="mact" checked={form.active} onChange={e=>setForm(f=>({...f,active:e.target.checked}))}/>
            <label htmlFor="mact" style={{ margin:0, textTransform:'none', fontSize:16, fontWeight:500, color:'rgba(240,232,255,.7)', letterSpacing:0 }}>Currently active</label>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save</button>
          </div>
        </div>
      )}
      {data.medications.length===0&&!open && <Nil icon="◉" msg="No medications yet." cta="Add your first" fn={()=>setOpen(true)}/>}
      {active.length>0 && <><div style={{ fontSize:16,fontWeight:700,color:'rgba(201,168,76,.4)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10 }}>Active</div>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:22 }}>
          {active.map(m=>{const taken=(m.takenDates||[]).includes(todayStr());return(
            <div key={m.id} className="glass-card" style={{ padding:14,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',border:`1px solid ${taken?'rgba(110,231,183,.16)':'rgba(42,92,173,.15)'}` }}>
              <button onClick={()=>toggleTaken(m.id)} style={{ width:30,height:30,borderRadius:'50%',border:`2px solid ${taken?'#6ee7b7':'rgba(42,92,173,.35)'}`,background:taken?'linear-gradient(135deg,#6ee7b7,#34d399)':'transparent',color:'#000',fontSize:16,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontWeight:900 }}>{taken?'✓':''}</button>
              <div style={{ flex:1,minWidth:100 }}>
                <div style={{ fontWeight:600,fontSize:16,color:taken?'rgba(240,232,255,.28)':'#F0E8FF',textDecoration:taken?'line-through':'none' }}>{m.name}</div>
                <div style={{ fontSize:16,color:'rgba(240,232,255,.3)' }}>{m.dose} · {m.frequency}{m.time?` · ${m.time}`:''}</div>
              </div>
              {taken&&<span style={{ fontSize:16,background:'rgba(110,231,183,.1)',color:'#6ee7b7',padding:'2px 9px',borderRadius:20,fontWeight:600 }}>Taken ✓</span>}
              <div style={{ display:'flex',gap:6 }}>
                <button className="btn btn-ghost" style={{ fontSize:16,padding:'4px 10px' }} onClick={()=>edit(m)}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize:16,padding:'4px 10px' }} onClick={()=>del(m.id)}>Remove</button>
              </div>
            </div>
          );})}
        </div>
      </>}
      {inactive.length>0 && <><div style={{ fontSize:16,fontWeight:700,color:'rgba(42,92,173,.4)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:9 }}>Inactive</div>
        <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
          {inactive.map(m=>(
            <div key={m.id} className="glass-card-static" style={{ padding:13,display:'flex',alignItems:'center',gap:10,opacity:.55 }}>
              <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:16,color:'#F0E8FF' }}>{m.name} — {m.dose}</div></div>
              <button className="btn btn-ghost" style={{ fontSize:16,padding:'3px 9px' }} onClick={()=>edit(m)}>Edit</button>
              <button className="btn btn-danger" style={{ fontSize:16,padding:'3px 9px' }} onClick={()=>del(m.id)}>Remove</button>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}

// ─── Appointments (with types, physician, time, auto-past) ─────
function Appointments({ data, upd }) {
  const today = todayStr();
  const blank = { id:'', date:'', time:'', provider:'', physicianType:'', customPhysician:'', type:'', notes:'', preNotes:'', postNotes:'', followUp:'', isInfusion:false };
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [showPast, setShowPast] = useState(false);

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
  const upcoming = nonInfusion.filter(a=>a.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
  const past     = nonInfusion.filter(a=>a.date<today).sort((a,b)=>b.date.localeCompare(a.date));

  const share = a => {
    const text = `📅 Appointment Summary\n\n${a.provider}${a.physicianType?' ('+a.physicianType+')':''}\n${fmtDate(a.date)}${a.time?' at '+a.time:''}\nType: ${a.type||'Appointment'}\n\n${a.preNotes?'Pre-notes:\n'+a.preNotes+'\n\n':''}${a.postNotes?'Notes:\n'+a.postNotes+'\n\n':''}${a.followUp?'Follow-up:\n'+a.followUp:''}`.trim();
    if(navigator.share){navigator.share({title:'Appointment Summary',text}).catch(()=>{});}
    else{navigator.clipboard.writeText(text).then(()=>alert('Copied to clipboard!'));}
  };

  if (view) {
    const a = data.appointments.find(ap=>ap.id===view);
    if (!a) { setView(null); return null; }
    const isPast = a.date < today;
    return (
      <div className="slide-in">
        <button onClick={()=>setView(null)} style={{ border:'none',background:'transparent',color:'rgba(201,168,76,.6)',fontWeight:600,fontSize:16,cursor:'pointer',marginBottom:16,fontFamily:"'DM Sans',sans-serif" }}>← Back</button>
        <div className="glass-card-static" style={{ padding:26 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:9 }}>
            <div>
              <div style={{ fontFamily:"'Cinzel',serif",fontWeight:600,fontSize:21,color:'#C9A84C' }}>{a.provider}</div>
              {a.physicianType && <div style={{ fontSize:16,color:'rgba(168,196,240,.6)',marginTop:3 }}>{a.physicianType==='Custom…'?a.customPhysician:a.physicianType}</div>}
              <div style={{ fontSize:16,color:'rgba(240,232,255,.32)',marginTop:4 }}>{fmtDate(a.date)}{a.time?' · '+a.time:''} · {a.type||'Appointment'}</div>
              {isPast && <span style={{ marginTop:6,display:'inline-block',fontSize:16,background:'rgba(42,92,173,.12)',color:'#A8C4F0',padding:'2px 9px',borderRadius:20,fontWeight:600 }}>Past appointment</span>}
            </div>
            <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
              <button className="btn btn-lapis" style={{ fontSize:16,padding:'6px 12px' }} onClick={()=>share(a)}>📤 Share</button>
              <button className="btn btn-ghost" style={{ fontSize:11 }} onClick={()=>edit(a)}>Edit</button>
              <button className="btn btn-danger" style={{ fontSize:11 }} onClick={()=>del(a.id)}>Delete</button>
            </div>
          </div>
          {a.preNotes&&<NoteBlock title="Pre-Appointment Notes" text={a.preNotes} color="#93c5fd"/>}
          {a.postNotes&&<NoteBlock title="Appointment Notes" text={a.postNotes} color="#C9A84C"/>}
          {a.followUp&&<NoteBlock title="Follow-Up Actions" text={a.followUp} color="#6ee7b7"/>}
          {!a.preNotes&&!a.postNotes&&!a.followUp&&<p style={{ color:'rgba(240,232,255,.3)',fontSize:14 }}>No notes yet. Click Edit to add notes.</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PH emoji="◷" title="Appointments" sub="Track every visit — before, during, and after">
        <button className="btn btn-gold" onClick={()=>{setForm(blank);setOpen(true)}}>+ Add</button>
      </PH>
      {open && (
        <div className="glass-card-static" style={{ padding:26, marginBottom:22 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:17, color:'#C9A84C', marginBottom:18 }}>{form.id?'Edit':'New'} Appointment</div>
          <div className="two-col" style={{ marginBottom:13 }}>
            <div><label>Date</label><input className="field" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
            <div><label>Time</label><input className="field" type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></div>
            <div><label>Provider / Doctor Name</label><input className="field" value={form.provider} onChange={e=>setForm(f=>({...f,provider:e.target.value}))} placeholder="e.g. Dr. Smith"/></div>
            <div>
              <label>Physician Type</label>
              <select className="field" value={form.physicianType} onChange={e=>setForm(f=>({...f,physicianType:e.target.value}))}>
                <option value="">Select type…</option>
                {PHYSICIAN_TYPES.map(x=><option key={x}>{x}</option>)}
              </select>
            </div>
            {form.physicianType==='Custom…' && (
              <div style={{ gridColumn:'1/-1' }}><label>Custom Physician Type</label><input className="field" value={form.customPhysician} onChange={e=>setForm(f=>({...f,customPhysician:e.target.value}))} placeholder="e.g. Sleep Specialist"/></div>
            )}
            <div>
              <label>Appointment Type</label>
              <select className="field" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                <option value="">Select type…</option>
                {APPOINTMENT_TYPES.map(x=><option key={x}>{x}</option>)}
              </select>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:8,paddingTop:24 }}>
              <input type="checkbox" id="isinf" checked={form.isInfusion} onChange={e=>setForm(f=>({...f,isInfusion:e.target.checked}))}/>
              <label htmlFor="isinf" style={{ margin:0,textTransform:'none',fontSize:16,letterSpacing:0 }}>💉 This is an infusion</label>
            </div>
          </div>
          <div style={{ marginBottom:13 }}><label>Pre-appointment notes</label><textarea className="field" rows={2} value={form.preNotes} onChange={e=>setForm(f=>({...f,preNotes:e.target.value}))} placeholder="Questions to ask, how you're feeling beforehand…" style={{ resize:'vertical' }}/></div>
          <div style={{ marginBottom:13 }}><label>Appointment notes</label><textarea className="field" rows={2} value={form.postNotes} onChange={e=>setForm(f=>({...f,postNotes:e.target.value}))} placeholder="What happened, what was discussed…" style={{ resize:'vertical' }}/></div>
          <div style={{ marginBottom:18 }}><label>Follow-up actions</label><textarea className="field" rows={2} value={form.followUp} onChange={e=>setForm(f=>({...f,followUp:e.target.value}))} placeholder="Labs ordered, referrals, changes to medications…" style={{ resize:'vertical' }}/></div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save</button>
          </div>
        </div>
      )}
      {nonInfusion.length===0&&!open&&<Nil icon="◷" msg="No appointments yet." cta="Add first" fn={()=>setOpen(true)}/>}
      {upcoming.length>0&&<>
        <div style={{ fontSize:16,fontWeight:700,color:'rgba(201,168,76,.4)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10 }}>Upcoming</div>
        <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:22 }}>
          {upcoming.map(a=>(
            <div key={a.id} className="glass-card" style={{ padding:14,display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap' }} onClick={()=>setView(a.id)}>
              <div style={{ background:'rgba(42,92,173,.12)',borderRadius:11,padding:'5px 9px',textAlign:'center',minWidth:42,flexShrink:0,border:'1px solid rgba(42,92,173,.22)' }}>
                <div style={{ fontSize:9,fontWeight:700,color:'#2A5CAD' }}>{new Date(a.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</div>
                <div style={{ fontSize:18,fontWeight:700,color:'#A8C4F0',fontFamily:"'Cinzel',serif",lineHeight:1 }}>{new Date(a.date+'T12:00:00').getDate()}</div>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600,fontSize:16,color:'#F0E8FF',marginBottom:1 }}>{a.provider}</div>
                <div style={{ fontSize:16,color:'rgba(240,232,255,.32)' }}>{a.type||'Appointment'}{a.time?' · '+a.time:''}</div>
                {a.physicianType && <div style={{ fontSize:16,color:'rgba(168,196,240,.45)' }}>{a.physicianType==='Custom…'?a.customPhysician:a.physicianType}</div>}
              </div>
              {(a.preNotes||a.postNotes)&&<span style={{ fontSize:16,background:'rgba(42,92,173,.12)',color:'#A8C4F0',padding:'2px 8px',borderRadius:20,fontWeight:600 }}>Has notes</span>}
              <span style={{ fontSize:16,color:'rgba(240,232,255,.2)' }}>›</span>
            </div>
          ))}
        </div>
      </>}
      {past.length>0&&<>
        <button onClick={()=>setShowPast(p=>!p)} style={{ fontSize:16,fontWeight:700,color:'rgba(42,92,173,.5)',textTransform:'uppercase',letterSpacing:1.5,margin:'0 0 10px',background:'transparent',border:'none',cursor:'pointer',fontFamily:"'DM Sans',sans-serif',display:'flex',gap:6,alignItems:'center'" }}>
          {showPast?'▾':'▸'} Past Appointments ({past.length})
        </button>
        {showPast && (
          <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
            {past.map(a=>(
              <div key={a.id} className="glass-card" style={{ padding:14,display:'flex',alignItems:'center',gap:12,cursor:'pointer',flexWrap:'wrap',opacity:.72 }} onClick={()=>setView(a.id)}>
                <div style={{ background:'rgba(42,92,173,.08)',borderRadius:11,padding:'5px 9px',textAlign:'center',minWidth:42,flexShrink:0,border:'1px solid rgba(42,92,173,.15)' }}>
                  <div style={{ fontSize:9,fontWeight:700,color:'#2A5CAD' }}>{new Date(a.date+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</div>
                  <div style={{ fontSize:18,fontWeight:700,color:'#A8C4F0',fontFamily:"'Cinzel',serif",lineHeight:1 }}>{new Date(a.date+'T12:00:00').getDate()}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600,fontSize:16,color:'#F0E8FF' }}>{a.provider}</div>
                  <div style={{ fontSize:16,color:'rgba(240,232,255,.3)' }}>{a.type||'Appointment'}</div>
                </div>
                <span style={{ fontSize:16,color:'rgba(240,232,255,.2)' }}>›</span>
              </div>
            ))}
          </div>
        )}
      </>}
    </div>
  );
}

// ─── Diary (real notebook look) ───────────────────────────────
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
  const [page,setPage]=useState(0);
  const ENTRIES_PER_PAGE = 5;

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

  const sorted = [...diary].sort((a,b)=>b.date.localeCompare(a.date));
  const paged  = sorted.slice(page*ENTRIES_PER_PAGE, (page+1)*ENTRIES_PER_PAGE);
  const maxPage= Math.ceil(sorted.length/ENTRIES_PER_PAGE)-1;

  if(view){
    const e=diary.find(d=>d.id===view);
    if(!e){setView(null);return null;}
    return(
      <div className="slide-in">
        <button onClick={()=>setView(null)} style={{ border:'none',background:'transparent',color:'rgba(201,168,76,.6)',fontWeight:600,fontSize:16,cursor:'pointer',marginBottom:16,fontFamily:"'DM Sans',sans-serif" }}>← Back to diary</button>
        <div className="diary-book diary-lines">
          {/* Spine dots */}
          <div style={{ position:'absolute',left:0,top:0,bottom:0,width:72,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:18,zIndex:2,pointerEvents:'none' }}>
            {[...Array(6)].map((_,i)=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:'rgba(201,168,76,.22)' }}/>)}
          </div>
          <div style={{ padding:'24px 28px 18px 88px', borderBottom:'1px solid rgba(42,92,173,.1)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:9 }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:'rgba(201,168,76,.5)',letterSpacing:2,textTransform:'uppercase',marginBottom:4 }}>{fmtDate(e.date)}</div>
                <div style={{ fontFamily:e.font||DIARY_FONTS[0].value,fontSize:(e.fontSize||18)+4,color:'#C9A84C',lineHeight:1.2 }}>{e.title}</div>
                {e.mood&&<div style={{ marginTop:6,fontSize:16,color:'rgba(168,196,240,.65)' }}>{e.mood}</div>}
              </div>
              <div style={{ display:'flex',gap:7 }}>
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>openEdit(e)}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize:12 }} onClick={()=>del(e.id)}>Delete</button>
              </div>
            </div>
          </div>
          <div style={{ padding:'22px 28px 36px 88px', minHeight:320 }}>
            <div style={{ fontFamily:e.font||DIARY_FONTS[0].value,fontSize:e.fontSize||18,color:'rgba(240,232,255,.85)',lineHeight:'38px',whiteSpace:'pre-wrap' }}>{e.body}</div>
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
      <div style={{ marginBottom:18,padding:'13px 18px',background:'rgba(42,92,173,.06)',border:'1px solid rgba(42,92,173,.12)',borderRadius:14,fontFamily:"'Cormorant Garamond',serif",fontSize:15,color:'rgba(168,196,240,.6)',fontStyle:'italic',lineHeight:1.7 }}>
        💜 The most healing act is to be truly witnessed. This diary sees you, exactly as you are.
      </div>
      {open&&(
        <div className="diary-book" style={{ marginBottom:24,overflow:'hidden' }}>
          <div style={{ position:'absolute',left:0,top:0,bottom:0,width:72,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:18,zIndex:2,pointerEvents:'none' }}>
            {[...Array(6)].map((_,i)=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:'rgba(201,168,76,.22)' }}/>)}
          </div>
          <div style={{ padding:'14px 18px 14px 88px',borderBottom:'1px solid rgba(42,92,173,.1)',display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap',background:'rgba(0,0,0,.18)' }}>
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
              <input type="date" className="field" value={date} onChange={e=>setDate(e.target.value)} style={{ padding:'6px 11px',fontSize:16,width:'auto' }}/>
            </div>
          </div>
          <div style={{ padding:'14px 18px 0 88px' }}>
            <input className="field" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Entry title (optional)…" style={{ fontFamily:font,fontSize:fontSize+2,background:'transparent',border:'none',borderBottom:'1px solid rgba(42,92,173,.12)',borderRadius:0,padding:'4px 0',color:'#C9A84C',width:'100%',outline:'none' }}/>
          </div>
          <div className="diary-lines" style={{ paddingLeft:88,paddingRight:18,paddingTop:6,paddingBottom:8 }}>
            <textarea value={body} onChange={e=>setBody(e.target.value)} className="diary-textarea" style={{ fontFamily:font,fontSize:fontSize }} placeholder="Write freely — this is your space. No judgment, no rules. Just you…" autoFocus/>
          </div>
          <div style={{ padding:'10px 18px 14px 88px',display:'flex',gap:8,justifyContent:'flex-end' }}>
            <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-gold" onClick={save}>Save to diary</button>
          </div>
        </div>
      )}
      {diary.length===0&&!open&&<Nil icon="✑" msg="Your diary is empty." sub="Write anything — how you feel, what you wish your doctor understood." cta="Write first entry" fn={openNew}/>}
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {paged.map(e=>(
          <div key={e.id} className="diary-entry-card" onClick={()=>setView(e.id)} style={{ position:'relative', paddingLeft:22, borderLeft:'3px solid rgba(42,92,173,.3)' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6,flexWrap:'wrap',gap:7 }}>
              <div>
                <div style={{ fontSize:16,color:'rgba(201,168,76,.5)',fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',marginBottom:3 }}>{fmtDate(e.date)}</div>
                <div style={{ fontFamily:e.font||DIARY_FONTS[0].value,fontSize:(e.fontSize||18)+2,color:'#C9A84C',lineHeight:1.2 }}>{e.title}</div>
                {e.mood&&<div style={{ fontSize:16,color:'rgba(168,196,240,.55)',marginTop:4 }}>{e.mood}</div>}
              </div>
              <span style={{ fontSize:18,color:'rgba(240,232,255,.2)' }}>›</span>
            </div>
            <div style={{ fontFamily:e.font||DIARY_FONTS[0].value,fontSize:e.fontSize||16,color:'rgba(240,232,255,.32)',lineHeight:1.85,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>{e.body}</div>
          </div>
        ))}
      </div>
      {maxPage>0 && (
        <div style={{ display:'flex',justifyContent:'center',gap:9,marginTop:18 }}>
          <button className="btn btn-ghost" style={{ fontSize:16,padding:'6px 14px' }} onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>← Prev</button>
          <span style={{ fontSize:16,color:'rgba(240,232,255,.28)',alignSelf:'center' }}>Page {page+1} of {maxPage+1}</span>
          <button className="btn btn-ghost" style={{ fontSize:16,padding:'6px 14px' }} onClick={()=>setPage(p=>Math.min(maxPage,p+1))} disabled={page===maxPage}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ─── AI Diet ──────────────────────────────────────────────────
const DIET_PROTOCOLS = [
  'AIP','Mediterranean','Low-FODMAP','Anti-Inflammatory','Keto','Gluten-Free',
  'Dairy-Free','Paleo','Vegan','Low-Histamine','SIBO','Elimination',
];

function AIDiet({ data, upd }) {
  const [protocol, setProtocol] = useState(data.dietProtocol||'');
  const [mealLog, setMealLog]   = useState('');
  const [mealTime, setMealTime] = useState('breakfast');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply]   = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [showLog, setShowLog]   = useState(false);

  const today = todayStr();
  const todayMeals = (data.dietLogs||[]).filter(l=>l.date===today);

  const saveProtocol = p => {
    setProtocol(p);
    upd('dietProtocol', p);
  };

  const logMeal = () => {
    if (!mealLog.trim()) return;
    const entry = { id:uid(), date:today, time:mealTime, text:mealLog.trim(), timestamp:Date.now() };
    upd('dietLogs', [...(data.dietLogs||[]), entry]);
    setMealLog(''); setShowLog(false);
  };

  const askAI = async () => {
    if (!aiPrompt.trim()) return;
    setLoadingAI(true); setAiReply('');
    try {
      const sys = `You are a nutritionist specializing in chronic illness dietary management. The user follows a ${protocol||'general healthy'} diet. Their conditions: ${data.profile?.conditions||'not specified'}. Their recent meals: ${todayMeals.map(m=>m.text).join(', ')||'none logged today'}. Be practical, specific, and kind. Flag any foods that conflict with their protocol.`;
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:[{role:'user',content:aiPrompt}], system:sys, userId:data.uid }),
      });
      const json = await res.json();
      setAiReply(json.content?.[0]?.text || json.text || 'Sorry, I could not get a response.');
    } catch { setAiReply('Connection error — please try again.'); }
    setLoadingAI(false);
  };

  return (
    <div>
      <PH emoji="✿" title="AI Nutrition" sub="Log meals, follow your protocol, and let Lazuli curate a diet for your health needs"/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }} className="two-col">
        {/* Left: Diet Protocol */}
        <div className="glass-card-static" style={{ padding:22 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:17, color:'#C9A84C', marginBottom:14 }}>My Diet Protocol</div>
          <div style={{ fontSize:15, color:'rgba(240,232,255,.5)', marginBottom:14 }}>Select your current dietary approach</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {DIET_PROTOCOLS.map(p=>(
              <button key={p} onClick={()=>saveProtocol(p)} style={{ padding:'6px 14px', borderRadius:20, fontSize:15, border:`1.5px solid ${protocol===p?'#C9A84C':'rgba(42,92,173,.3)'}`, background:protocol===p?'rgba(201,168,76,.15)':'rgba(4,16,52,.8)', color:protocol===p?'#C9A84C':'rgba(240,232,255,.65)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .15s' }}>
                {p}
              </button>
            ))}
          </div>
          {protocol && (
            <div style={{ marginTop:14, padding:'12px 15px', background:'rgba(110,231,183,.07)', border:'1px solid rgba(110,231,183,.2)', borderRadius:11 }}>
              <div style={{ fontSize:15, color:'#6ee7b7', fontWeight:600 }}>{protocol} Protocol Active ✓</div>
              <div style={{ fontSize:14, color:'rgba(240,232,255,.5)', marginTop:4, lineHeight:1.6 }}>Lazuli will flag conflicting ingredients and suggest compliant recipes based on your logged symptoms and known triggers.</div>
            </div>
          )}
        </div>

        {/* Right: Today's Meals */}
        <div className="glass-card-static" style={{ padding:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:17, color:'#C9A84C' }}>Today's Meals</div>
            <button className="btn btn-gold" style={{ fontSize:14, padding:'7px 16px' }} onClick={()=>setShowLog(s=>!s)}>+ Log meal</button>
          </div>
          {showLog && (
            <div style={{ marginBottom:14, padding:'14px 16px', background:'rgba(42,92,173,.08)', border:'1px solid rgba(42,92,173,.2)', borderRadius:12, animation:'popIn .2s ease' }}>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                {['breakfast','lunch','dinner','snack'].map(t=>(
                  <button key={t} onClick={()=>setMealTime(t)} style={{ padding:'5px 12px', borderRadius:20, fontSize:14, border:`1px solid ${mealTime===t?'#C9A84C':'rgba(42,92,173,.25)'}`, background:mealTime===t?'rgba(201,168,76,.1)':'transparent', color:mealTime===t?'#C9A84C':'rgba(240,232,255,.5)', cursor:'pointer', textTransform:'capitalize', fontFamily:"'DM Sans',sans-serif" }}>
                    {t}
                  </button>
                ))}
              </div>
              <textarea className="field" rows={2} value={mealLog} onChange={e=>setMealLog(e.target.value)} placeholder="What did you eat? e.g. Salmon with arugula, olive oil dressing" style={{ resize:'none', marginBottom:10 }}/>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-gold" style={{ fontSize:14 }} onClick={logMeal}>Save</button>
                <button className="btn btn-ghost" style={{ fontSize:14 }} onClick={()=>setShowLog(false)}>Cancel</button>
              </div>
            </div>
          )}
          {todayMeals.length === 0 && !showLog && <div style={{ fontSize:15, color:'rgba(240,232,255,.28)', fontStyle:'italic', textAlign:'center', padding:'20px 0' }}>No meals logged today yet.</div>}
          {todayMeals.map(m=>(
            <div key={m.id} style={{ marginBottom:10, padding:'10px 14px', background:'rgba(255,255,255,.03)', borderRadius:11, border:'1px solid rgba(42,92,173,.15)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:14, fontWeight:700, color:'rgba(201,168,76,.7)', textTransform:'capitalize' }}>{m.time}</span>
                <span style={{ fontSize:13, color:'rgba(240,232,255,.3)' }}>{new Date(m.timestamp).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <div style={{ fontSize:16, color:'rgba(240,232,255,.75)', lineHeight:1.6 }}>{m.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Recipe Curator */}
      <div className="glass-card-static" style={{ padding:22 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#C9A84C,#E8C96B)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>✦</div>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:17, color:'#C9A84C' }}>Lazuli Recipe Curator</div>
            <div style={{ fontSize:15, color:'rgba(240,232,255,.45)', marginTop:2 }}>Tell Lazuli what you have or what you're craving. I'll suggest recipes that fit your {protocol||'dietary'} protocol and avoid your known triggers.</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <input className="field" value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder={`e.g. "AIP breakfast with sweet potato" or "What can I eat for fatigue?"`} onKeyDown={e=>e.key==='Enter'&&askAI()} style={{ flex:1 }}/>
          <button className="btn btn-gold" style={{ flexShrink:0, fontSize:15 }} onClick={askAI} disabled={loadingAI||!aiPrompt.trim()}>
            {loadingAI ? <span style={{ display:'inline-block', width:15, height:15, border:'2px solid rgba(0,0,0,.3)', borderTopColor:'#000', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> : 'Get recipes'}
          </button>
        </div>
        {aiReply && (
          <div style={{ padding:'16px 18px', background:'rgba(42,92,173,.08)', border:'1px solid rgba(42,92,173,.2)', borderRadius:14, animation:'popIn .3s ease' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'rgba(201,168,76,.7)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>✦ Suggested by Lazuli</div>
            <div style={{ fontSize:16, color:'rgba(240,232,255,.82)', lineHeight:1.85, whiteSpace:'pre-wrap', fontFamily:"Georgia,serif" }}>{aiReply}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Documents (with view + download) ────────────────────────
function Documents({ data, upd }) {
  const [dtype,setDtype]=useState('');
  const [note,setNote]=useState('');
  const [drag,setDrag]=useState(false);
  const [viewDoc,setViewDoc]=useState(null);
  const fileRef=useRef();
  const ACCEPTED='.pdf,.png,.jpg,.jpeg,.heic,.heif';
  const process=file=>{
    if(!file) return;
    const r=new FileReader();
    r.onload=e=>{
      const doc={id:uid(),name:file.name,type:dtype,notes:note,data:e.target.result,uploadDate:todayStr(),size:Math.round(file.size/1024)+'KB'};
      upd('documents',[doc,...data.documents]);
    };
    r.onerror=()=>alert(`Could not read ${file.name}.`);
    r.readAsDataURL(file);
  };
  const del=id=>{if(window.confirm('Remove?'))upd('documents',data.documents.filter(d=>d.id!==id));};
  const openDoc=d=>{
    const isImg=/\.(jpg|jpeg|png|heic|heif)$/i.test(d.name);
    if(isImg){setViewDoc(d);}
    else{
      const win=window.open();
      win.document.write(`<html><body style="margin:0;background:#000"><iframe src="${d.data}" style="width:100vw;height:100vh;border:none"></iframe></body></html>`);
    }
  };
  const downloadDoc=d=>{
    const a=document.createElement('a');
    a.href=d.data;
    a.download=d.name;
    a.click();
  };

  return(
    <div>
      {viewDoc && (
        <div onClick={()=>setViewDoc(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:1000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
          <div style={{ display:'flex',gap:10,marginBottom:12 }} onClick={e=>e.stopPropagation()}>
            <button className="btn btn-gold" style={{ fontSize:12 }} onClick={()=>downloadDoc(viewDoc)}>⬇ Download</button>
            <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={()=>setViewDoc(null)}>✕ Close</button>
          </div>
          <img src={viewDoc.data} alt={viewDoc.name} style={{ maxWidth:'90vw',maxHeight:'80vh',borderRadius:12,objectFit:'contain' }}/>
        </div>
      )}
      <PH emoji="◫" title="Documents" sub="Store lab results, prescriptions, and medical records — view and download anytime"/>
      <div className="glass-card-static" style={{ padding:22,marginBottom:20 }}>
        <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);[...e.dataTransfer.files].forEach(process);}} style={{ border:`2px dashed ${drag?'#C9A84C':'rgba(42,92,173,.28)'}`,borderRadius:14,padding:'26px 18px',textAlign:'center',marginBottom:16,transition:'all .2s',background:drag?'rgba(201,168,76,.04)':'transparent',cursor:'pointer' }} onClick={()=>fileRef.current?.click()}>
          <div style={{ fontSize:28,marginBottom:8,opacity:.45 }}>📎</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:'#C9A84C',marginBottom:3 }}>Drag & drop files here</div>
          <div style={{ fontSize:16,color:'rgba(240,232,255,.28)',marginBottom:13 }}>PDF, PNG, JPG, HEIC supported</div>
          <button className="btn btn-gold" onClick={e=>{e.stopPropagation();fileRef.current?.click();}} style={{ fontSize:13 }}>Browse files</button>
          <input ref={fileRef} type="file" multiple accept={ACCEPTED} style={{ display:'none' }} onChange={e=>[...e.target.files].forEach(process)}/>
        </div>
        <div className="two-col">
          <div><label>Document type</label><select className="field" value={dtype} onChange={e=>setDtype(e.target.value)}>{['','Lab Results','Imaging / X-Ray','Prescription','Doctor Notes','Insurance','Referral','Procedure Report','Biopsy Results','Surgery Notes','Other'].map(x=><option key={x} value={x}>{x||'Select type…'}</option>)}</select></div>
          <div><label>Notes</label><input className="field" value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Blood work from March 2025"/></div>
        </div>
      </div>
      {data.documents.length===0&&<Nil icon="◫" msg="No documents uploaded yet." sub="All files stored securely in your account."/>}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {data.documents.map(d=>(
          <div key={d.id} className="glass-card" style={{ padding:15,display:'flex',gap:13,alignItems:'flex-start',flexWrap:'wrap' }}>
            <div style={{ fontSize:24,flexShrink:0,opacity:.7 }}>{/\.pdf$/i.test(d.name)?'📄':/\.(jpg|jpeg|png|heic|heif)$/i.test(d.name)?'🖼️':'📎'}</div>
            <div style={{ flex:1,minWidth:110 }}>
              <div style={{ fontWeight:600,fontSize:16,color:'#F0E8FF' }}>{d.name}</div>
              <div style={{ fontSize:16,color:'rgba(240,232,255,.28)',marginTop:2 }}>{d.type||'Document'} · {fmtDate(d.uploadDate)}{d.size?' · '+d.size:''}</div>
              {d.notes&&<div style={{ fontSize:16,color:'rgba(240,232,255,.38)',marginTop:3 }}>{d.notes}</div>}
            </div>
            <div style={{ display:'flex',gap:6,flexShrink:0 }}>
              <button className="btn btn-lapis" style={{ fontSize:16,padding:'5px 11px' }} onClick={()=>openDoc(d)}>👁 View</button>
              <button className="btn btn-ghost" style={{ fontSize:16,padding:'5px 11px' }} onClick={()=>downloadDoc(d)}>⬇</button>
              <button className="btn btn-danger" style={{ fontSize:16,padding:'5px 11px' }} onClick={()=>del(d.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hydration Station (own page) ─────────────────────────────
function Hydration({ data, upd }) {
  return (
    <div>
      <PH emoji="💧" title="Hydration Station" sub="Track your daily fluid intake — your body will thank you"/>
      <HydrationFridge data={data} upd={upd}/>
    </div>
  );
}

// ─── Mindfulness (breathing circle + affirmations) ────────────
const MINDFUL_QUOTES = [
  { text:'You are doing better than you think.', attr:'Lazuli' },
  { text:'This moment is enough. You are enough.', attr:'Lazuli' },
  { text:'Breathe. You have survived every hard day so far.', attr:'Lazuli' },
  { text:'Your nervous system deserves gentleness today.', attr:'Lazuli' },
  { text:'Rest is not failure. Rest is medicine.', attr:'Lazuli' },
  { text:'Inhale strength. Exhale what you cannot control.', attr:'Lazuli' },
  { text:'Your body is not broken. It is communicating.', attr:'Lazuli' },
  { text:'Peace is available to you right now, in this breath.', attr:'Lazuli' },
];

const SOUNDSCAPES = [
  { id:'rain',    label:'Rainfall',      emoji:'🌧',  freq:432, desc:'Deep relaxing rain' },
  { id:'ocean',   label:'Ocean Waves',   emoji:'🌊',  freq:396, desc:'Rhythmic tide' },
  { id:'forest',  label:'Forest Birds',  emoji:'🌿',  freq:528, desc:'Morning birdsong' },
  { id:'binaural',label:'Binaural Beat', emoji:'🎵',  freq:40,  desc:'Focus: 40Hz gamma' },
  { id:'tibetan', label:'Tibetan Bowl',  emoji:'🔔',  freq:174, desc:'Grounding tone' },
  { id:'white',   label:'White Noise',   emoji:'📡',  freq:0,   desc:'Masking, focus' },
];

function Mindfulness() {
  const TOOLS = [
    { id:'breathing',  icon:'🫁', label:'Box Breathing'    },
    { id:'affirmations',icon:'💙',label:'Affirmations'      },
    { id:'tension',    icon:'🧘',  label:'Tension Release'  },
    { id:'imagery',    icon:'🌅', label:'Guided Imagery'   },
    { id:'gratitude',  icon:'🫙', label:'Gratitude Jar'    },
    { id:'worry',      icon:'🪨', label:'Worry Stone'      },
    { id:'zen',        icon:'🪴', label:'Zen Garden'       },
    { id:'soundscapes',icon:'🎧',label:'Soundscapes'       },
    { id:'fountain',   icon:'⛲',label:'Fountain Wishes'   },
  ];

  const PHASES = [
    { label:'Breathe In',  dur:4, color:'#3B82F6',  scale:1.22 },
    { label:'Hold',        dur:4, color:'#C9A84C',  scale:1.22 },
    { label:'Breathe Out', dur:6, color:'#7B2FBE',  scale:0.72 },
    { label:'Rest',        dur:2, color:'#6ee7b7',  scale:0.72 },
  ];

  const [tool, setTool]           = useState('breathing');
  const [active, setActive]       = useState(false);
  const [phaseIdx, setPhaseIdx]   = useState(0);
  const [secs, setSecs]           = useState(PHASES[0].dur);
  const [quoteIdx, setQuoteIdx]   = useState(0);
  const [quoteFade, setQuoteFade] = useState(true);

  // Gratitude jar
  const [gratEntries, setGratEntries] = useState([]);
  const [gratInput, setGratInput]     = useState('');

  // Worry stone rubs
  const [rubs, setRubs]       = useState(0);
  const [rubGlow, setRubGlow] = useState(false);

  // Zen garden
  const [zenLines, setZenLines]   = useState([]);
  const [zenTool, setZenTool]     = useState('rake');

  // Soundscape
  const [playingSound, setPlayingSound] = useState(null);

  // Fountain wishes
  const [wishText, setWishText]   = useState('');
  const [wishes, setWishes]       = useState([]);
  const [wishRipple, setWishRipple] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          setPhaseIdx(p => {
            const next = (p+1) % PHASES.length;
            setSecs(PHASES[next].dur);
            return next;
          });
          return PHASES[(phaseIdx+1)%PHASES.length].dur;
        }
        return s-1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [active, phaseIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => { setQuoteIdx(i=>(i+1)%MINDFUL_QUOTES.length); setQuoteFade(true); }, 600);
    }, 18000);
    return () => clearInterval(t);
  }, []);

  const phase = PHASES[phaseIdx];

  const rubStone = () => {
    setRubs(r=>r+1);
    setRubGlow(true);
    setTimeout(()=>setRubGlow(false), 600);
  };

  const makeWish = () => {
    if (!wishText.trim()) return;
    setWishes(w=>[{ text:wishText.trim(), id:Date.now() }, ...w.slice(0,7)]);
    setWishText('');
    setWishRipple(true);
    setTimeout(()=>setWishRipple(false), 1200);
  };

  const drawZen = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left)/rect.width*100).toFixed(1);
    const y = ((e.clientY - rect.top)/rect.height*100).toFixed(1);
    setZenLines(l=>[...l, {x,y,id:Date.now()}].slice(-80));
  };

  const q = MINDFUL_QUOTES[quoteIdx];

  return (
    <div>
      <PH emoji="🌸" title="Mindfulness" sub="Breathe, ground yourself, and find stillness"/>

      {/* Tool selector */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:28 }}>
        {TOOLS.map(t=>(
          <button key={t.id} onClick={()=>setTool(t.id)} style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 16px', borderRadius:30, border:`1.5px solid ${tool===t.id?'rgba(201,168,76,.6)':'rgba(42,92,173,.25)'}`, background:tool===t.id?'rgba(201,168,76,.12)':'rgba(42,92,173,.07)', color:tool===t.id?'#C9A84C':'rgba(240,232,255,.6)', fontSize:15, fontWeight:tool===t.id?700:400, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .18s' }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── Box Breathing ── */}
      {tool==='breathing' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28 }}>
          <div style={{ position:'relative', width:220, height:220 }}>
            <div style={{ position:'absolute', inset:-20, borderRadius:'50%', border:`2px solid ${phase.color}22`, transition:'all 1s ease' }}/>
            <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:`1px solid ${phase.color}33`, transition:'all 1s ease' }}/>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:`radial-gradient(circle, ${phase.color}44 0%, ${phase.color}18 50%, transparent 75%)`, border:`2px solid ${phase.color}88`, boxShadow:`0 0 40px ${phase.color}44, inset 0 0 30px ${phase.color}22`, transform:`scale(${active ? phase.scale : 0.9})`, transition:`transform ${phase.dur}s cubic-bezier(0.4,0,0.2,1), background .8s ease`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:18, fontWeight:600, color:phase.color, textAlign:'center', letterSpacing:1 }}>{active ? phase.label : 'Ready'}</div>
              {active && <div style={{ fontFamily:"'Cinzel',serif", fontSize:32, fontWeight:700, color:'#fff', lineHeight:1, marginTop:5 }}>{secs}</div>}
            </div>
          </div>
          <button className={active ? 'btn btn-ghost' : 'btn btn-lapis'} style={{ fontSize:16, padding:'12px 32px', letterSpacing:1 }} onClick={()=>{ setActive(a=>!a); setPhaseIdx(0); setSecs(PHASES[0].dur); }}>
            {active ? '⏸ Pause' : '▶ Begin Breathing'}
          </button>
          <div style={{ fontSize:18, color:'rgba(240,232,255,.4)', textAlign:'center', maxWidth:340, lineHeight:1.7 }}>Box breathing: 4 counts in · 4 hold · 6 out · 2 rest</div>
          <div style={{ display:'flex', gap:10 }}>
            {PHASES.map((p,i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:i===phaseIdx&&active ? p.color : 'rgba(255,255,255,.1)', boxShadow:i===phaseIdx&&active?`0 0 10px ${p.color}`:undefined, transition:'all .4s' }}/>
                <div style={{ fontSize:12, color:'rgba(240,232,255,.25)', textAlign:'center' }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Affirmations ── */}
      {tool==='affirmations' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
          <div style={{ maxWidth:480, textAlign:'center', padding:'28px 32px', background:'rgba(42,92,173,.07)', border:'1px solid rgba(42,92,173,.18)', borderRadius:20, transition:'opacity .6s', opacity:quoteFade?1:0 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontStyle:'italic', color:'rgba(240,232,255,.9)', lineHeight:1.8, marginBottom:12 }}>"{q.text}"</div>
            <div style={{ fontSize:16, color:'rgba(201,168,76,.5)', letterSpacing:2, textTransform:'uppercase' }}>— {q.attr}</div>
          </div>
          <div style={{ width:'100%', maxWidth:560 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'rgba(201,168,76,.4)', textTransform:'uppercase', letterSpacing:2, marginBottom:14, textAlign:'center' }}>All Affirmations</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {MINDFUL_QUOTES.map((q,i) => (
                <div key={i} style={{ padding:'15px 20px', background:'rgba(42,92,173,.06)', border:'1px solid rgba(42,92,173,.14)', borderRadius:14, fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontStyle:'italic', color:'rgba(240,232,255,.72)', lineHeight:1.7 }}>
                  "{q.text}"
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tension Release ── */}
      {tool==='tension' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:560, margin:'0 auto' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:'rgba(240,232,255,.85)', textAlign:'center', marginBottom:8 }}>Progressive Muscle Relaxation</div>
          {[
            { area:'Hands & Forearms', inst:'Clench your fists tightly for 5 seconds, then release completely.' },
            { area:'Shoulders & Neck', inst:'Raise your shoulders to your ears, hold for 5 seconds, then drop.' },
            { area:'Jaw & Face',       inst:'Scrunch your entire face tightly for 5 seconds, then relax.' },
            { area:'Core & Stomach',   inst:'Tighten your stomach muscles for 5 seconds, then release.' },
            { area:'Legs & Feet',      inst:'Point your toes, tighten your legs for 5 seconds, then release.' },
          ].map((s,i)=>(
            <div key={i} style={{ padding:'18px 22px', background:'rgba(42,92,173,.07)', border:'1px solid rgba(42,92,173,.16)', borderRadius:16 }}>
              <div style={{ fontWeight:700, color:'#C9A84C', fontSize:18, marginBottom:6 }}>{s.area}</div>
              <div style={{ color:'rgba(240,232,255,.7)', fontSize:18, lineHeight:1.7 }}>{s.inst}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Guided Imagery ── */}
      {tool==='imagery' && (
        <div style={{ maxWidth:560, margin:'0 auto', display:'flex', flexDirection:'column', gap:18 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:'rgba(240,232,255,.85)', textAlign:'center' }}>Close your eyes and breathe slowly.</div>
          {[
            "Imagine you're standing at the edge of a calm, warm ocean. The sky is a soft gradient of rose and gold.",
            "Feel the soft sand beneath your feet. Each grain is cool and grounding. Your body is fully supported.",
            "Hear gentle waves rolling in. With each wave, tension leaves your body and dissolves into the sea.",
            "A warm breeze moves across your skin. You are completely safe. Your nervous system begins to soften.",
            "You are whole. You are exactly where you need to be. This moment belongs only to you.",
          ].map((line,i)=>(
            <div key={i} style={{ padding:'18px 22px', background:'rgba(42,92,173,.06)', border:'1px solid rgba(42,92,173,.13)', borderRadius:16, fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'rgba(240,232,255,.8)', lineHeight:1.8, fontStyle:'italic' }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* ── Gratitude Jar ── */}
      {tool==='gratitude' && (
        <div style={{ maxWidth:520, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ fontSize:64, textAlign:'center', animation:'floatUp 3s ease-in-out infinite' }}>🫙</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:'rgba(240,232,255,.8)', textAlign:'center', marginBottom:4 }}>What are you grateful for today?</div>
          <div style={{ display:'flex', gap:10 }}>
            <input className="field" value={gratInput} onChange={e=>setGratInput(e.target.value)} placeholder="Something small counts too..." onKeyDown={e=>{ if(e.key==='Enter'&&gratInput.trim()){ setGratEntries(g=>[{text:gratInput.trim(),id:Date.now()},...g.slice(0,19)]); setGratInput(''); }}} style={{ flex:1, fontSize:18 }}/>
            <button className="btn btn-gold" onClick={()=>{ if(gratInput.trim()){ setGratEntries(g=>[{text:gratInput.trim(),id:Date.now()},...g.slice(0,19)]); setGratInput(''); } }}>Add</button>
          </div>
          {gratEntries.length===0 && <div style={{ textAlign:'center', color:'rgba(240,232,255,.3)', fontSize:18, padding:'20px 0' }}>Your jar is empty — drop something in.</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {gratEntries.map((e,i)=>(
              <div key={e.id} style={{ padding:'13px 18px', background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.18)', borderRadius:12, color:'rgba(240,232,255,.8)', fontSize:18, animation:'popIn .2s ease' }}>
                🌟 {e.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Worry Stone ── */}
      {tool==='worry' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:'rgba(240,232,255,.8)', textAlign:'center', maxWidth:400, lineHeight:1.7 }}>
            Hold your worry stone. Each rub transfers anxiety out of your hands and into the stone.
          </div>
          <div
            onClick={rubStone}
            style={{ width:160, height:100, borderRadius:'50% 50% 45% 45%', background:`radial-gradient(ellipse at 40% 35%, rgba(42,92,173,${rubGlow?.6:.35}), rgba(15,25,80,${rubGlow?.9:.7}))`, border:`2px solid rgba(42,92,173,${rubGlow?.8:.3})`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'rgba(168,196,240,.6)', fontFamily:"'Cinzel',serif", letterSpacing:2, transition:'all .3s', boxShadow:rubGlow?'0 0 40px rgba(42,92,173,.8), 0 0 80px rgba(42,92,173,.3)':'0 4px 20px rgba(0,0,0,.5)', userSelect:'none' }}>
            {rubs > 0 ? `${rubs} rubs` : 'Tap to rub'}
          </div>
          {rubs >= 10 && (
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'rgba(110,231,183,.7)', textAlign:'center', animation:'fadeUp .4s ease' }}>
              {rubs >= 30 ? '💙 The stone has absorbed much. You are lighter.' : rubs >= 20 ? '✨ Feel your hands soften. The worry loosens.' : '🪨 The stone is warm now. Keep going.'}
            </div>
          )}
          <button className="btn btn-ghost" onClick={()=>setRubs(0)} style={{ fontSize:16 }}>Reset Stone</button>
        </div>
      )}

      {/* ── Zen Garden ── */}
      {tool==='zen' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:'rgba(240,232,255,.7)', textAlign:'center' }}>Draw in the sand. Breathe.</div>
          <div style={{ display:'flex', gap:10, marginBottom:4 }}>
            {['rake','smooth','circle'].map(t=>(
              <button key={t} onClick={()=>setZenTool(t)} style={{ padding:'8px 18px', borderRadius:20, border:`1.5px solid ${zenTool===t?'rgba(201,168,76,.5)':'rgba(42,92,173,.25)'}`, background:zenTool===t?'rgba(201,168,76,.1)':'transparent', color:zenTool===t?'#C9A84C':'rgba(240,232,255,.5)', fontSize:15, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>{t}</button>
            ))}
          </div>
          <div
            onMouseMove={e=>{ if(e.buttons===1) drawZen(e); }}
            onClick={drawZen}
            style={{ width:'100%', maxWidth:560, height:280, background:'rgba(201,168,76,.04)', border:'1.5px solid rgba(201,168,76,.15)', borderRadius:16, position:'relative', cursor:'crosshair', overflow:'hidden' }}>
            {/* Sand texture lines */}
            {[...Array(12)].map((_,i)=>(
              <div key={i} style={{ position:'absolute', left:0, right:0, top:`${8+i*22}px`, height:'1px', background:'rgba(201,168,76,.06)' }}/>
            ))}
            {zenLines.map((l,i)=>(
              <div key={l.id} style={{ position:'absolute', left:`${l.x}%`, top:`${l.y}%`, width:zenTool==='circle'?20:4, height:zenTool==='circle'?20:zenTool==='rake'?12:4, borderRadius:zenTool==='circle'?'50%':'2px', background:'rgba(201,168,76,.3)', transform:'translate(-50%,-50%)', boxShadow:'0 0 4px rgba(201,168,76,.2)' }}/>
            ))}
            {zenLines.length===0 && <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(240,232,255,.15)', fontSize:18, fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic' }}>Drag to draw in the sand</div>}
          </div>
          <button className="btn btn-ghost" onClick={()=>setZenLines([])} style={{ fontSize:16 }}>Clear Garden</button>
        </div>
      )}

      {/* ── Soundscapes ── */}
      {tool==='soundscapes' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:520, margin:'0 auto' }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:'rgba(240,232,255,.8)', textAlign:'center', marginBottom:8 }}>Healing Frequencies & Soundscapes</div>
          <div style={{ fontSize:18, color:'rgba(240,232,255,.45)', textAlign:'center', marginBottom:4 }}>Note: Audio plays through your browser. Use headphones for binaural beats.</div>
          {SOUNDSCAPES.map(s=>(
            <div key={s.id} onClick={()=>setPlayingSound(p=>p===s.id?null:s.id)} style={{ display:'flex', alignItems:'center', gap:16, padding:'18px 22px', background:playingSound===s.id?'rgba(42,92,173,.18)':'rgba(42,92,173,.07)', border:`1.5px solid ${playingSound===s.id?'rgba(42,92,173,.5)':'rgba(42,92,173,.15)'}`, borderRadius:16, cursor:'pointer', transition:'all .2s' }}>
              <div style={{ fontSize:32 }}>{s.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color: playingSound===s.id?'#C9A84C':'rgba(240,232,255,.85)', fontSize:18, marginBottom:3 }}>{s.label}</div>
                <div style={{ fontSize:16, color:'rgba(240,232,255,.45)' }}>{s.desc}{s.freq>0?` — ${s.freq}Hz`:''}</div>
              </div>
              <div style={{ width:36, height:36, borderRadius:'50%', border:`2px solid ${playingSound===s.id?'#C9A84C':'rgba(42,92,173,.35)'}`, display:'flex', alignItems:'center', justifyContent:'center', color:playingSound===s.id?'#C9A84C':'rgba(240,232,255,.4)', fontSize:16, transition:'all .2s' }}>
                {playingSound===s.id ? '■' : '▶'}
              </div>
            </div>
          ))}
          {playingSound && (
            <div style={{ textAlign:'center', padding:'14px', background:'rgba(42,92,173,.08)', borderRadius:12, color:'rgba(168,196,240,.6)', fontSize:18 }}>
              ♪ Now playing: {SOUNDSCAPES.find(s=>s.id===playingSound)?.label} — use your device's ambient sound app or YouTube for actual audio.
            </div>
          )}
        </div>
      )}

      {/* ── Fountain Wishes ── */}
      {tool==='fountain' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:'rgba(240,232,255,.8)', textAlign:'center', maxWidth:420, lineHeight:1.7 }}>
            Write a wish, intention, or hope — then release it to the fountain.
          </div>
          {/* Fountain visual */}
          <div style={{ position:'relative', width:200, height:140 }}>
            <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:160, height:40, borderRadius:'50%', background:'rgba(42,92,173,.25)', border:'1.5px solid rgba(42,92,173,.4)', boxShadow:wishRipple?'0 0 40px rgba(42,92,173,.7)':'0 0 12px rgba(42,92,173,.2)', transition:'box-shadow .6s' }}/>
            <div style={{ position:'absolute', bottom:38, left:'50%', transform:'translateX(-50%)', width:8, height:60, background:'linear-gradient(0deg,rgba(42,92,173,.5),rgba(168,196,240,.6))', borderRadius:4 }}/>
            {wishRipple && [...Array(3)].map((_,i)=>(
              <div key={i} style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', width:20+i*40, height:20+i*40, borderRadius:'50%', border:'1.5px solid rgba(42,92,173,.5)', animation:`ripple${i} .8s ${i*.15}s ease-out both`, opacity:0 }}/>
            ))}
            <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', fontSize:28, animation:'floatUp 2s ease-in-out infinite' }}>⛲</div>
          </div>
          <div style={{ display:'flex', gap:10, width:'100%', maxWidth:480 }}>
            <input className="field" value={wishText} onChange={e=>setWishText(e.target.value)} placeholder="I wish for..." style={{ flex:1, fontSize:18 }} onKeyDown={e=>{ if(e.key==='Enter') makeWish(); }}/>
            <button className="btn btn-lapis" onClick={makeWish} style={{ fontSize:16 }}>Release ✨</button>
          </div>
          {wishes.length > 0 && (
            <div style={{ width:'100%', maxWidth:480, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:15, color:'rgba(240,232,255,.3)', textAlign:'center', letterSpacing:1 }}>RELEASED TO THE WATERS</div>
              {wishes.map(w=>(
                <div key={w.id} style={{ padding:'12px 18px', background:'rgba(42,92,173,.07)', border:'1px solid rgba(42,92,173,.18)', borderRadius:12, color:'rgba(240,232,255,.65)', fontSize:18, fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', animation:'fadeUp .3s ease' }}>
                  ✨ {w.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom affirmation quote — always visible */}
      <div style={{ maxWidth:480, margin:'32px auto 0', textAlign:'center', padding:'22px 28px', background:'rgba(42,92,173,.07)', border:'1px solid rgba(42,92,173,.15)', borderRadius:18, transition:'opacity .6s', opacity:quoteFade?1:0 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontStyle:'italic', color:'rgba(240,232,255,.85)', lineHeight:1.7, marginBottom:10 }}>"{q.text}"</div>
        <div style={{ fontSize:16, color:'rgba(201,168,76,.45)', letterSpacing:2, textTransform:'uppercase' }}>— {q.attr}</div>
      </div>
    </div>
  );
}

// ─── AI Advocate → Lazuli ─────────────────────────────────────
const SYS_LAZULI = d => `You are Lazuli — a warm, brilliant, empathetic chronic illness health advocate and the user's most trusted companion. You are named after lapis lazuli, the ancient healing stone used for 6,000 years to heal the spirit.

Your personality: warm best friend who knows medicine deeply, sometimes gently funny, never clinical or cold. You ALWAYS acknowledge feelings before giving information. You NEVER dismiss symptoms. You speak in first person: "I think...", "I want you to know...", "I'm here with you..." You remember context and reference it. You are honest when something is outside your knowledge, but never leave the user without support. Make the user feel heard, believed, and supported — like they have a brilliant friend who truly gets it.

Their name: ${d.profile?.name||'friend'}
Their conditions: ${d.profile?.conditions||'Not specified'}
Their wellness goal: ${d.profile?.goal||'Not specified'}

Recent symptoms:
${(d.symptoms||[]).slice(0,8).map(s=>`- ${s.date}: ${(s.entries||[]).map(e=>`${e.symptom}(${e.severity}/10)`).join(', ')} | Pain:${s.pain} Energy:${s.energy} Mood:${s.mood}${s.notes?' | '+s.notes:''}`).join('\n')||'None logged yet'}

Active medications:
${(d.medications||[]).filter(m=>m.active).map(m=>`- ${m.name} ${m.dose} (${m.frequency})`).join('\n')||'None'}

Recent appointments:
${(d.appointments||[]).slice(0,5).map(a=>`- ${a.date}: ${a.provider}${a.postNotes?' — '+a.postNotes.slice(0,60):''}`).join('\n')||'None'}

Be warm, validating, specific to their data. You are on their side, always. Start every response by acknowledging the person first.`;

const STARTERS = [
  'Help me prepare for my next doctor appointment',
  'What patterns do you see in my symptoms?',
  'How do I advocate for myself with my doctor?',
  "I feel dismissed by my doctor. What can I do?",
  'What questions should I ask my specialist?',
  "Help me explain my condition to someone who doesn't understand",
];

const FREE_CHAT_LIMIT = 50;

// ─── Gel Keyboard ─────────────────────────────────────────────
const KB_ROWS = [
  [{k:'1'},{k:'2'},{k:'3'},{k:'4'},{k:'5'},{k:'6'},{k:'7'},{k:'8'},{k:'9'},{k:'0'},{k:'⌫',w:1.8}],
  [{k:'Q'},{k:'W'},{k:'E'},{k:'R'},{k:'T'},{k:'Y'},{k:'U'},{k:'I'},{k:'O'},{k:'P'},{k:'↵',w:2}],
  [{k:'A'},{k:'S'},{k:'D'},{k:'F'},{k:'G'},{k:'H'},{k:'J'},{k:'K'},{k:'L'},{k:';'}],
  [{k:'Z'},{k:'X'},{k:'C'},{k:'V'},{k:'B'},{k:'N'},{k:'M'},{k:','},{k:'.'},{k:'⇧',w:2}],
  [{k:'ctrl',w:1.4},{k:'SPACE',w:5.5},{k:'alt',w:1.4}],
];
function GelKeyboard({ active }) {
  const [litKeys, setLitKeys] = useState(new Set());
  const allKeys = KB_ROWS.flat().map(k=>k.k).filter(Boolean);
  const timerRef = useRef(null);
  useEffect(() => {
    if (!active) { setLitKeys(new Set()); clearTimeout(timerRef.current); return; }
    const flash = () => {
      const picks = new Set();
      for (let i=0;i<Math.floor(Math.random()*3)+1;i++) picks.add(allKeys[Math.floor(Math.random()*allKeys.length)]);
      setLitKeys(picks);
      setTimeout(()=>setLitKeys(new Set()), 80+Math.random()*120);
      timerRef.current = setTimeout(flash, 100+Math.random()*200);
    };
    timerRef.current = setTimeout(flash, 50);
    return () => clearTimeout(timerRef.current);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  const KU = 22;
  return (
    <div style={{ opacity:active?1:0, transform:active?'translateY(0)':'translateY(16px)', transition:'opacity .4s ease,transform .4s ease', pointerEvents:'none', marginTop:8 }}>
      <div style={{ background:'linear-gradient(145deg,rgba(42,92,173,.12),rgba(4,14,52,.9))', backdropFilter:'blur(20px)', border:'1px solid rgba(42,92,173,.3)', borderRadius:14, padding:'10px 12px 12px', boxShadow:'0 0 30px rgba(42,92,173,.15),0 8px 32px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.06)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', bottom:-10, left:'30%', width:160, height:40, background:'radial-gradient(ellipse,rgba(42,92,173,.25) 0%,transparent 70%)', filter:'blur(10px)', animation:'pulseGlow 2s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap:2.5, alignItems:'center' }}>
          {KB_ROWS.map((row,ri) => (
            <div key={ri} style={{ display:'flex', gap:2.5 }}>
              {row.map((key,ki) => {
                const lit = litKeys.has(key.k);
                return (
                  <div key={ki} style={{ width:(key.w||1)*KU-2.5, height:ri===0?18:24, background:lit?'linear-gradient(135deg,rgba(42,92,173,.9),rgba(168,196,240,.8))':'linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.02))', borderRadius:4, border:`1px solid ${lit?'rgba(42,92,173,.8)':'rgba(42,92,173,.15)'}`, boxShadow:lit?'0 0 12px rgba(42,92,173,.7),inset 0 1px 0 rgba(255,255,255,.3)':'inset 0 1px 0 rgba(255,255,255,.05),0 1px 0 rgba(0,0,0,.3)', transform:lit?'translateY(1px)':'none', transition:'all .06s ease', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:key.k.length>3?5:key.k.length>1?6:8, fontWeight:500, color:lit?'#fff':'rgba(168,196,240,.2)', lineHeight:1, userSelect:'none', fontFamily:"'DM Sans',sans-serif" }}>{key.k}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {active && <div style={{ textAlign:'center', marginTop:5, fontSize:11, color:'rgba(42,92,173,.5)', letterSpacing:1.5 }}>✦ LAZULI IS RESPONDING</div>}
    </div>
  );
}

function Advocate({ data, user }) {
  const [msgs,setMsgs]         = useState([]);
  const [input,setInput]       = useState('');
  const [loading,setLoading]   = useState(false);
  const [error,setError]       = useState('');
  const [limitHit,setLimitHit] = useState(false);
  const [dailyCount,setDailyCount] = useState(0);
  const [aiTyping,setAiTyping] = useState(false);
  const [shareStatus,setShareStatus] = useState('idle');
  const bottomRef = useRef();
  const inputRef  = useRef();
  const {share}   = useShare();

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [msgs,loading]);

  const handleShare = async () => {
    const text = msgs.map(m=>`${m.role==='user'?'Patient':'Lazuli'}: ${m.content}`).join('\n\n');
    setShareStatus('sharing');
    const ok = await share({ title:'My Lazuli AI Session', text, url: window.location.href });
    setShareStatus(ok?'copied':'idle');
    if (ok) setTimeout(()=>setShareStatus('idle'), 2500);
  };

  const send = async (txt) => {
    const q = (txt||input).trim();
    if (!q || loading || limitHit) return;
    setInput(''); setError('');
    const newMsgs = [...msgs, {role:'user', content:q}];
    setMsgs(newMsgs); setLoading(true); setAiTyping(false);
    try {
      const res = await fetch('/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          messages: newMsgs,
          system: SYS_LAZULI(data),
          userId: user?.uid,
        }),
      });
      const json = await res.json();
      if (res.status === 429 || json.limitReached) { setLimitHit(true); setError(json.error||'Daily limit reached.'); setLoading(false); return; }
      if (!res.ok) { setError(json.error||'Something went wrong.'); setLoading(false); return; }
      const reply = json.content?.[0]?.text || json.text || '';
      if (json['x-daily-count']) setDailyCount(+json['x-daily-count']);
      setMsgs([...newMsgs, {role:'assistant', content:reply}]);
    } catch(e) {
      setError('Connection error — please try again.');
    }
    setLoading(false); setAiTyping(false);
    setTimeout(()=>inputRef.current?.focus(), 100);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, height:'calc(100vh - 120px)', minHeight:500 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10, flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:700, color:'#C9A84C', marginBottom:3 }}>💙 Lazuli AI</div>
          <div style={{ fontSize:15, color:'rgba(240,232,255,.45)' }}>Your personal health advocate — named for the ancient healing stone</div>
        </div>
        {msgs.length>0 && (
          <button onClick={handleShare} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer', border:'1.5px solid rgba(201,168,76,.35)', background:'rgba(201,168,76,.08)', color:'#C9A84C', fontFamily:"'DM Sans',sans-serif", transition:'all .2s', flexShrink:0 }}>
            {getShareButtonLabel(shareStatus,'📋 Share with Doctor')}
          </button>
        )}
      </div>

      {/* Limit / error banners */}
      {limitHit && <div style={{ padding:'12px 16px', background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:12, fontSize:16, color:'rgba(201,168,76,.85)', lineHeight:1.6, flexShrink:0 }}>💙 You've used your {FREE_CHAT_LIMIT} free messages today. Limit resets at midnight. Your full health log is still here for you.</div>}
      {!limitHit && dailyCount>0 && <div style={{ fontSize:14, color:'rgba(240,232,255,.25)', textAlign:'right', flexShrink:0 }}>{dailyCount}/{FREE_CHAT_LIMIT} messages used today</div>}
      {error && !limitHit && <div style={{ padding:'10px 16px', background:'rgba(255,80,80,.1)', border:'1px solid rgba(255,80,80,.25)', borderRadius:12, fontSize:15, color:'#ff8080', lineHeight:1.6, flexShrink:0 }}>⚠ {error}</div>}

      {/* GEL PC SHELL */}
      <div style={{ flex:1, position:'relative', background:'rgba(4,12,38,.88)', backdropFilter:'blur(32px) saturate(1.4)', borderRadius:24, border:'1.5px solid rgba(42,92,173,.4)', boxShadow:'0 0 60px rgba(42,92,173,.12),0 20px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(168,196,240,.1)', overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
        {/* Screen glow - mimics monitor light */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%,rgba(42,92,173,.08) 0%,transparent 60%)', pointerEvents:'none', zIndex:0 }}/>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'30%', background:'linear-gradient(0deg,rgba(42,92,173,.04) 0%,transparent 100%)', pointerEvents:'none', zIndex:0 }}/>

        {/* Top bar */}
        <div style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:10, padding:'12px 18px 10px', borderBottom:'1px solid rgba(42,92,173,.15)', background:'rgba(0,0,0,.2)', flexShrink:0 }}>
          <div style={{ display:'flex', gap:6 }}>
            {['#f87171','#fcd34d','#6ee7b7'].map((c,i)=>(
              <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c, opacity:.5, boxShadow:`0 0 4px ${c}` }}/>
            ))}
          </div>
          <div style={{ flex:1, textAlign:'center' }}>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:13, color:'rgba(168,196,240,.4)', letterSpacing:2 }}>✦ LAZULI CREST ✦</span>
          </div>
          <div style={{ width:50 }}/>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 22px', position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:13, minHeight:0 }}>
          {msgs.length===0 && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ textAlign:'center', marginBottom:22 }}>
                <div style={{ marginBottom:14, display:'inline-block', animation:'floatUp 3s ease-in-out infinite' }}><LogoImg size={54}/></div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:'#C9A84C', marginBottom:6 }}>Hi{data.profile?.name?`, ${data.profile.name}`:''}! 💙</div>
                <p style={{ fontSize:16, color:'rgba(240,232,255,.5)', lineHeight:1.8, maxWidth:420, margin:'0 auto 8px' }}>{getProactiveGreeting(data.profile?.name, data.appointments)}</p>
                <p style={{ fontSize:14, color:'rgba(168,196,240,.35)', fontStyle:'italic', fontFamily:"Georgia,serif" }}>Named for lapis lazuli — used in healing for 6,000 years.</p>
              </div>
              <div className="two-col" style={{ gap:8 }}>
                {STARTERS.map(s=>(
                  <button key={s} onClick={()=>send(s)}
                    style={{ background:'rgba(4,16,52,.85)', border:'1px solid rgba(42,92,173,.4)', borderRadius:13, padding:'13px 14px', textAlign:'left', fontSize:15, fontWeight:500, color:'rgba(240,232,255,.75)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", lineHeight:1.5, transition:'all .16s' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(42,92,173,.2)';e.currentTarget.style.borderColor='rgba(201,168,76,.4)';e.currentTarget.style.color='#fff';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(4,16,52,.85)';e.currentTarget.style.borderColor='rgba(42,92,173,.4)';e.currentTarget.style.color='rgba(240,232,255,.75)';}}>
                    💙 {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', alignItems:'flex-end', gap:8 }}>
              {m.role==='assistant' && <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, overflow:'hidden', boxShadow:'0 0 12px rgba(42,92,173,.5)', marginBottom:2 }}><LogoImg size={30}/></div>}
              <div style={{ maxWidth:'75%', padding:'12px 16px', borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px', background:m.role==='user'?'linear-gradient(135deg,rgba(42,92,173,.3),rgba(201,168,76,.12))':'rgba(255,255,255,.05)', color:m.role==='user'?'#F0E8FF':'rgba(240,232,255,.85)', fontSize:17, lineHeight:1.8, border:m.role==='assistant'?'1px solid rgba(42,92,173,.18)':'1px solid rgba(201,168,76,.2)', backdropFilter:'blur(10px)', whiteSpace:'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:'50%', overflow:'hidden', animation:'pulseGlow 1.5s infinite' }}><LogoImg size={30}/></div>
              <div style={{ padding:'12px 16px', borderRadius:'18px 18px 18px 4px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(42,92,173,.15)', display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(i=><div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#2A5CAD', animation:`bounce .9s ease-in-out ${i*.15}s infinite`, opacity:.8 }}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input area */}
        <div style={{ position:'relative', zIndex:2, padding:'12px 16px 14px', borderTop:'1px solid rgba(42,92,173,.12)', background:'rgba(0,0,0,.25)', backdropFilter:'blur(12px)', flexShrink:0 }}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', background:'rgba(4,16,52,.8)', borderRadius:14, padding:'10px 10px 10px 16px', border:'1px solid rgba(42,92,173,.3)', boxShadow:'inset 0 1px 0 rgba(168,196,240,.06)' }}>
            <textarea ref={inputRef} style={{ flex:1, border:'none', background:'transparent', color:'#F0E8FF', fontFamily:"'DM Sans',sans-serif", fontSize:17, lineHeight:1.55, resize:'none', outline:'none', minHeight:24, maxHeight:120, caretColor:'#C9A84C', padding:0 }} rows={1} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Talk to Lazuli…" disabled={limitHit}/>
            <button className="btn btn-gold" onClick={()=>send()} disabled={loading||!input.trim()||limitHit} style={{ alignSelf:'flex-end', padding:'8px 18px', fontSize:15, opacity:loading||!input.trim()||limitHit?.35:1, flexShrink:0 }}>Send</button>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, alignItems:'center', paddingLeft:4 }}>
            <div style={{ fontSize:13, color:'rgba(240,232,255,.15)' }}>Enter to send · Shift+Enter new line</div>
            {msgs.length>0 && <button onClick={handleShare} style={{ fontSize:13, color:'rgba(201,168,76,.45)', background:'transparent', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>📋 Share with Doctor</button>}
          </div>
        </div>
      </div>

      {/* Gel Keyboard */}
      <GelKeyboard active={aiTyping}/>
    </div>
  );
}

// ─── Updates / What's New ─────────────────────────────────────
function Updates() {
  const features = [
    { icon:'💙', title:'Lazuli AI Health Advocate', desc:'Your personal AI health companion trained to support chronic illness patients — answers questions, helps you prep for appointments, and always believes you.', status:'live' },
    { icon:'🗺', title:'Body Map & Brain Map', desc:'Interactive anatomical maps to track pain, symptoms, and neurological patterns over time with visual heat mapping.', status:'live' },
    { icon:'💉', title:'Infusion Hub', desc:'Full infusion appointment management — gentle prep checklists, side effect tracking, and your personal companion message before each infusion.', status:'live' },
    { icon:'💧', title:'Hydration Station', desc:'Track daily hydration with a gorgeous animated glass pitcher. Customize drink types and amounts to your routine.', status:'live' },
    { icon:'📖', title:'Secure Diary', desc:'A fully private, beautiful diary with custom fonts, mood tracking, and photo uploads. Never shared, always encrypted.', status:'live' },
    { icon:'🔗', title:'Shareable Health Summary', desc:'Generate a PIN-protected, read-only health snapshot to share with doctors, caregivers, or specialists — you control exactly what\'s included.', status:'live' },
    { icon:'🏋️', title:'Lazuli Gym — Adaptive Fitness', desc:'AI-powered gentle exercise guidance designed specifically for chronic illness patients. Your occupational therapist in your pocket.', status:'coming' },
    { icon:'📱', title:'Google Play Store App', desc:'Take Lazuli Crest everywhere — the full native Android app is in development and coming to Google Play Store soon.', status:'coming' },
    { icon:'🤝', title:'Care Team Collaboration', desc:'Invite a caregiver, family member, or care coordinator to view your health data in a separate read-only care portal.', status:'coming' },
    { icon:'📊', title:'Advanced Health Analytics', desc:'Trend charts, symptom correlations, flare pattern detection, and exportable health reports for your medical team.', status:'coming' },
    { icon:'🏥', title:'Doctor Finder & Specialist Map', desc:'Find chronic illness specialists, patient advocates, and rare disease centers near you — filtered by your conditions.', status:'coming' },
    { icon:'💊', title:'Medication Interaction Checker', desc:'AI-powered medication safety checker that flags potential interactions and reminds you of time-sensitive doses.', status:'coming' },
  ];

  return (
    <div style={{ position:'relative' }}>
      {/* Hero */}
      <div style={{ textAlign:'center', padding:'40px 20px 32px', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 30%, rgba(42,92,173,.2) 0%, transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ display:'inline-block', marginBottom:16, animation:'floatUp 3s ease-in-out infinite' }}>
          <div style={{ fontSize:56, filter:'drop-shadow(0 0 20px rgba(42,92,173,.8)) drop-shadow(0 0 40px rgba(201,168,76,.4))' }}>💎</div>
        </div>
        <div style={{ fontFamily:"'Cinzel Decorative',serif", fontSize:28, fontWeight:700, color:'#C9A84C', marginBottom:6, textShadow:'0 0 30px rgba(201,168,76,.4)', letterSpacing:2 }}>Lazuli Crest</div>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:'rgba(168,196,240,.7)', letterSpacing:4, textTransform:'uppercase', marginBottom:18 }}>The Gold Standard in Health Advocacy</div>
        <div style={{ maxWidth:540, margin:'0 auto', fontSize:16, color:'rgba(240,232,255,.65)', lineHeight:1.8, fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic' }}>
          Lazuli Crest is always evolving — every update is built around real patient needs. New features, refinements, and tools are added constantly to better support your health journey.
        </div>
        <div style={{ marginTop:22, display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10 }}>
          <div style={{ padding:'8px 20px', borderRadius:20, background:'rgba(110,231,183,.1)', border:'1px solid rgba(110,231,183,.3)', fontSize:16, color:'#6ee7b7', fontWeight:600 }}>✓ Live Features</div>
          <div style={{ padding:'8px 20px', borderRadius:20, background:'rgba(201,168,76,.1)', border:'1px solid rgba(201,168,76,.3)', fontSize:16, color:'#C9A84C', fontWeight:600, animation:'pulseGlow 3s ease-in-out infinite' }}>🚀 Coming Soon</div>
        </div>
      </div>

      {/* Play Store banner */}
      <div style={{ margin:'0 0 28px', padding:'22px 24px', background:'linear-gradient(135deg,rgba(42,92,173,.18),rgba(201,168,76,.08))', border:'1.5px solid rgba(201,168,76,.3)', borderRadius:18, display:'flex', gap:18, alignItems:'center', flexWrap:'wrap', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, right:0, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(201,168,76,.08) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ fontSize:44, animation:'heartbeat 2.5s ease-in-out infinite', filter:'drop-shadow(0 0 12px rgba(201,168,76,.5))' }}>📱</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:18, color:'#C9A84C', marginBottom:6, fontWeight:700 }}>Google Play Store — Coming Soon</div>
          <div style={{ fontSize:15, color:'rgba(240,232,255,.7)', lineHeight:1.7 }}>The full Lazuli Crest native Android app is in development. Take your complete health vault with you — offline access, push reminders, and the same luxury experience on every device.</div>
        </div>
        <div style={{ padding:'10px 22px', borderRadius:12, background:'linear-gradient(135deg,#C9A84C,#E8C96B)', color:'#000', fontWeight:700, fontSize:16, cursor:'default', boxShadow:'0 4px 20px rgba(201,168,76,.4)' }}>Notify Me</div>
      </div>

      {/* Features grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
        {features.map((f,i)=>(
          <div key={i} className="glass-card-static" style={{ padding:22, position:'relative', overflow:'hidden', animation:`fadeUp .5s ${i*.06}s both`, transition:'transform .2s ease, box-shadow .2s ease', cursor:'default' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 16px 48px rgba(0,0,0,.6),0 0 24px rgba(42,92,173,.2)';}} onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='';}}>
            <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:`radial-gradient(circle,${f.status==='live'?'rgba(110,231,183,.08)':'rgba(201,168,76,.08)'} 0%,transparent 70%)` }}/>
            <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
              <div style={{ fontSize:28, filter:'drop-shadow(0 0 8px rgba(42,92,173,.4))', flexShrink:0 }}>{f.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:15, color:'#C9A84C', fontWeight:600, flex:1 }}>{f.title}</div>
                  <span style={{ fontSize:16, fontWeight:700, padding:'2px 9px', borderRadius:20, background:f.status==='live'?'rgba(110,231,183,.15)':'rgba(201,168,76,.12)', color:f.status==='live'?'#6ee7b7':'#C9A84C', border:`1px solid ${f.status==='live'?'rgba(110,231,183,.3)':'rgba(201,168,76,.3)'}`, whiteSpace:'nowrap' }}>
                    {f.status==='live'?'● LIVE':'◈ SOON'}
                  </span>
                </div>
                <div style={{ fontSize:16, color:'rgba(240,232,255,.6)', lineHeight:1.7 }}>{f.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom alchemy quote */}
      <div style={{ textAlign:'center', padding:'36px 20px 16px' }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:18, color:'rgba(201,168,76,.6)', lineHeight:1.9, maxWidth:480, margin:'0 auto' }}>
          "In alchemy, lapis lazuli was called the philosopher's stone of healing — rare, precious, and transformative. We built Lazuli Crest on that same principle."
        </div>
        <div style={{ fontSize:16, color:'rgba(240,232,255,.2)', marginTop:8, letterSpacing:2 }}>— THE LAZULI CREST TEAM</div>
      </div>
    </div>
  );
}

// ─── Lazuli Gym ───────────────────────────────────────────────
const GYM_EXERCISES = [
  { id:'breath', title:'Box Breathing', icon:'🌬️', category:'Breath & Calm', duration:'5 min', intensity:'Very Light', benefit:'Nervous system reset, reduces flares', steps:['Sit or lie comfortably','Inhale slowly for 4 counts','Hold for 4 counts','Exhale for 4 counts','Hold for 4 counts','Repeat 4–8 times'] },
  { id:'neck', title:'Gentle Neck Rolls', icon:'🔄', category:'Mobility', duration:'3 min', intensity:'Very Light', benefit:'Reduces neck tension, improves circulation', steps:['Sit tall with shoulders relaxed','Slowly drop chin to chest','Roll ear to shoulder slowly — feel the stretch','Roll back to center, then to other side','Never force — stop if dizzy','5 slow rolls each direction'] },
  { id:'ankle', title:'Ankle Circles', icon:'🦶', category:'Circulation', duration:'3 min', intensity:'Very Light', benefit:'Improves circulation, reduces swelling', steps:['Sit or lie down','Lift one foot slightly off the ground','Rotate ankle slowly clockwise 10 times','Rotate counter-clockwise 10 times','Switch feet','Can be done in bed on bad days'] },
  { id:'shoulder', title:'Shoulder Shrugs & Rolls', icon:'🤷', category:'Mobility', duration:'4 min', intensity:'Light', benefit:'Releases shoulder tension, eases muscle stiffness', steps:['Sit upright if able','Raise both shoulders to your ears','Hold 2 seconds','Roll them back and down slowly','Forward roll: reverse the direction','10 slow repetitions each direction'] },
  { id:'seated', title:'Seated Marching', icon:'🪑', category:'Strength', duration:'5 min', intensity:'Light', benefit:'Leg strength, circulation, energy boost', steps:['Sit in a sturdy chair','Lift right knee up slowly','Lower, then lift left knee','Alternate like slow marching','Keep breathing steadily','Start with 10 total, build up over days'] },
  { id:'wall', title:'Wall Push-Ups', icon:'🧱', category:'Strength', duration:'5 min', intensity:'Light-Moderate', benefit:'Upper body strength, minimal joint stress', steps:['Stand facing a wall, arm\'s length away','Place hands flat on wall at shoulder height','Bend elbows to lean toward wall slowly','Straighten arms to push back','Keep core gently engaged','5–10 reps to start'] },
  { id:'catcow', title:'Cat-Cow Stretch', icon:'🐱', category:'Flexibility', duration:'4 min', intensity:'Light', benefit:'Spinal mobility, pain relief, reduces stiffness', steps:['Come to hands and knees if able (or adapt in chair)','Inhale: let belly drop, lift head gently (Cow)','Exhale: round back up like a cat, tuck chin','Move slowly with your breath','8–10 slow repetitions','Stop if any sharp pain'] },
  { id:'supine', title:'Supine Leg Slides', icon:'🛌', category:'Gentle Strength', duration:'5 min', intensity:'Very Light', benefit:'Core activation, hip mobility — fully in bed', steps:['Lie flat on your back','Bend both knees, feet flat','Slowly slide one heel out to straighten leg','Slide it back slowly','Alternate legs','Great for flare days — requires no floor transfer'] },
];

const GYM_GOALS = ['Reduce pain & stiffness','Improve energy levels','Build gentle strength','Improve circulation','Reduce anxiety','Support sleep','Maintain mobility'];

function LazuliGym({ data }) {
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [activeEx, setActiveEx] = useState(null);
  const [step, setStep] = useState(0);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const toggleGoal = g => setSelectedGoals(prev => prev.includes(g) ? prev.filter(x=>x!==g) : [...prev, g]);

  const recommended = selectedGoals.length > 0
    ? GYM_EXERCISES.filter(() => true) // show all, sorted by relevance
    : GYM_EXERCISES;

  const conditions = data.profile?.conditions || '';

  useEffect(() => {
    if (conditions) {
      const msg = conditions.includes('POTS') || conditions.includes('Dysautonomia')
        ? "With POTS/Dysautonomia, start with all exercises horizontal or seated. Avoid standing exercises on bad days. Ankle circles and supine leg slides are ideal starting points."
        : conditions.includes('Fibromyalgia') || conditions.includes('ME/CFS')
        ? "With Fibromyalgia or ME/CFS, pacing is everything. Start with 2–3 minutes maximum. Rest between exercises. Box breathing is your best friend."
        : conditions.includes('EDS') || conditions.includes('Hypermobility')
        ? "With EDS or hypermobility, avoid pushing joints to end range. Focus on strengthening muscles around joints rather than stretching. Wall push-ups and seated marching are safe."
        : "Always listen to your body. Stop any exercise that increases pain. On flare days, box breathing and ankle circles in bed are enough — that is still movement.";
      setAiSuggestion(msg);
    }
  }, [conditions]);

  return (
    <div>
      <PH emoji="🏋️" title="Lazuli Gym" sub="Gentle, adaptive movement curated for chronic illness — designed with occupational therapy principles"/>

      {aiSuggestion && (
        <div style={{ marginBottom:20, padding:'18px 22px', background:'rgba(42,92,173,.1)', border:'1px solid rgba(42,92,173,.3)', borderRadius:16, display:'flex', gap:14, alignItems:'flex-start' }}>
          <div style={{ fontSize:24, flexShrink:0, animation:'heartbeat 3s ease-in-out infinite' }}>💙</div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'rgba(201,168,76,.7)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:6 }}>Lazuli — Personal Trainer</div>
            <div style={{ fontSize:15, color:'rgba(240,232,255,.8)', lineHeight:1.75, fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic' }}>{aiSuggestion}</div>
          </div>
        </div>
      )}

      <div className="glass-card-static" style={{ padding:20, marginBottom:20 }}>
        <label>What are your goals today? (select all that apply)</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
          {GYM_GOALS.map(g=>(
            <button key={g} onClick={()=>toggleGoal(g)} style={{ padding:'7px 15px', borderRadius:20, fontSize:16, border:`1.5px solid ${selectedGoals.includes(g)?'#C9A84C':'rgba(42,92,173,.35)'}`, background:selectedGoals.includes(g)?'rgba(201,168,76,.12)':'rgba(4,16,52,.8)', color:selectedGoals.includes(g)?'#C9A84C':'rgba(240,232,255,.7)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .15s' }}>
              {selectedGoals.includes(g)?'✓ ':''}{g}
            </button>
          ))}
        </div>
      </div>

      {activeEx ? (
        <div className="glass-card-static" style={{ padding:28 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
            <div>
              <div style={{ fontSize:36, marginBottom:8 }}>{activeEx.icon}</div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:22, color:'#C9A84C', marginBottom:4 }}>{activeEx.title}</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:16, color:'rgba(168,196,240,.7)', background:'rgba(42,92,173,.15)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(42,92,173,.3)' }}>{activeEx.duration}</span>
                <span style={{ fontSize:16, color:'rgba(201,168,76,.7)', background:'rgba(201,168,76,.08)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(201,168,76,.2)' }}>{activeEx.intensity}</span>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={()=>{setActiveEx(null);setStep(0);}}>← Back</button>
          </div>
          <div style={{ marginBottom:20, padding:'14px 18px', background:'rgba(42,92,173,.08)', border:'1px solid rgba(42,92,173,.2)', borderRadius:12 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'rgba(201,168,76,.65)', marginBottom:4, textTransform:'uppercase', letterSpacing:1 }}>Benefit</div>
            <div style={{ fontSize:15, color:'rgba(240,232,255,.7)', lineHeight:1.7 }}>{activeEx.benefit}</div>
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:'#C9A84C', marginBottom:14 }}>Step-by-Step Guide</div>
            {activeEx.steps.map((s,i)=>(
              <div key={i} onClick={()=>setStep(i)} style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:12, padding:'12px 16px', borderRadius:12, background:step===i?'rgba(42,92,173,.2)':'rgba(255,255,255,.03)', border:`1px solid ${step===i?'rgba(42,92,173,.5)':'rgba(42,92,173,.1)'}`, cursor:'pointer', transition:'all .18s' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:step===i?'linear-gradient(135deg,#2A5CAD,#C9A84C)':'rgba(42,92,173,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff', flexShrink:0 }}>{i+1}</div>
                <div style={{ fontSize:15, color:step===i?'#F0E8FF':'rgba(240,232,255,.65)', lineHeight:1.6, flex:1 }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {step > 0 && <button className="btn btn-ghost" onClick={()=>setStep(s=>s-1)}>← Prev Step</button>}
            {step < activeEx.steps.length-1 && <button className="btn btn-gold" onClick={()=>setStep(s=>s+1)}>Next Step →</button>}
            {step === activeEx.steps.length-1 && <div style={{ padding:'12px 20px', background:'rgba(110,231,183,.1)', border:'1px solid rgba(110,231,183,.25)', borderRadius:12, fontSize:15, color:'#6ee7b7', flex:1, textAlign:'center' }}>✓ Great work! Rest and listen to your body. 💙</div>}
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
          {recommended.map((ex,i)=>(
            <div key={ex.id} className="glass-card" style={{ padding:22, cursor:'pointer', animation:`fadeUp .3s ${i*.04}s both` }} onClick={()=>{setActiveEx(ex);setStep(0);}}>
              <div style={{ fontSize:32, marginBottom:12, filter:'drop-shadow(0 0 8px rgba(42,92,173,.5))' }}>{ex.icon}</div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:'#C9A84C', marginBottom:6 }}>{ex.title}</div>
              <div style={{ fontSize:16, color:'rgba(168,196,240,.6)', marginBottom:10 }}>{ex.category} · {ex.duration}</div>
              <div style={{ fontSize:16, color:'rgba(240,232,255,.55)', lineHeight:1.6, marginBottom:14 }}>{ex.benefit}</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:16, color:'rgba(201,168,76,.65)', background:'rgba(201,168,76,.08)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(201,168,76,.15)' }}>{ex.intensity}</span>
                <span style={{ fontSize:16, color:'rgba(42,92,173,.8)', fontWeight:600 }}>Start →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Profile ──────────────────────────────────────────────────
const COMMON_CONDITIONS=[
  'Fibromyalgia','POTS / Dysautonomia','EDS','ME/CFS','Lupus (SLE)','Rheumatoid Arthritis',
  'Multiple Sclerosis','Sjögren\'s Syndrome','Crohn\'s Disease','Ulcerative Colitis','IBS',
  'Endometriosis','MCAS','Hashimoto\'s','Hypothyroidism','Type 1 Diabetes','Type 2 Diabetes',
  'PCOS','Ankylosing Spondylitis','Psoriatic Arthritis','Raynaud\'s','Chronic Migraine',
  'Anxiety','Depression','ADHD','PTSD','Interstitial Cystitis','Hidradenitis Suppurativa',
  'Chronic Pain Syndrome','Small Fiber Neuropathy',
];

function Profile({ data, upd, user }) {
  const p = data.profile||{};
  const [name, setName]             = useState(p.name||'');
  const [careeName, setCareeName]   = useState(p.careeName||'');
  const [accountType, setAccountType] = useState(p.accountType||'self');
  const [goal, setGoal]             = useState(p.goal||'');
  const [conds, setConds] = useState(
    typeof p.conditions==='string'
      ? p.conditions.split(',').map(c=>c.trim()).filter(Boolean)
      : (Array.isArray(p.conditions) ? p.conditions : [])
  );
  const [custom, setCustom] = useState('');
  const [saved, setSaved]   = useState(false);

  const add = c => { const t = c.trim(); if (!t || conds.includes(t)) return; setConds(prev=>[...prev, t]); setCustom(''); };
  const rem = c => setConds(prev=>prev.filter(x=>x!==c));

  const save = () => {
    upd('profile', { ...p, name: name.trim(), careeName: careeName.trim(), accountType, goal: goal.trim(), conditions: conds.join(', ') });
    setSaved(true);
    setTimeout(()=>setSaved(false), 2500);
  };

  return(
    <div>
      <PH emoji="◈" title="My Health Profile" sub="Update your profile, conditions, and preferences at any time"/>
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        <div className="glass-card-static" style={{ padding:24 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:'#C9A84C', marginBottom:15 }}>Account Type</div>
          <div className="two-col">
            {[{v:'self',l:'Myself',d:'I have a chronic illness'},{v:'caree',l:'Someone I care for',d:'I help manage their health'}].map(o=>(
              <button key={o.v} onClick={()=>setAccountType(o.v)} style={{ padding:'13px 15px', borderRadius:14, border:`1.5px solid ${accountType===o.v?'#C9A84C':'rgba(42,92,173,.22)'}`, background:accountType===o.v?'rgba(201,168,76,.08)':'rgba(255,255,255,.03)', color:accountType===o.v?'#C9A84C':'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'left', transition:'all .15s' }}>
                <div style={{ fontSize:16, fontWeight:600, marginBottom:3 }}>{o.l}</div>
                <div style={{ fontSize:16, opacity:.7 }}>{o.d}</div>
              </button>
            ))}
          </div>
          {accountType==='caree' && (
            <div style={{ marginTop:14, padding:'12px 16px', background:'rgba(42,92,173,.07)', border:'1px solid rgba(42,92,173,.15)', borderRadius:12, fontSize:16, color:'rgba(168,196,240,.65)', lineHeight:1.7 }}>
              💙 <strong style={{ color:'#A8C4F0' }}>Patient Access:</strong> Share your account email and password with the person you're caring for so they can sign in to their own account. They'll see their health data in patient view.
            </div>
          )}
        </div>

        <div className="glass-card-static" style={{ padding:24 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:'#C9A84C', marginBottom:15 }}>Personal Info</div>
          <div className="two-col">
            <div><label>Your Name</label><input className="field" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sarah"/></div>
            {accountType==='caree' && <div><label>Name of person you care for</label><input className="field" value={careeName} onChange={e=>setCareeName(e.target.value)} placeholder="e.g. Mom, Dad, Jamie…"/></div>}
            <div style={{ gridColumn:accountType==='caree'?undefined:'1/-1' }}>
              <label>Wellness Goal</label>
              <input className="field" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. Be better understood by my doctors"/>
            </div>
          </div>
          <div style={{ marginTop:11, padding:'9px 13px', background:'rgba(42,92,173,.06)', borderRadius:11, fontSize:16, color:'rgba(240,232,255,.3)' }}>
            📧 Account email: <span style={{ color:'rgba(240,232,255,.55)' }}>{user?.email}</span>
            <span style={{ marginLeft:12, color:'rgba(240,232,255,.2)' }}>· Use "Forgot password" on sign-in to reset</span>
          </div>
        </div>

        <div className="glass-card-static" style={{ padding:24 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:'#C9A84C', marginBottom:7 }}>Diagnoses & Conditions</div>
          <div style={{ fontSize:16, color:'rgba(240,232,255,.35)', marginBottom:15, lineHeight:1.65 }}>
            Add, edit, or remove your diagnoses at any time. Lazuli uses these to personalize every response.
          </div>
          {conds.length>0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:17 }}>
              {conds.map(c=>(
                <div key={c} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(42,92,173,.15)', border:'1px solid rgba(42,92,173,.32)', borderRadius:20, padding:'5px 13px' }}>
                  <span style={{ fontSize:16, color:'#A8C4F0', fontWeight:500 }}>{c}</span>
                  <button onClick={()=>rem(c)} style={{ border:'none', background:'transparent', color:'rgba(168,196,240,.5)', cursor:'pointer', fontSize:16, lineHeight:1, padding:'0 0 0 2px' }}>×</button>
                </div>
              ))}
            </div>
          )}
          {conds.length===0 && (
            <div style={{ padding:'12px 14px', background:'rgba(42,92,173,.06)', borderRadius:11, fontSize:16, color:'rgba(240,232,255,.3)', marginBottom:15, fontStyle:'italic' }}>
              No conditions added yet. Use the options below to add yours.
            </div>
          )}
          <div style={{ marginBottom:15 }}>
            <label>Common Conditions (click to add)</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:7, maxHeight:190, overflowY:'auto' }}>
              {COMMON_CONDITIONS.filter(c=>!conds.includes(c)).map(c=>(
                <button key={c} onClick={()=>add(c)} style={{ padding:'4px 11px', borderRadius:20, fontSize:16, border:'1px solid rgba(42,92,173,.22)', background:'rgba(255,255,255,.03)', color:'rgba(240,232,255,.45)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .14s' }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#C9A84C';e.currentTarget.style.color='#C9A84C';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(42,92,173,.22)';e.currentTarget.style.color='rgba(240,232,255,.45)';}}>
                  + {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label>Add Custom Condition</label>
            <div style={{ display:'flex', gap:8, marginTop:6 }}>
              <input className="field" value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Type a diagnosis not listed above…" onKeyDown={e=>e.key==='Enter'&&add(custom)}/>
              <button className="btn btn-ghost" onClick={()=>add(custom)} style={{ flexShrink:0, fontSize:13 }}>Add</button>
            </div>
          </div>
        </div>

        {saved && <div style={{ padding:'12px 16px', background:'rgba(110,231,183,.1)', border:'1px solid rgba(110,231,183,.22)', borderRadius:12, fontSize:16, color:'#6ee7b7' }}>✓ Profile saved successfully!</div>}
        <button className="btn btn-gold" onClick={save} style={{ justifyContent:'center', padding:'14px', fontSize:15, width:'100%' }}>Save Profile</button>
      </div>
    </div>
  );
}

// ─── Share & Privacy (with section toggles) ───────────────────
function SharePrivacy({ data, upd, user }) {
  const [pin,setPin]=useState('');
  const [shareLink,setShareLink]=useState('');
  const [sharePin,setSharePin]=useState('');
  const [generating,setGenerating]=useState(false);
  const [copied,setCopied]=useState(false);
  const [sections, setSections] = useState({
    symptoms: true, medications: true, bodyMap: true,
    appointments: true, metabolic: true, hydration: false,
    documents: false, diary: false,
  });
  const [selectedDiaryIds, setSelectedDiaryIds] = useState([]);
  const toggleSection = k => setSections(s=>({...s,[k]:!s[k]}));

  const buildSnapshot=()=>{
    const snap = {
      name: data.profile?.name||'Anonymous',
      conditions: data.profile?.conditions,
      generatedAt: new Date().toISOString(),
    };
    if(sections.symptoms) snap.recentSymptoms = data.symptoms?.slice(0,10).map(s=>({date:s.date,symptoms:s.entries?.map(e=>`${e.symptom}(${e.severity}/10)`).join(', '),pain:s.pain,energy:s.energy,mood:s.mood,notes:s.notes}));
    if(sections.medications) snap.medications = data.medications?.filter(m=>m.active).map(m=>({name:m.name,dose:m.dose,frequency:m.frequency}));
    if(sections.bodyMap) snap.bodyMap = (data.bodyMap||[]).map(b=>({area:b.label,severity:b.severity,types:b.types}));
    if(sections.appointments) snap.appointments = data.appointments?.slice(0,5).map(a=>({date:a.date,provider:a.provider,type:a.type}));
    if(sections.metabolic) snap.metabolicLogs = (data.metabolicLogs||[]).slice(0,5);
    if(sections.documents) snap.documents = data.documents?.map(d=>({name:d.name,type:d.type,date:d.date}));
    if(sections.diary && selectedDiaryIds.length>0) snap.diaryEntries = data.diary?.filter(e=>selectedDiaryIds.includes(e.id)).map(e=>({date:e.date,mood:e.mood,text:e.text?.slice(0,500)}));
    return snap;
  };

  const generateLink=async()=>{
    if(!pin||pin.length<4){alert('Please enter a PIN of at least 4 characters.');return;}
    if(!Object.values(sections).some(Boolean)){alert('Please select at least one section to share.');return;}
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

  const sectionOptions = [
    {k:'symptoms',    l:'Symptoms & Vitals',   icon:'◈'},
    {k:'medications', l:'Medications',          icon:'◉'},
    {k:'bodyMap',     l:'Body Map Pain',         icon:'👤'},
    {k:'appointments',l:'Appointments',         icon:'🗓'},
    {k:'metabolic',   l:'Metabolic / Lab Data', icon:'🔬'},
    {k:'hydration',   l:'Hydration Logs',       icon:'💧'},
    {k:'documents',   l:'Documents',            icon:'🗂'},
    {k:'diary',       l:'Diary Entries',        icon:'📖'},
  ];

  return(
    <div>
      <PH emoji="⟡" title="Share & Privacy" sub="Share your health summary securely — you choose exactly what to include"/>
      <div className="share-card" style={{ marginBottom:18 }}>
        <div>
          <div style={{ display:'flex',alignItems:'center',gap:11,marginBottom:14 }}>
            <span style={{ fontSize:28 }}>🔗</span>
            <div>
              <div style={{ fontFamily:"'Cinzel',serif",fontSize:18,color:'#C9A84C' }}>Generate Secure Share Link</div>
              <div style={{ fontSize:16,color:'rgba(240,232,255,.3)' }}>Read-only · PIN-protected · Expires 7 days · Diary never included</div>
            </div>
          </div>

          {/* Section toggles */}
          <div style={{ marginBottom:16 }}>
            <label style={{ marginBottom:10 }}>Choose what to include</label>
            <div style={{ display:'flex',flexWrap:'wrap',gap:7,marginTop:8 }}>
              {sectionOptions.map(s=>(
                <button key={s.k} onClick={()=>toggleSection(s.k)} style={{ padding:'6px 13px',borderRadius:20,fontSize:16,border:`1.5px solid ${sections[s.k]?'#C9A84C':'rgba(42,92,173,.25)'}`,background:sections[s.k]?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)',color:sections[s.k]?'#C9A84C':'rgba(240,232,255,.38)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",display:'flex',alignItems:'center',gap:5,transition:'all .15s' }}>
                  {sections[s.k]?'✓ ':'+ '}{s.icon} {s.l}
                </button>
              ))}
            </div>
          </div>

          {sections.diary && data.diary?.length > 0 && (
            <div style={{ marginTop:12, padding:'14px 16px', background:'rgba(42,92,173,.08)', border:'1px solid rgba(42,92,173,.18)', borderRadius:12 }}>
              <div style={{ fontSize:16, fontWeight:700, color:'rgba(201,168,76,.7)', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>Select diary entries to share</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                {(data.diary||[]).map(entry=>{
                  const sel = selectedDiaryIds.includes(entry.id);
                  return (
                    <button key={entry.id} onClick={()=>setSelectedDiaryIds(prev=>sel?prev.filter(x=>x!==entry.id):[...prev,entry.id])}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:10, border:`1px solid ${sel?'rgba(201,168,76,.4)':'rgba(42,92,173,.2)'}`, background:sel?'rgba(201,168,76,.08)':'rgba(255,255,255,.02)', cursor:'pointer', textAlign:'left', fontFamily:"'DM Sans',sans-serif" }}>
                      <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${sel?'#C9A84C':'rgba(42,92,173,.4)'}`, background:sel?'rgba(201,168,76,.2)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#C9A84C', flexShrink:0 }}>{sel?'✓':''}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:16, color:'rgba(240,232,255,.8)', fontWeight:500 }}>{entry.date}</div>
                        <div style={{ fontSize:16, color:'rgba(240,232,255,.35)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:280 }}>{entry.text?.slice(0,60)||'No text'}…</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display:'grid',gridTemplateColumns:'1fr auto',gap:11,alignItems:'flex-end',marginBottom:14 }}>
            <div><label>Create a PIN (share separately)</label><input className="field" type="text" value={pin} onChange={e=>setPin(e.target.value)} placeholder="e.g. 7482 or a word" maxLength={20}/></div>
            <button className="btn btn-gold" onClick={generateLink} disabled={generating} style={{ whiteSpace:'nowrap',opacity:generating?.7:1 }}>
              {generating?<span style={{ display:'inline-block',width:15,height:15,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#000',borderRadius:'50%',animation:'spin .7s linear infinite' }}/>:'🔗 Generate'}
            </button>
          </div>
          {shareLink&&(
            <div style={{ background:'rgba(110,231,183,.06)',border:'1px solid rgba(110,231,183,.14)',borderRadius:12,padding:'15px 17px',animation:'popIn .25s ease' }}>
              <div style={{ fontSize:16,color:'#6ee7b7',fontWeight:600,marginBottom:8 }}>✓ Share link generated!</div>
              <div style={{ display:'flex',gap:7,marginBottom:11 }}>
                <input readOnly value={shareLink} className="field" style={{ fontSize:11 }}/>
                <button className="btn btn-ghost" style={{ fontSize:16,flexShrink:0 }} onClick={copyLink}>{copied?'✓ Copied!':'Copy'}</button>
              </div>
              <div style={{ fontSize:16,color:'rgba(240,232,255,.38)',padding:'8px 12px',background:'rgba(255,255,255,.03)',borderRadius:9,borderLeft:'3px solid rgba(201,168,76,.3)' }}>
                PIN: <strong style={{ color:'#C9A84C',letterSpacing:2 }}>{sharePin}</strong> — share this <em>separately</em>
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {[
          {icon:'🔐',title:'Your account is yours alone',color:'#6ee7b7',text:'Your data lives in a private Firebase Firestore database. Security rules ensure only you can access it.'},
          {icon:'💙', title:'About Lazuli AI',color:'#A8C4F0',text:'When you use Lazuli AI or AI Nutrition, a summary of your health data is sent to the Gemini API. No conversations are logged by Lazuli Crest.'},
          {icon:'📖',title:'Your diary is always private',color:'#C084FC',text:'Diary entries are never included in share links. They exist only in your personal account.'},
          {icon:'⚠️',title:'Medical disclaimer',color:'rgba(240,232,255,.4)',text:'Lazuli Crest is a personal health companion — NOT a medical service. In an emergency, call 911.'},
        ].map((s,i)=>(
          <div key={i} className="glass-card-static" style={{ padding:20,borderLeft:`3px solid ${s.color}33` }}>
            <div style={{ display:'flex',gap:13,alignItems:'flex-start' }}>
              <div style={{ fontSize:22,flexShrink:0 }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily:"'Cinzel',serif",fontWeight:600,fontSize:15,color:s.color,marginBottom:7 }}>{s.title}</div>
                <div style={{ fontSize:16,color:'rgba(240,232,255,.48)',lineHeight:1.75 }}>{s.text}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
