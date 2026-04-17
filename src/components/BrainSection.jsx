import { useState, useEffect } from "react";
import { todayStr, fmtDate } from "../utils/helpers";

const BRAIN_REGIONS = [
  { id:'frontal',        label:'Frontal Lobe',    desc:'Decision-making, personality, focus, mood regulation',  cx:58,  cy:80,  d:'M100,22 C78,20 56,26 40,40 C26,52 18,68 18,86 C18,100 24,112 34,120 L54,126 L100,128 Z' },
  { id:'parietal',       label:'Parietal Lobe',   desc:'Sensation, spatial awareness, processing touch',        cx:146, cy:82,  d:'M100,22 L162,22 C176,34 182,52 180,72 C178,90 170,106 158,118 L134,126 L100,128 Z' },
  { id:'temporal_left',  label:'Left Temporal',   desc:'Language, memory, hearing',                             cx:36,  cy:138, d:'M18,86 C14,100 14,116 18,130 C22,148 32,162 48,170 L76,162 L54,126 L34,120 Z' },
  { id:'temporal_right', label:'Right Temporal',  desc:'Music, faces, emotional memory',                        cx:160, cy:146, d:'M158,118 L134,126 L122,162 L150,172 C166,166 176,152 180,134 C182,118 178,106 172,98 Z' },
  { id:'occipital',      label:'Occipital Lobe',  desc:'Vision and visual processing',                          cx:100, cy:174, d:'M76,162 C80,176 88,186 100,190 C112,186 120,176 124,162 L122,162 L100,128 L76,162 Z' },
  { id:'cerebellum',     label:'Cerebellum',      desc:'Balance, coordination, fine motor control',             cx:100, cy:200, d:'M48,170 C52,188 62,202 78,208 C88,214 100,214 112,212 C126,210 138,200 150,188 C155,180 158,172 156,164 L150,172 L124,162 L100,190 C88,186 80,176 76,162 L48,170 Z' },
  { id:'brainstem',      label:'Brain Stem',      desc:'Vital functions: breathing, heart rate, alertness',     cx:100, cy:228, d:'M88,212 Q100,216 112,212 L116,234 Q108,244 100,244 Q92,244 84,234 Z' },
];

const BRAIN_SYMPTOMS = [
  { id:'migraine',  label:'Migraine',       icon:'⚡', color:'rgba(255,220,50,.85)'  },
  { id:'pressure',  label:'Pressure',       icon:'🔴', color:'rgba(239,68,68,.75)'   },
  { id:'brain_fog', label:'Brain Fog',      icon:'☁️', color:'rgba(148,163,184,.7)'  },
  { id:'fatigue',   label:'Mental Fatigue', icon:'💤', color:'rgba(168,130,220,.7)'  },
  { id:'tingling',  label:'Tingling',       icon:'✦',  color:'rgba(192,132,252,.7)'  },
  { id:'confusion', label:'Confusion',      icon:'◎',  color:'rgba(201,168,76,.7)'   },
];

// Lapis blue node sparkle positions on the brain
const BRAIN_NODES = [
  { x:100, y:22,  r:2.5 }, // apex
  { x:18,  y:86,  r:2.0 }, // frontal lower-left
  { x:182, y:72,  r:2.0 }, // parietal top-right
  { x:100, y:128, r:2.2 }, // central sulcus midpoint
  { x:48,  y:170, r:1.8 }, // temporal-cerebellum junction left
  { x:152, y:172, r:1.8 }, // temporal-cerebellum junction right
  { x:100, y:190, r:2.2 }, // cerebellum center
  { x:100, y:244, r:1.8 }, // brainstem base
];

