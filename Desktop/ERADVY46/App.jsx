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
  metabolicLogs: [], // New
  hydrationLogs: [], // New
};

const NAV = [
  { id:'dashboard',    icon:'💒',  label:'Home'            },
  { id:'symptoms',     icon:'📝',  label:'Symptoms'        },
  { id:'bodymap',      icon:'👤',  label:'Body Map'        },
  { id:'brain',        icon:'🧠',  label:'The Brain'       },
  { id:'infusion',     icon:'💉',  label:'Infusion Hub'    },
  { id:'metabolic',    icon:'🔬',  label:'Metabolic Lab'   }, // New
  { id:'hydration',    icon:'💧',  label:'Hydration'       }, // New
  { id:'medications',  icon:'◉',   label:'Medications'     },
  { id:'appointments', icon:'🗓',  label:'Appointments'    },
  { id:'diary',        icon:'📖',  label:'Dear Diary'      },
  { id:'diet',         icon:'✿',   label:'AI Diet'         },
  { id:'documents',    icon:'🗂',  label:'Documents'       },
  { id:'advocate',     icon:'🫂',  label:'AI Advocate'     },
  { id:'profile',      icon:'◈',   label:'My Profile'      },
  { id:'share',        icon:'🤳🏽',  label:'Share & Privacy' },
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
            {tab==='hydration'    && <HydrationFridge data={data} upd={upd}/>}
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