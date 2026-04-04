import { useState, useEffect, useRef } from "react";
import { todayStr } from "../utils";

// Brain regions with proper anatomical SVG paths
const BRAIN_REGIONS = [
  {
    id: 'frontal',
    label: 'Frontal Lobe',
    desc: 'Decision-making, focus, mood',
    d: 'M100,30 C70,28 44,38 30,58 C20,72 18,88 22,102 C28,116 40,122 54,124 L100,126 Z',
    color: '#9b59b6',
  },
  {
    id: 'parietal',
    label: 'Parietal Lobe',
    desc: 'Sensation, spatial awareness',
    d: 'M100,30 L170,30 C182,44 186,62 184,78 C182,94 174,108 164,118 L100,126 Z',
    color: '#3498db',
  },
  {
    id: 'temporal_left',
    label: 'Left Temporal',
    desc: 'Memory, language, hearing',
    d: 'M22,102 C18,116 18,132 22,146 C26,160 34,170 46,176 L76,168 L54,124 Z',
    color: '#e67e22',
  },
  {
    id: 'temporal_right',
    label: 'Right Temporal',
    desc: 'Music, faces, emotions',
    d: 'M164,118 C176,128 182,142 180,158 C178,172 170,180 158,184 L132,174 L164,118 Z',
    color: '#e74c3c',
  },
  {
    id: 'occipital',
    label: 'Occipital Lobe',
    desc: 'Vision, visual processing',
    d: 'M76,168 C80,182 90,192 100,194 C110,192 120,182 124,168 L100,172 Z',
    color: '#27ae60',
  },
  {
    id: 'cerebellum',
    label: 'Cerebellum',
    desc: 'Balance, coordination',
    d: 'M46,176 C50,192 62,204 78,208 C88,212 100,212 112,210 C126,208 138,200 148,188 L124,168 C120,182 110,192 100,194 C90,192 80,182 76,168 Z',
    color: '#16a085',
  },
  {
    id: 'brainstem',
    label: 'Brain Stem',
    desc: 'Vital functions, alertness',
    d: 'M88,210 Q100,214 112,210 L114,230 Q106,238 94,238 L86,230 Z',
    color: '#8e44ad',
  },
];

const BRAIN_SYMPTOMS = [
  { id:'migraine',    label:'Migraine / Headache', icon:'⚡', anim:'lightning' },
  { id:'pressure',   label:'Pressure / Tension',  icon:'🔴', anim:'heatmap'   },
  { id:'brain_fog',  label:'Brain Fog',            icon:'☁️', anim:'fog'       },
  { id:'fatigue',    label:'Mental Fatigue',       icon:'💤', anim:'fatigue'   },
  { id:'tingling',   label:'Tingling / Numbness',  icon:'✦', anim:'pulse'     },
  { id:'confusion',  label:'Confusion',            icon:'◎', anim:'spin'      },
];

const BRAIN_ANIM_CSS = `
@keyframes lightning {
  0%,100%{opacity:0} 10%,30%{opacity:.9} 20%,40%{opacity:0} 50%,70%{opacity:.7} 60%{opacity:0} 80%{opacity:.5}
}
@keyframes heatPulse {
  0%,100%{opacity:.35} 50%{opacity:.65}
}
@keyframes fogDrift {
  0%{transform:translateX(-20px) translateY(-8px);opacity:0}
  20%{opacity:.6}
  80%{opacity:.5}
  100%{transform:translateX(20px) translateY(4px);opacity:0}
}
@keyframes fatigueDrop {
  0%{transform:translateY(-10px);opacity:0}
  20%{opacity:.9}
  100%{transform:translateY(32px);opacity:0}
}
@keyframes brainPulse {
  0%,100%{transform:scale(1);opacity:.4}
  50%{transform:scale(1.04);opacity:.8}
}
@keyframes spinSlow {
  from{transform:rotate(0deg)} to{transform:rotate(360deg)}
}
@keyframes popIn {
  from{opacity:0;transform:scale(.93) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)}
}
.brain-region { cursor:pointer; transition:all .2s ease; }
.brain-region path { transition:all .2s ease; stroke-width:1.5; }
.brain-region:hover path { filter:brightness(1.3); stroke-width:2.5; }
.brain-region.active path { stroke-width:2.5; filter:brightness(1.2) drop-shadow(0 0 6px currentColor); }
`;

