import { useState, useEffect } from "react";
import { todayStr, fmtDate } from "../utils/helpers";

const BRAIN_REGIONS = [
  {
    id: 'frontal',
    label: 'Frontal Lobe',
    desc: 'Decision-making, personality, focus, mood regulation',
    // Large front bulge
    d: 'M100,22 C78,20 56,26 40,40 C26,52 18,68 18,86 C18,100 24,112 34,120 L54,126 L100,128 Z',
    color: '#7B2FBE',
    cx: 58, cy: 80,
  },
  {
    id: 'parietal',
    label: 'Parietal Lobe',
    desc: 'Sensation, spatial awareness, processing touch',
    d: 'M100,22 L162,22 C176,34 182,52 180,72 C178,90 170,106 158,118 L134,126 L100,128 Z',
    color: '#2A5CAD',
    cx: 146, cy: 82,
  },
  {
    id: 'temporal_left',
    label: 'Left Temporal',
    desc: 'Language, memory, hearing',
    d: 'M18,86 C14,100 14,116 18,130 C22,148 32,162 48,170 L76,162 L54,126 L34,120 Z',
    color: '#E8A020',
    cx: 36, cy: 138,
  },
  {
    id: 'temporal_right',
    label: 'Right Temporal',
    desc: 'Music, faces, emotional memory',
    d: 'M158,118 L134,126 L122,162 L150,172 C166,166 176,152 180,134 C182,118 178,106 172,98 Z',
    color: '#E05050',
    cx: 160, cy: 146,
  },
  {
    id: 'occipital',
    label: 'Occipital Lobe',
    desc: 'Vision and visual processing',
    d: 'M76,162 C80,176 88,186 100,190 C112,186 120,176 124,162 L122,162 L100,128 L76,162 Z',
    color: '#1A9A6C',
    cx: 100, cy: 174,
  },
  {
    id: 'cerebellum',
    label: 'Cerebellum',
    desc: 'Balance, coordination, fine motor control',
    d: 'M48,170 C52,188 62,202 78,208 C88,214 100,214 112,212 C126,210 138,200 150,188 C155,180 158,172 156,164 L150,172 L124,162 L100,190 C88,186 80,176 76,162 L48,170 Z',
    color: '#1A8A8A',
    cx: 100, cy: 200,
  },
  {
    id: 'brainstem',
    label: 'Brain Stem',
    desc: 'Vital functions: breathing, heart rate, alertness',
    d: 'M88,212 Q100,216 112,212 L116,234 Q108,244 100,244 Q92,244 84,234 Z',
    color: '#8855CC',
    cx: 100, cy: 228,
  },
];

const BRAIN_SYMPTOMS = [
  { id:'migraine',   label:'Migraine',       icon:'⚡', anim:'lightning', color:'rgba(255,220,50,.85)' },
  { id:'pressure',   label:'Pressure',        icon:'🔴', anim:'heatmap',   color:'rgba(239,68,68,.75)'  },
  { id:'brain_fog',  label:'Brain Fog',       icon:'☁️', anim:'fog',       color:'rgba(148,163,184,.7)' },
  { id:'fatigue',    label:'Mental Fatigue',  icon:'💤', anim:'fatigue',   color:'rgba(168,130,220,.7)' },
  { id:'tingling',   label:'Tingling',        icon:'✦',  anim:'pulse',     color:'rgba(192,132,252,.7)' },
  { id:'confusion',  label:'Confusion',       icon:'◎',  anim:'spin',      color:'rgba(201,168,76,.7)'  },
];