const BRAIN_CSS = `
  @keyframes brainNodePulse { 0%,100%{opacity:.45;r:2} 50%{opacity:1;r:3.5} }
  @keyframes brainVascular  { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-30} }
  @keyframes brainSulci     { 0%,100%{stroke-opacity:.12} 50%{stroke-opacity:.28} }
  @keyframes lightning       { 0%,100%{opacity:0} 15%,35%{opacity:.95} 25%,45%{opacity:0} 60%,80%{opacity:.7} 70%{opacity:0} }
  @keyframes heatPulse       { 0%,100%{opacity:.25} 50%{opacity:.65} }
  @keyframes fogDrift        { 0%{transform:translateX(-12px);opacity:0} 20%{opacity:.5} 80%{opacity:.4} 100%{transform:translateX(12px);opacity:0} }
  @keyframes fatigueDrop     { 0%{transform:translateY(-6px);opacity:0} 20%{opacity:.9} 100%{transform:translateY(24px);opacity:0} }
  @keyframes spinSlow        { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  .br { cursor:pointer; }
  .br path {
    fill: rgba(201,168,76,.04);
    stroke: rgba(201,168,76,.22);
    stroke-width: 0.7;
    stroke-linejoin: round;
    transition: fill .18s, stroke .18s, stroke-width .18s, filter .18s;
  }
  .br:hover path {
    fill: rgba(42,92,173,.2);
    stroke: rgba(74,144,217,.85);
    stroke-width: 1.5;
    filter: drop-shadow(0 0 5px rgba(42,92,173,.55));
  }
  .br.sel path {
    fill: rgba(42,92,173,.28);
    stroke: #4A90D9;
    stroke-width: 2;
    filter: drop-shadow(0 0 8px rgba(42,92,173,.65));
  }
`;

function BrainCorners({ w=200, h=256 }) {
  const len=14, pad=4, color='rgba(201,168,76,.4)';
  const x1=pad,y1=pad,x2=w-pad,y2=h-pad;
  return (
    <>
      <polyline points={`${x1},${y1+len} ${x1},${y1} ${x1+len},${y1}`} fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="square"/>
      <polyline points={`${x2-len},${y1} ${x2},${y1} ${x2},${y1+len}`} fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="square"/>
      <polyline points={`${x1},${y2-len} ${x1},${y2} ${x1+len},${y2}`} fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="square"/>
      <polyline points={`${x2-len},${y2} ${x2},${y2} ${x2},${y2-len}`} fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="square"/>
    </>
  );
}