function BrainSVG({ selectedRegions, activeSymptom, onToggle }) {
  return (
    <svg viewBox="0 0 200 250" style={{ width:'100%', maxWidth:280 }}>
      <defs>
        <radialGradient id="brainBg" cx="50%" cy="45%" r="52%">
          <stop offset="0%" stopColor="rgba(123,47,190,.08)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
        {/* Lightning filter */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <style>{BRAIN_ANIM_CSS}</style>

      {/* Outer brain silhouette */}
      <ellipse cx="100" cy="115" rx="88" ry="96" fill="rgba(10,4,20,.6)" stroke="rgba(123,47,190,.25)" strokeWidth="1"/>

      {BRAIN_REGIONS.map(r => {
        const isActive = selectedRegions.includes(r.id);
        const sym = activeSymptom;
        return (
          <g key={r.id} className={`brain-region${isActive ? ' active' : ''}`} onClick={() => onToggle(r.id)}>
            <path
              d={r.d}
              fill={isActive ? r.color + '55' : r.color + '22'}
              stroke={isActive ? r.color : r.color + '66'}
              strokeWidth={isActive ? '2' : '1'}
            />
            {/* Symptom overlays */}
            {isActive && sym === 'lightning' && (
              <path d={r.d} fill="rgba(255,220,50,.15)" style={{ animation:'lightning 1.4s ease-in-out infinite', filter:'url(#glow)' }}/>
            )}
            {isActive && sym === 'heatmap' && (
              <path d={r.d} fill="rgba(239,68,68,.3)" style={{ animation:'heatPulse 1.8s ease-in-out infinite' }}/>
            )}
            {isActive && sym === 'fog' && (
              <path d={r.d} fill="rgba(148,163,184,.3)" style={{ animation:'fogDrift 3s ease-in-out infinite' }}/>
            )}
            {isActive && sym === 'pulse' && (
              <path d={r.d} fill="rgba(192,132,252,.3)" style={{ animation:'brainPulse 1.5s ease-in-out infinite' }}/>
            )}
          </g>
        );
      })}

      {/* Fatigue zzz particles */}
      {activeSymptom === 'fatigue' && selectedRegions.length > 0 && (
        <>
          {['💤','💤','💤'].map((z,i) => (
            <text key={i} x={80+i*18} y={70} fontSize={14} style={{ animation:`fatigueDrop ${1.8+i*0.5}s ease-in-out ${i*0.6}s infinite` }}>{z}</text>
          ))}
        </>
      )}

      {/* Confusion spin */}
      {activeSymptom === 'spin' && selectedRegions.length > 0 && (
        <g transform="translate(100,115)">
          <circle r={70} fill="none" stroke="rgba(192,132,252,.2)" strokeWidth="1" strokeDasharray="8 4" style={{ animation:'spinSlow 4s linear infinite', transformOrigin:'0 0' }}/>
          <circle r={50} fill="none" stroke="rgba(201,168,76,.15)" strokeWidth="1" strokeDasharray="6 6" style={{ animation:'spinSlow 6s linear reverse infinite', transformOrigin:'0 0' }}/>
        </g>
      )}

      {/* Lightning bolts for migraine */}
      {activeSymptom === 'lightning' && selectedRegions.length > 0 && (
        <>
          <polyline points="95,45 88,68 96,68 82,95" fill="none" stroke="rgba(255,220,50,.8)" strokeWidth="2" strokeLinecap="round" style={{ animation:'lightning 1.2s ease-in-out infinite', filter:'url(#glow)' }}/>
          <polyline points="110,55 105,74 111,74 100,98" fill="none" stroke="rgba(255,200,50,.6)" strokeWidth="1.5" strokeLinecap="round" style={{ animation:'lightning 1.5s ease-in-out .3s infinite', filter:'url(#glow)' }}/>
        </>
      )}

      {/* Region labels */}
      {BRAIN_REGIONS.filter(r => selectedRegions.includes(r.id) || true).map(r => {
        const isActive = selectedRegions.includes(r.id);
        // Approximate label positions
        const lp = {
          frontal:       { x:55,  y:85  },
          parietal:      { x:150, y:78  },
          temporal_left: { x:36,  y:140 },
          temporal_right:{ x:168, y:148 },
          occipital:     { x:100, y:183 },
          cerebellum:    { x:100, y:202 },
          brainstem:     { x:100, y:225 },
        };
        const lpos = lp[r.id] || { x:100, y:100 };
        return (
          <text key={r.id+'lbl'} x={lpos.x} y={lpos.y} textAnchor="middle"
            fontSize={isActive ? 9 : 8}
            fill={isActive ? r.color : 'rgba(240,232,255,.3)'}
            fontFamily="'DM Sans',sans-serif"
            fontWeight={isActive ? '700' : '400'}
            style={{ pointerEvents:'none', transition:'all .2s' }}>
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

  // Restore today's state on mount
  useEffect(() => {
    const todayLog = brainLogs.find(l => l.date === todayStr());
    if (todayLog) {
      setSelectedRegions(todayLog.regions || []);
      setActiveSymptom(todayLog.symptom || '');
      setIntensity(todayLog.intensity || 5);
      setNotes(todayLog.notes || '');
    }
  }, []);

  const toggleRegion = id => {
    setSelectedRegions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const save = () => {
    if (!selectedRegions.length || !activeSymptom) {
      setSaveMsg('Please select at least one region and a symptom type.');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }
    const entry = {
      id: todayStr() + '-' + activeSymptom,
      date: todayStr(),
      regions: selectedRegions,
      regionLabels: selectedRegions.map(id => BRAIN_REGIONS.find(r => r.id === id)?.label || id),
      symptom: activeSymptom,
      symptomLabel: BRAIN_SYMPTOMS.find(s => s.id === activeSymptom)?.label || activeSymptom,
      intensity,
      notes,
    };
    const updated = [...brainLogs.filter(l => l.date !== todayStr()), entry];
    upd('brain', updated);
    setSaveMsg('Saved for today ✓');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const UPLIFTING = [
    'Your brain is working hard every day — even when it feels like it isn\'t.',
    'Tracking your neurological symptoms is one of the most powerful forms of self-advocacy.',
    'Every data point you log helps tell your story to your care team.',
    'Rest is productive. Recovery is not failure.',
    'You know your brain better than anyone. Trust what you feel.',
  ];
  const quote = UPLIFTING[Math.floor(new Date().getDate() % UPLIFTING.length)];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', marginBottom:4 }}>🧠 The Brain</div>
          <div style={{ fontSize:14, color:'rgba(240,232,255,.4)' }}>Track neurological symptoms with real-time visual feedback</div>
        </div>
      </div>

      {/* Quote */}
      <div style={{ marginBottom:20, padding:'12px 18px', background:'rgba(123,47,190,.06)', border:'1px solid rgba(123,47,190,.12)', borderRadius:13, fontFamily:"'Cormorant Garamond',serif", fontSize:14, color:'rgba(192,132,252,.65)', fontStyle:'italic', lineHeight:1.7 }}>
        💜 {quote}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:24, alignItems:'start' }} className="two-col">
        {/* Brain SVG */}
        <div className="glass-card-static" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', minWidth:200 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.4)', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>Select regions</div>
          <BrainSVG selectedRegions={selectedRegions} activeSymptom={BRAIN_SYMPTOMS.find(s => s.id === activeSymptom)?.anim || ''} onToggle={toggleRegion}/>
          <button onClick={() => setSelectedRegions([])} style={{ marginTop:10, background:'transparent', border:'none', color:'rgba(240,232,255,.25)', fontSize:11, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Clear selection
          </button>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Region chips */}
          <div className="glass-card-static" style={{ padding:18 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:'#C9A84C', marginBottom:12 }}>Brain Regions</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {BRAIN_REGIONS.map(r => (
                <button key={r.id} onClick={() => toggleRegion(r.id)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, border:`1.5px solid ${selectedRegions.includes(r.id) ? r.color : 'rgba(123,47,190,.2)'}`, background:selectedRegions.includes(r.id) ? r.color+'22' : 'rgba(255,255,255,.03)', color:selectedRegions.includes(r.id) ? r.color : 'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .15s' }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Symptom type */}
          <div className="glass-card-static" style={{ padding:18 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:'#C9A84C', marginBottom:12 }}>Symptom Type</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }} className="two-col">
              {BRAIN_SYMPTOMS.map(s => (
                <button key={s.id} onClick={() => setActiveSymptom(activeSymptom === s.id ? '' : s.id)} style={{ padding:'10px 14px', borderRadius:12, fontSize:12, border:`1.5px solid ${activeSymptom===s.id ? '#C9A84C' : 'rgba(123,47,190,.2)'}`, background:activeSymptom===s.id ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.03)', color:activeSymptom===s.id ? '#C9A84C' : 'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'left', display:'flex', alignItems:'center', gap:8, transition:'all .15s' }}>
                  <span style={{ fontSize:16 }}>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div className="glass-card-static" style={{ padding:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <label style={{ margin:0 }}>Intensity</label>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:700, color:'#f87171' }}>{intensity}/10</span>
            </div>
            <input type="range" min={1} max={10} value={intensity} onChange={e => setIntensity(+e.target.value)} style={{ width:'100%', accentColor:'#C9A84C' }}/>
          </div>

          {/* Notes */}
          <div className="glass-card-static" style={{ padding:18 }}>
            <label>Notes</label>
            <textarea className="field" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe what you're experiencing — duration, triggers, what helps…" style={{ resize:'vertical', marginTop:6 }}/>
          </div>

          {saveMsg && (
            <div style={{ padding:'10px 16px', borderRadius:10, background:saveMsg.includes('✓') ? 'rgba(110,231,183,.1)' : 'rgba(255,80,80,.1)', border:`1px solid ${saveMsg.includes('✓') ? 'rgba(110,231,183,.25)' : 'rgba(255,80,80,.2)'}`, fontSize:13, color:saveMsg.includes('✓') ? '#6ee7b7' : '#ff8080' }}>
              {saveMsg}
            </div>
          )}

          <button className="btn btn-gold" onClick={save} style={{ justifyContent:'center', padding:'13px', fontSize:14 }}>
            Save Today's Brain Log
          </button>
        </div>
      </div>

      {/* History */}
      {brainLogs.length > 0 && (
        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.4)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>History</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[...brainLogs].sort((a,b) => b.date.localeCompare(a.date)).slice(0,10).map(l => {
              const sym = BRAIN_SYMPTOMS.find(s => s.id === l.symptom);
              return (
                <div key={l.id} className="glass-card-static" style={{ padding:'14px 18px', display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, color:'#C9A84C', minWidth:80, flexShrink:0 }}>{fmtDate(l.date)}</div>
                  {sym && <span style={{ fontSize:14 }}>{sym.icon}</span>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#F0E8FF' }}>{l.symptomLabel}</div>
                    <div style={{ fontSize:11, color:'rgba(240,232,255,.35)' }}>{l.regionLabels?.join(', ')}</div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#f87171', fontFamily:"'Cormorant Garamond',serif" }}>{l.intensity}/10</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