const CSS = `
@keyframes lightning{0%,100%{opacity:0}10%,30%{opacity:.95}20%,40%{opacity:0}55%,75%{opacity:.75}65%{opacity:0}85%{opacity:.5}}
@keyframes heatPulse{0%,100%{opacity:.3}50%{opacity:.7}}
@keyframes fogDrift{0%{transform:translateX(-15px);opacity:0}20%{opacity:.55}80%{opacity:.45}100%{transform:translateX(15px);opacity:0}}
@keyframes fatigueDrop{0%{transform:translateY(-8px);opacity:0}20%{opacity:.9}100%{transform:translateY(28px);opacity:0}}
@keyframes brainPulse{0%,100%{opacity:.35;r:4}50%{opacity:.85;r:7}}
@keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes sulciGlow{0%,100%{stroke-opacity:.15}50%{stroke-opacity:.35}}
@keyframes regionPop{from{opacity:.5;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
.br{cursor:pointer;transition:all .25s}
.br path,.br ellipse{transition:all .25s}
.br:hover path,.br:hover ellipse{filter:brightness(1.4)}
.br.sel path,.br.sel ellipse{filter:brightness(1.25) drop-shadow(0 0 8px currentColor)}
`;

function BrainSVG({ selectedRegions, activeSymptom, onToggle }) {
  return (
    <svg viewBox="0 0 200 256" style={{ width:'100%', maxWidth:300 }}>
      <defs>
        <filter id="brainGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="bgGrad" cx="50%" cy="42%" r="54%">
          <stop offset="0%" stopColor="rgba(42,92,173,.1)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <style>{CSS}</style>

      {/* Outer ambient glow */}
      <ellipse cx="100" cy="120" rx="92" ry="102" fill="url(#bgGrad)"/>

      {/* Brain regions */}
      {BRAIN_REGIONS.map(r => {
        const sel = selectedRegions.includes(r.id);
        const anim = BRAIN_SYMPTOMS.find(s=>s.id===activeSymptom)?.anim||'';
        return (
          <g key={r.id} className={`br${sel?' sel':''}`} onClick={()=>onToggle(r.id)}>
            <path
              d={r.d}
              fill={sel ? r.color+'44' : r.color+'18'}
              stroke={sel ? r.color : r.color+'55'}
              strokeWidth={sel ? '1.8' : '1'}
            />
            {/* Symptom overlays */}
            {sel && anim==='lightning' && <path d={r.d} fill="rgba(255,220,50,.18)" style={{animation:'lightning 1.3s infinite',filter:'url(#brainGlow)'}}/>}
            {sel && anim==='heatmap'   && <path d={r.d} fill="rgba(239,68,68,.28)"  style={{animation:'heatPulse 1.8s infinite'}}/>}
            {sel && anim==='fog'       && <path d={r.d} fill="rgba(148,163,184,.28)" style={{animation:'fogDrift 3s infinite'}}/>}
            {sel && anim==='pulse'     && <path d={r.d} fill="rgba(192,132,252,.28)" style={{animation:'heatPulse 1.5s infinite'}}/>}
          </g>
        );
      })}

      {/* ── Gyri / sulci fold lines — makes it look like a real brain ── */}
      {/* Frontal sulci */}
      <path d="M36,56 C44,50 56,48 66,52" fill="none" stroke="rgba(168,196,240,.2)" strokeWidth="1.2" strokeLinecap="round" style={{animation:'sulciGlow 4s ease-in-out infinite'}}/>
      <path d="M26,72 C36,64 50,60 62,64" fill="none" stroke="rgba(168,196,240,.18)" strokeWidth="1" strokeLinecap="round" style={{animation:'sulciGlow 5s ease-in-out infinite'}}/>
      <path d="M22,90 C34,82 50,78 66,82" fill="none" stroke="rgba(168,196,240,.16)" strokeWidth="1" strokeLinecap="round" style={{animation:'sulciGlow 6s ease-in-out infinite'}}/>
      {/* Central sulcus */}
      <path d="M100,22 C98,50 98,80 100,128" fill="none" stroke="rgba(201,168,76,.15)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Parietal sulci */}
      <path d="M134,32 C148,40 158,52 160,68" fill="none" stroke="rgba(168,196,240,.18)" strokeWidth="1" strokeLinecap="round" style={{animation:'sulciGlow 4.5s ease-in-out infinite'}}/>
      <path d="M138,50 C152,60 162,74 162,90" fill="none" stroke="rgba(168,196,240,.15)" strokeWidth="1" strokeLinecap="round" style={{animation:'sulciGlow 5.5s ease-in-out infinite'}}/>
      {/* Lateral fissure */}
      <path d="M34,120 C54,112 76,110 100,112 C124,110 146,112 166,118" fill="none" stroke="rgba(42,92,173,.3)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Temporal sulci */}
      <path d="M22,120 C30,126 40,130 50,132" fill="none" stroke="rgba(168,196,240,.14)" strokeWidth="1" strokeLinecap="round"/>
      <path d="M22,134 C30,140 40,144 50,146" fill="none" stroke="rgba(168,196,240,.13)" strokeWidth="1" strokeLinecap="round"/>
      {/* Cerebellum folds */}
      <path d="M60,192 C72,186 88,184 100,186 C112,184 128,186 140,192" fill="none" stroke="rgba(42,92,173,.2)" strokeWidth="1" strokeLinecap="round"/>
      <path d="M56,200 C70,194 86,192 100,194 C114,192 130,194 144,200" fill="none" stroke="rgba(42,92,173,.18)" strokeWidth="1" strokeLinecap="round"/>
      <path d="M58,207 C72,202 86,200 100,201 C114,200 128,202 142,207" fill="none" stroke="rgba(42,92,173,.15)" strokeWidth="1" strokeLinecap="round"/>

      {/* Fatigue zzz */}
      {activeSymptom==='fatigue' && selectedRegions.length>0 && (
        ['💤','💤','💤'].map((z,i)=>(
          <text key={i} x={82+i*16} y={65} fontSize={12} style={{animation:`fatigueDrop ${1.8+i*.5}s ${i*.6}s infinite`}}>{z}</text>
        ))
      )}

      {/* Confusion swirl */}
      {activeSymptom==='confusion' && selectedRegions.length>0 && (
        <g transform="translate(100,112)">
          <circle r={65} fill="none" stroke="rgba(201,168,76,.18)" strokeWidth="1" strokeDasharray="8 5" style={{animation:'spinSlow 5s linear infinite',transformOrigin:'0 0'}}/>
          <circle r={48} fill="none" stroke="rgba(123,47,190,.15)" strokeWidth="1" strokeDasharray="6 6" style={{animation:'spinSlow 8s linear reverse infinite',transformOrigin:'0 0'}}/>
        </g>
      )}

      {/* Lightning bolts */}
      {activeSymptom==='migraine' && selectedRegions.length>0 && (
        <>
          <polyline points="92,42 86,62 94,62 80,90" fill="none" stroke="rgba(255,220,50,.85)" strokeWidth="2" strokeLinecap="round" style={{animation:'lightning 1.2s infinite',filter:'url(#brainGlow)'}}/>
          <polyline points="108,52 104,70 110,70 99,94" fill="none" stroke="rgba(255,200,50,.6)" strokeWidth="1.5" strokeLinecap="round" style={{animation:'lightning 1.5s .3s infinite',filter:'url(#softGlow)'}}/>
        </>
      )}

      {/* Region labels */}
      {BRAIN_REGIONS.map(r => {
        const sel = selectedRegions.includes(r.id);
        return (
          <text key={r.id+'l'} x={r.cx} y={r.cy} textAnchor="middle"
            fontSize={sel?9.5:8} fill={sel?r.color:'rgba(240,232,255,.28)'}
            fontFamily="'DM Sans',sans-serif" fontWeight={sel?'700':'400'}
            style={{pointerEvents:'none',transition:'all .2s'}}>
            {r.label.split(' ')[0]}
          </text>
        );
      })}
    </svg>
  );
}