function BrainSVG({ selectedRegions, activeSymptom, onToggle, zoomedId, onZoomChange }) {
  const zoomedRegion = BRAIN_REGIONS.find(r => r.id === zoomedId);
  const svgTransform = zoomedRegion ? `scale(2.8)` : 'scale(1)';
  const svgOrigin   = zoomedRegion
    ? `${(zoomedRegion.cx / 200) * 100}% ${(zoomedRegion.cy / 256) * 100}%`
    : '50% 50%';

  return (
    <div style={{ position:'relative', overflow:'hidden', borderRadius:6, background:'#000', lineHeight:0 }}>
      <svg
        viewBox="0 0 200 256"
        style={{
          width:'100%', maxWidth:300, display:'block',
          transform: svgTransform,
          transformOrigin: svgOrigin,
          transition: 'transform .55s cubic-bezier(.22,1,.36,1)',
          cursor: zoomedRegion ? 'zoom-out' : 'default',
        }}
        onClick={e => { if (e.currentTarget === e.target) onZoomChange(null); }}
      >
        <defs>
          <filter id="brnGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="brnNodeGlow">
            <feGaussianBlur stdDeviation="1.8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <style>{BRAIN_CSS}</style>

        {/* — Black base — */}
        <rect x="0" y="0" width="200" height="256" fill="#000"/>

        {/* ── Pure SVG brain diagram (replaces PNG wireframe) ── */}
        {/* Brain lobe underlay — all regions faintly drawn */}
        <g opacity="0.45">
          {BRAIN_REGIONS.map(r => (
            <path key={r.id+'-bg'} d={r.d}
              fill="rgba(201,168,76,0.05)"
              stroke="rgba(201,168,76,0.28)"
              strokeWidth="0.65"
              strokeLinejoin="round"/>
          ))}
        </g>
        {/* Brain outer highlight lines — gyri/sulci texture */}
        <path d="M62,36 C56,52 56,70 62,84" fill="none" stroke="rgba(201,168,76,0.14)" strokeWidth="0.9" strokeLinecap="round"/>
        <path d="M40,58 C38,72 40,86 46,98" fill="none" stroke="rgba(201,168,76,0.10)" strokeWidth="0.8" strokeLinecap="round"/>
        <path d="M138,36 C144,52 144,70 138,84" fill="none" stroke="rgba(201,168,76,0.14)" strokeWidth="0.9" strokeLinecap="round"/>
        <path d="M160,58 C162,72 160,86 154,98" fill="none" stroke="rgba(201,168,76,0.10)" strokeWidth="0.8" strokeLinecap="round"/>
        {/* Central sulcus */}
        <path d="M42,100 Q100,80 158,100" fill="none" stroke="rgba(74,144,217,0.22)" strokeWidth="0.8" strokeLinecap="round"/>
        {/* Cerebellum folds */}
        <path d="M56,186 Q100,180 144,186" fill="none" stroke="rgba(74,144,217,0.18)" strokeWidth="0.7" strokeLinecap="round"/>
        <path d="M52,196 Q100,190 148,196" fill="none" stroke="rgba(74,144,217,0.14)" strokeWidth="0.6" strokeLinecap="round"/>

        {/* — Neural pathway lapis lines — */}
        {/* Corpus callosum arc */}
        <path d="M42,100 Q100,75 158,100"
          fill="none" stroke="rgba(42,92,173,.4)" strokeWidth="1.2" strokeDasharray="4,4"
          style={{ animation:'brainVascular 3s linear infinite' }}/>
        {/* Spinal cord continuation */}
        <line x1="100" y1="212" x2="100" y2="244"
          stroke="rgba(42,92,173,.45)" strokeWidth="1.3" strokeDasharray="3,3"
          style={{ animation:'brainVascular 2.5s linear infinite' }}/>
        {/* Left neural bundle */}
        <path d="M34,120 Q28,140 26,162"
          fill="none" stroke="rgba(42,92,173,.28)" strokeWidth="0.8" strokeDasharray="2,4"
          style={{ animation:'brainVascular 4s 0.5s linear infinite' }}/>
        {/* Right neural bundle */}
        <path d="M166,118 Q172,138 174,162"
          fill="none" stroke="rgba(42,92,173,.28)" strokeWidth="0.8" strokeDasharray="2,4"
          style={{ animation:'brainVascular 4s 1.5s linear infinite' }}/>

        {/* — Sulci / gyri fold lines — */}
        <path d="M36,56 C44,50 56,48 66,52" fill="none" stroke="rgba(201,168,76,.14)" strokeWidth="1" strokeLinecap="round" style={{ animation:'brainSulci 4s ease-in-out infinite' }}/>
        <path d="M26,72 C36,64 50,60 62,64" fill="none" stroke="rgba(201,168,76,.12)" strokeWidth="1" strokeLinecap="round" style={{ animation:'brainSulci 5s 0.5s ease-in-out infinite' }}/>
        <path d="M22,90 C34,82 50,78 66,82" fill="none" stroke="rgba(201,168,76,.1)" strokeWidth="0.8" strokeLinecap="round" style={{ animation:'brainSulci 6s 1s ease-in-out infinite' }}/>
        <path d="M134,32 C148,40 158,52 160,68" fill="none" stroke="rgba(201,168,76,.12)" strokeWidth="0.9" strokeLinecap="round" style={{ animation:'brainSulci 4.5s ease-in-out infinite' }}/>
        <path d="M138,50 C152,60 162,74 162,90" fill="none" stroke="rgba(201,168,76,.1)" strokeWidth="0.8" strokeLinecap="round" style={{ animation:'brainSulci 5.5s 1s ease-in-out infinite' }}/>
        {/* Lateral fissure */}
        <path d="M34,120 C54,112 76,110 100,112 C124,110 146,112 166,118" fill="none" stroke="rgba(42,92,173,.28)" strokeWidth="1.2" strokeLinecap="round"/>
        {/* Cerebellum folds */}
        <path d="M60,192 C72,186 88,184 100,186 C112,184 128,186 140,192" fill="none" stroke="rgba(42,92,173,.18)" strokeWidth="0.9" strokeLinecap="round"/>
        <path d="M56,200 C70,194 86,192 100,194 C114,192 130,194 144,200" fill="none" stroke="rgba(42,92,173,.15)" strokeWidth="0.8" strokeLinecap="round"/>

        {/* — Interactive region hotspots — */}
        {BRAIN_REGIONS.map(r => {
          const sel = selectedRegions.includes(r.id);
          const isZoomed = zoomedId === r.id;
          const anim = BRAIN_SYMPTOMS.find(s => s.id === activeSymptom)?.id || '';
          return (
            <g key={r.id} className={`br${sel ? ' sel' : ''}`}
              onClick={e => { e.stopPropagation(); onToggle(r.id); onZoomChange(isZoomed ? null : r.id); }}>
              <path d={r.d}/>
              {/* Symptom overlays */}
              {sel && anim==='migraine'  && <path d={r.d} fill="rgba(255,220,50,.15)" style={{ animation:'lightning 1.3s infinite', filter:'url(#brnGlow)' }}/>}
              {sel && anim==='pressure'  && <path d={r.d} fill="rgba(239,68,68,.22)"  style={{ animation:'heatPulse 1.8s infinite' }}/>}
              {sel && anim==='brain_fog' && <path d={r.d} fill="rgba(148,163,184,.22)" style={{ animation:'fogDrift 3s infinite' }}/>}
              {sel && anim==='tingling'  && <path d={r.d} fill="rgba(192,132,252,.22)" style={{ animation:'heatPulse 1.5s infinite' }}/>}
            </g>
          );
        })}

        {/* — Fatigue zzz — */}
        {activeSymptom==='fatigue' && selectedRegions.length>0 && (
          ['💤','💤','💤'].map((z,i)=>(
            <text key={i} x={82+i*16} y={65} fontSize={11}
              style={{ animation:`fatigueDrop ${1.8+i*.5}s ${i*.6}s infinite` }}>{z}</text>
          ))
        )}

        {/* — Confusion swirl — */}
        {activeSymptom==='confusion' && selectedRegions.length>0 && (
          <g transform="translate(100,112)">
            <circle r={65} fill="none" stroke="rgba(201,168,76,.15)" strokeWidth="1" strokeDasharray="8 5"
              style={{ animation:'spinSlow 5s linear infinite', transformOrigin:'0 0' }}/>
            <circle r={48} fill="none" stroke="rgba(42,92,173,.12)" strokeWidth="1" strokeDasharray="6 6"
              style={{ animation:'spinSlow 8s linear reverse infinite', transformOrigin:'0 0' }}/>
          </g>
        )}

        {/* — Lightning migraine bolts — */}
        {activeSymptom==='migraine' && selectedRegions.length>0 && (
          <>
            <polyline points="92,42 86,62 94,62 80,90" fill="none" stroke="rgba(255,220,50,.85)" strokeWidth="1.8" strokeLinecap="round" style={{ animation:'lightning 1.2s infinite', filter:'url(#brnGlow)' }}/>
            <polyline points="108,52 104,70 110,70 99,94" fill="none" stroke="rgba(255,200,50,.55)" strokeWidth="1.3" strokeLinecap="round" style={{ animation:'lightning 1.5s .3s infinite' }}/>
          </>
        )}

        {/* — Lapis sparkle nodes — */}
        {BRAIN_NODES.map((n, i) => (
          <g key={i} filter="url(#brnNodeGlow)">
            <circle cx={n.x} cy={n.y} r={n.r}
              fill="rgba(74,144,217,.8)"
              style={{ animation:`brainNodePulse ${2.0 + (i%3)*0.8}s ${(i%4)*0.35}s ease-in-out infinite` }}/>
            <line x1={n.x-n.r*2} y1={n.y} x2={n.x+n.r*2} y2={n.y} stroke="rgba(74,144,217,.4)" strokeWidth="0.5"/>
            <line x1={n.x} y1={n.y-n.r*2} x2={n.x} y2={n.y+n.r*2} stroke="rgba(74,144,217,.4)" strokeWidth="0.5"/>
          </g>
        ))}

        {/* — Region labels — */}
        {BRAIN_REGIONS.map(r => {
          const sel = selectedRegions.includes(r.id);
          return (
            <text key={r.id+'l'} x={r.cx} y={r.cy} textAnchor="middle"
              fontSize={sel ? 9 : 7.5} fill={sel ? 'rgba(74,144,217,.95)' : 'rgba(201,168,76,.3)'}
              fontFamily="'DM Sans',sans-serif" fontWeight={sel ? '700' : '400'}
              style={{ pointerEvents:'none', transition:'all .2s' }}>
              {r.label.split(' ')[0]}
            </text>
          );
        })}

        {/* — Blueprint corners — */}
        <BrainCorners />

        {/* — Zoom-state indicator corner — */}
        <text x="196" y="252" textAnchor="end" fontSize="5.5"
          fill="rgba(201,168,76,.3)" fontFamily="'DM Sans',sans-serif">
          LAZULI BIO
        </text>
      </svg>

      {/* Zoom-out button */}
      {zoomedId && (
        <button onClick={() => onZoomChange(null)}
          style={{ position:'absolute', top:8, right:8, zIndex:10, background:'rgba(0,0,0,.75)', border:'1px solid rgba(201,168,76,.4)', borderRadius:8, padding:'4px 10px', fontSize:11, color:'rgba(201,168,76,.85)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          ← Zoom out
        </button>
      )}
    </div>
  );
}

export default function BrainSection({ data, upd }) {
  const brainLogs = data.brain || [];
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [activeSymptom, setActiveSymptom] = useState('');
  const [notes, setNotes] = useState('');
  const [intensity, setIntensity] = useState(5);
  const [saveMsg, setSaveMsg] = useState('');
  const [zoomedId, setZoomedId] = useState(null);

  useEffect(() => {
    const todayLog = brainLogs.find(l => l.date === todayStr());
    if (todayLog) {
      setSelectedRegions(todayLog.regions || []);
      setActiveSymptom(todayLog.symptom || '');
      setIntensity(todayLog.intensity || 5);
      setNotes(todayLog.notes || '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRegion = id => setSelectedRegions(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const save = () => {
    if (!selectedRegions.length || !activeSymptom) {
      setSaveMsg('Please select at least one region and a symptom type.');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }
    const entry = {
      id: todayStr()+'-'+activeSymptom,
      date: todayStr(),
      regions: selectedRegions,
      regionLabels: selectedRegions.map(id => BRAIN_REGIONS.find(r => r.id === id)?.label || id),
      symptom: activeSymptom,
      symptomLabel: BRAIN_SYMPTOMS.find(s => s.id === activeSymptom)?.label || activeSymptom,
      intensity, notes,
    };
    upd('brain', [...brainLogs.filter(l => l.date !== todayStr()), entry]);
    setSaveMsg('Saved for today ✓');
    setTimeout(() => setSaveMsg(''), 2500);
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
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:22, fontWeight:700, color:'#C9A84C', marginBottom:4, letterSpacing:.5 }}>◐ The Brain</div>
        <div style={{ fontSize:13, color:'rgba(74,144,217,.55)', fontFamily:"'DM Sans',sans-serif" }}>
          Map neurological symptoms · tap a region to select · tap again to zoom in
        </div>
      </div>

      {/* Uplift quote */}
      <div style={{ marginBottom:20, padding:'12px 18px', background:'rgba(42,92,173,.06)', border:'1px solid rgba(42,92,173,.15)', borderRadius:12, fontSize:14, color:'rgba(168,196,240,.65)', lineHeight:1.7, fontFamily:"'DM Sans',sans-serif", fontStyle:'italic' }}>
        💜 {quote}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:22, alignItems:'start' }} className="two-col">
        {/* Brain visual */}
        <div style={{ background:'#000', border:'1px solid rgba(42,92,173,.2)', borderRadius:14, padding:'16px 12px', display:'flex', flexDirection:'column', alignItems:'center', minWidth:220, boxShadow:'0 0 48px rgba(42,92,173,.1), 0 0 80px rgba(201,168,76,.03)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(201,168,76,.35)', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>
            Click to mark regions · tap to zoom
          </div>

          <BrainSVG
            selectedRegions={selectedRegions}
            activeSymptom={activeSymptom}
            onToggle={toggleRegion}
            zoomedId={zoomedId}
            onZoomChange={setZoomedId}
          />

          {selectedRegions.length > 0 && (
            <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center' }}>
              {selectedRegions.map(id => {
                const r = BRAIN_REGIONS.find(x => x.id === id);
                return r ? (
                  <span key={id} style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:'rgba(42,92,173,.14)', border:'1px solid rgba(74,144,217,.3)', color:'rgba(74,144,217,.9)', fontFamily:"'DM Sans',sans-serif" }}>
                    {r.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
          <button onClick={() => { setSelectedRegions([]); setZoomedId(null); }}
            style={{ marginTop:10, background:'transparent', border:'none', color:'rgba(168,196,240,.2)', fontSize:11, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Clear all
          </button>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Symptom type */}
          <div className="glass-card-static" style={{ padding:18, border:'1px solid rgba(42,92,173,.2)' }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, fontWeight:600, color:'#C9A84C', marginBottom:14, letterSpacing:.3 }}>What are you experiencing?</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {BRAIN_SYMPTOMS.map(s => (
                <button key={s.id}
                  onClick={() => setActiveSymptom(activeSymptom === s.id ? '' : s.id)}
                  style={{
                    padding:'10px 12px', borderRadius:11, fontSize:13,
                    border:`1.5px solid ${activeSymptom===s.id ? 'rgba(74,144,217,.7)' : 'rgba(42,92,173,.2)'}`,
                    background: activeSymptom===s.id ? 'rgba(42,92,173,.15)' : 'rgba(255,255,255,.02)',
                    color: activeSymptom===s.id ? 'rgba(168,196,240,.95)' : 'rgba(168,196,240,.4)',
                    cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'left',
                    display:'flex', alignItems:'center', gap:8, transition:'all .16s',
                    boxShadow: activeSymptom===s.id ? '0 0 12px rgba(42,92,173,.2)' : 'none',
                  }}>
                  <span style={{ fontSize:16 }}>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div className="glass-card-static" style={{ padding:18, border:'1px solid rgba(42,92,173,.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <label style={{ margin:0, fontSize:13 }}>Intensity</label>
              <span style={{ fontSize:20, fontWeight:700, color: intensity>=8?'#f87171':intensity>=5?'#C9A84C':'#6ee7b7', fontFamily:"'DM Sans',sans-serif" }}>
                {intensity}<span style={{ fontSize:12, color:'rgba(168,196,240,.25)' }}>/10</span>
              </span>
            </div>
            <input type="range" min={1} max={10} value={intensity}
              onChange={e => setIntensity(+e.target.value)}
              style={{ width:'100%', accentColor:'#4A90D9' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              <span style={{ fontSize:11, color:'rgba(110,231,183,.45)' }}>Mild</span>
              <span style={{ fontSize:11, color:'rgba(201,168,76,.45)' }}>Moderate</span>
              <span style={{ fontSize:11, color:'rgba(248,113,113,.45)' }}>Severe</span>
            </div>
          </div>

          {/* Notes */}
          <div className="glass-card-static" style={{ padding:18, border:'1px solid rgba(42,92,173,.2)' }}>
            <label style={{ fontSize:13 }}>Notes</label>
            <textarea className="field" rows={3} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Duration, triggers, what helps, patterns you've noticed…"
              style={{ resize:'vertical', marginTop:8, fontSize:14 }}/>
          </div>

          {saveMsg && (
            <div style={{ padding:'10px 16px', borderRadius:10, background:saveMsg.includes('✓')?'rgba(110,231,183,.08)':'rgba(255,80,80,.08)', border:`1px solid ${saveMsg.includes('✓')?'rgba(110,231,183,.2)':'rgba(255,80,80,.18)'}`, fontSize:14, color:saveMsg.includes('✓')?'#6ee7b7':'#ff8080' }}>
              {saveMsg}
            </div>
          )}

          <button className="btn btn-gold" onClick={save}
            style={{ justifyContent:'center', padding:'13px', fontSize:15, letterSpacing:.5 }}>
            Save Today's Brain Log
          </button>
        </div>
      </div>

      {/* Region info cards */}
      {selectedRegions.length > 0 && (
        <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:10 }}>
          {selectedRegions.map(id => {
            const r = BRAIN_REGIONS.find(x => x.id === id);
            if (!r) return null;
            return (
              <div key={id} style={{ padding:'14px 16px', background:'rgba(42,92,173,.08)', border:'1px solid rgba(74,144,217,.22)', borderRadius:12 }}>
                <div style={{ fontWeight:700, fontSize:14, color:'rgba(74,144,217,.9)', marginBottom:4, fontFamily:"'Cinzel',serif", letterSpacing:.3 }}>{r.label}</div>
                <div style={{ fontSize:13, color:'rgba(168,196,240,.55)', lineHeight:1.6 }}>{r.desc}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {brainLogs.length > 0 && (
        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(201,168,76,.4)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>History</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[...brainLogs].sort((a,b) => b.date.localeCompare(a.date)).slice(0,10).map(l => {
              const sym = BRAIN_SYMPTOMS.find(s => s.id === l.symptom);
              return (
                <div key={l.id} style={{ padding:'12px 16px', background:'rgba(42,92,173,.05)', border:'1px solid rgba(42,92,173,.15)', borderRadius:12, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:'rgba(201,168,76,.7)', minWidth:90, flexShrink:0 }}>{fmtDate(l.date)}</div>
                  {sym && <span style={{ fontSize:16 }}>{sym.icon}</span>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:500, color:'rgba(220,232,255,.85)' }}>{l.symptomLabel}</div>
                    <div style={{ fontSize:12, color:'rgba(168,196,240,.35)', marginTop:2 }}>{l.regionLabels?.join(', ')}</div>
                  </div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#f87171', fontFamily:"'DM Sans',sans-serif" }}>
                    {l.intensity}<span style={{ fontSize:11, color:'rgba(168,196,240,.3)' }}>/10</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