export default function BrainSection({ data, upd }) {
  const brainLogs = data.brain || [];
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [activeSymptom, setActiveSymptom] = useState('');
  const [notes, setNotes] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const todayLog = brainLogs.find(l => l.date === todayStr());
    if (todayLog) {
      setSelectedRegions(todayLog.regions || []);
      setActiveSymptom(todayLog.symptom || '');
      setIntensity(todayLog.intensity || 5);
      setNotes(todayLog.notes || '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRegion = id => setSelectedRegions(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

  const save = () => {
    if (!selectedRegions.length || !activeSymptom) {
      setSaveMsg('Please select at least one region and a symptom type.');
      setTimeout(()=>setSaveMsg(''), 3000);
      return;
    }
    const entry = {
      id: todayStr()+'-'+activeSymptom,
      date: todayStr(),
      regions: selectedRegions,
      regionLabels: selectedRegions.map(id => BRAIN_REGIONS.find(r=>r.id===id)?.label||id),
      symptom: activeSymptom,
      symptomLabel: BRAIN_SYMPTOMS.find(s=>s.id===activeSymptom)?.label||activeSymptom,
      intensity, notes,
    };
    upd('brain', [...brainLogs.filter(l=>l.date!==todayStr()), entry]);
    setSaveMsg('Saved for today ✓');
    setTimeout(()=>setSaveMsg(''), 2500);
  };

  const UPLIFTING = [
    "Your brain is working hard every day — even when it doesn't feel like it.",
    "Tracking your neurological symptoms is one of the most powerful forms of self-advocacy.",
    "Every data point you log helps tell your story to your care team.",
    "Rest IS recovery. Your brain heals during stillness.",
    "You know your brain better than any scan. Trust what you feel.",
  ];
  const quote = UPLIFTING[new Date().getDate() % UPLIFTING.length];

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:600, color:'#C9A84C', marginBottom:4 }}>🧠 The Brain</div>
        <div style={{ fontSize:17, color:'rgba(240,232,255,.4)' }}>Map neurological symptoms onto your brain in real time</div>
      </div>

      <div style={{ marginBottom:20, padding:'14px 20px', background:'rgba(123,47,190,.07)', border:'1px solid rgba(123,47,190,.15)', borderRadius:14, fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'rgba(192,132,252,.7)', fontStyle:'italic', lineHeight:1.7 }}>
        💜 {quote}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:22, alignItems:'start' }} className="two-col">
        {/* Brain visual */}
        <div style={{ background:'rgba(4,2,14,.8)', backdropFilter:'blur(20px)', border:'1px solid rgba(123,47,190,.2)', borderRadius:20, padding:'20px 16px', display:'flex', flexDirection:'column', alignItems:'center', minWidth:220, boxShadow:'0 0 40px rgba(42,92,173,.08), inset 0 1px 0 rgba(168,196,240,.05)' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'rgba(201,168,76,.4)', letterSpacing:2, textTransform:'uppercase', marginBottom:14 }}>Click to mark regions</div>
          <BrainSVG selectedRegions={selectedRegions} activeSymptom={activeSymptom} onToggle={toggleRegion}/>
          {selectedRegions.length > 0 && (
            <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center' }}>
              {selectedRegions.map(id=>{
                const r = BRAIN_REGIONS.find(x=>x.id===id);
                return r ? <span key={id} style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:r.color+'22', border:`1px solid ${r.color}55`, color:r.color, fontFamily:"'DM Sans',sans-serif" }}>{r.label.split(' ')[0]}</span> : null;
              })}
            </div>
          )}
          <button onClick={()=>setSelectedRegions([])} style={{ marginTop:10, background:'transparent', border:'none', color:'rgba(240,232,255,.2)', fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>Clear all</button>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Symptom type */}
          <div style={{ background:'rgba(6,18,52,.86)', backdropFilter:'blur(20px)', border:'1px solid rgba(42,92,173,.35)', borderRadius:20, padding:18, boxShadow:'0 8px 32px rgba(0,0,0,.5)' }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:14 }}>What are you experiencing?</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:9 }}>
              {BRAIN_SYMPTOMS.map(s => (
                <button key={s.id} onClick={()=>setActiveSymptom(activeSymptom===s.id?'':s.id)} style={{ padding:'11px 14px', borderRadius:13, fontSize:15, border:`1.5px solid ${activeSymptom===s.id?s.color:'rgba(123,47,190,.2)'}`, background:activeSymptom===s.id?s.color.replace('.7',',.15').replace('.75',',.15').replace('.85',',.15'):'rgba(255,255,255,.03)', color:activeSymptom===s.id?'#F0E8FF':'rgba(240,232,255,.45)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'left', display:'flex', alignItems:'center', gap:9, transition:'all .16s', boxShadow:activeSymptom===s.id?`0 0 12px ${s.color.split(',')[0]+','+s.color.split(',')[1]+',.25)'}`:undefined }}>
                  <span style={{ fontSize:18 }}>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div style={{ background:'rgba(6,18,52,.86)', backdropFilter:'blur(20px)', border:'1px solid rgba(42,92,173,.35)', borderRadius:20, padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <label style={{ margin:0, fontSize:16 }}>Intensity</label>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:intensity>=8?'#f87171':intensity>=5?'#C9A84C':'#6ee7b7' }}>{intensity}<span style={{ fontSize:14, color:'rgba(240,232,255,.25)' }}>/10</span></span>
            </div>
            <input type="range" min={1} max={10} value={intensity} onChange={e=>setIntensity(+e.target.value)} style={{ width:'100%' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              <span style={{ fontSize:13, color:'rgba(110,231,183,.5)' }}>Mild</span>
              <span style={{ fontSize:13, color:'rgba(201,168,76,.5)' }}>Moderate</span>
              <span style={{ fontSize:13, color:'rgba(248,113,113,.5)' }}>Severe</span>
            </div>
          </div>

          {/* Notes */}
          <div style={{ background:'rgba(6,18,52,.86)', backdropFilter:'blur(20px)', border:'1px solid rgba(42,92,173,.35)', borderRadius:20, padding:18 }}>
            <label style={{ fontSize:16 }}>Notes</label>
            <textarea className="field" rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Duration, triggers, what helps, patterns you've noticed…" style={{ resize:'vertical', marginTop:8, fontSize:17 }}/>
          </div>

          {saveMsg && (
            <div style={{ padding:'11px 16px', borderRadius:12, background:saveMsg.includes('✓')?'rgba(110,231,183,.1)':'rgba(255,80,80,.1)', border:`1px solid ${saveMsg.includes('✓')?'rgba(110,231,183,.25)':'rgba(255,80,80,.2)'}`, fontSize:16, color:saveMsg.includes('✓')?'#6ee7b7':'#ff8080' }}>
              {saveMsg}
            </div>
          )}

          <button className="btn btn-gold" onClick={save} style={{ justifyContent:'center', padding:'14px', fontSize:17, letterSpacing:.5 }}>
            Save Today's Brain Log
          </button>
        </div>
      </div>

      {/* Region info panel */}
      {selectedRegions.length > 0 && (
        <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:10 }}>
          {selectedRegions.map(id => {
            const r = BRAIN_REGIONS.find(x=>x.id===id);
            if (!r) return null;
            return (
              <div key={id} style={{ padding:'14px 18px', background:r.color+'12', border:`1.5px solid ${r.color}33`, borderRadius:14, animation:'regionPop .3s ease' }}>
                <div style={{ fontWeight:700, fontSize:17, color:r.color, marginBottom:4 }}>{r.label}</div>
                <div style={{ fontSize:16, color:'rgba(240,232,255,.55)', lineHeight:1.6 }}>{r.desc}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {brainLogs.length > 0 && (
        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(201,168,76,.4)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:14 }}>History</div>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {[...brainLogs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(l => {
              const sym = BRAIN_SYMPTOMS.find(s=>s.id===l.symptom);
              return (
                <div key={l.id} style={{ padding:'13px 18px', background:'rgba(6,18,52,.7)', border:'1px solid rgba(42,92,173,.2)', borderRadius:14, display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:'#C9A84C', minWidth:90, flexShrink:0 }}>{fmtDate(l.date)}</div>
                  {sym && <span style={{ fontSize:18 }}>{sym.icon}</span>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:17, fontWeight:500, color:'#F0E8FF' }}>{l.symptomLabel}</div>
                    <div style={{ fontSize:15, color:'rgba(240,232,255,.35)', marginTop:2 }}>{l.regionLabels?.join(', ')}</div>
                  </div>
                  <div style={{ fontSize:20, fontWeight:700, color:'#f87171', fontFamily:"'Cormorant Garamond',serif" }}>{l.intensity}<span style={{ fontSize:13 }}>/10</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
