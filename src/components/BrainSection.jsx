import { useState, useEffect } from "react";
import { todayStr, fmtDate } from "../utils/helpers";

// ─── Brain regions ─────────────────────────────────────────────
const BRAIN_REGIONS = [
  { id:'frontal',        label:'Frontal Lobe',    desc:'Decision-making, personality, focus, mood regulation',  cx:58,  cy:80,  d:'M100,22 C78,20 56,26 40,40 C26,52 18,68 18,86 C18,100 24,112 34,120 L54,126 L100,128 Z' },
  { id:'parietal',       label:'Parietal Lobe',   desc:'Sensation, spatial awareness, processing touch',        cx:146, cy:82,  d:'M100,22 L162,22 C176,34 182,52 180,72 C178,90 170,106 158,118 L134,126 L100,128 Z' },
  { id:'temporal_left',  label:'Left Temporal',   desc:'Language, memory, hearing',                             cx:36,  cy:138, d:'M18,86 C14,100 14,116 18,130 C22,148 32,162 48,170 L76,162 L54,126 L34,120 Z' },
  { id:'temporal_right', label:'Right Temporal',  desc:'Music, faces, emotional memory',                        cx:160, cy:146, d:'M158,118 L134,126 L122,162 L150,172 C166,166 176,152 180,134 C182,118 178,106 172,98 Z' },
  { id:'occipital',      label:'Occipital Lobe',  desc:'Vision and visual processing',                          cx:100, cy:174, d:'M76,162 C80,176 88,186 100,190 C112,186 120,176 124,162 L122,162 L100,128 L76,162 Z' },
  { id:'cerebellum',     label:'Cerebellum',      desc:'Balance, coordination, fine motor control',             cx:100, cy:200, d:'M48,170 C52,188 62,202 78,208 C88,214 100,214 112,212 C126,210 138,200 150,188 C155,180 158,172 156,164 L150,172 L124,162 L100,190 C88,186 80,176 76,162 L48,170 Z' },
  { id:'brainstem',      label:'Brain Stem',      desc:'Vital functions: breathing, heart rate, alertness',     cx:100, cy:228, d:'M88,212 Q100,216 112,212 L116,234 Q108,244 100,244 Q92,244 84,234 Z' },
];

// ─── 24 neurological symptoms, no emojis ──────────────────────
const SYMPTOM_CATS = ['Pain', 'Cognitive', 'Sensory', 'Movement', 'Autonomic'];

const BRAIN_SYMPTOMS = [
  // Pain
  { id:'migraine',     cat:'Pain',      label:'Migraine',                    color:'#FFE033', animKey:'migraine'    },
  { id:'pressure',     cat:'Pain',      label:'Head Pressure',               color:'#EF4444', animKey:'pressure'    },
  { id:'nerve_pain',   cat:'Pain',      label:'Nerve Pain',                  color:'#F97316', animKey:'nervepain'   },
  { id:'facial_pain',  cat:'Pain',      label:'Facial / Jaw Pain',           color:'#FB923C', animKey:'facepain'    },
  // Cognitive
  { id:'brain_fog',    cat:'Cognitive', label:'Brain Fog',                   color:'#94A3B8', animKey:'fog'         },
  { id:'memory',       cat:'Cognitive', label:'Memory Gaps',                 color:'#7C3AED', animKey:'memory'      },
  { id:'word_finding', cat:'Cognitive', label:'Word-Finding Difficulty',     color:'#A78BFA', animKey:'wordfind'    },
  { id:'confusion',    cat:'Cognitive', label:'Confusion / Disorientation',  color:'#D4A843', animKey:'confusion'   },
  { id:'fatigue',      cat:'Cognitive', label:'Mental Fatigue',              color:'#C084FC', animKey:'fatigue'     },
  // Sensory
  { id:'tingling',     cat:'Sensory',   label:'Tingling / Pins & Needles',   color:'#E879F9', animKey:'tingling'    },
  { id:'numbness',     cat:'Sensory',   label:'Numbness',                    color:'#7DD3FC', animKey:'numbness'    },
  { id:'photophobia',  cat:'Sensory',   label:'Light Sensitivity',           color:'#FDE68A', animKey:'photo'       },
  { id:'phonophobia',  cat:'Sensory',   label:'Sound Sensitivity',           color:'#6EE7B7', animKey:'phono'       },
  { id:'visual_aura',  cat:'Sensory',   label:'Visual Aura',                 color:'#F0ABFC', animKey:'aura'        },
  { id:'tinnitus',     cat:'Sensory',   label:'Tinnitus / Ringing',          color:'#38BDF8', animKey:'tinnitus'    },
  // Movement
  { id:'vertigo',      cat:'Movement',  label:'Vertigo / Dizziness',         color:'#34D399', animKey:'vertigo'     },
  { id:'coordination', cat:'Movement',  label:'Coordination Issues',         color:'#10B981', animKey:'coord'       },
  { id:'tremor',       cat:'Movement',  label:'Tremor / Shaking',            color:'#FCA5A5', animKey:'tremor'      },
  { id:'weakness',     cat:'Movement',  label:'Muscle Weakness',             color:'#FDA4AF', animKey:'weakness'    },
  // Autonomic
  { id:'sleep',        cat:'Autonomic', label:'Sleep Disruption',            color:'#818CF8', animKey:'sleep'       },
  { id:'mood',         cat:'Autonomic', label:'Mood Instability',            color:'#EC4899', animKey:'mood'        },
  { id:'heat_sens',    cat:'Autonomic', label:'Heat Sensitivity',            color:'#FDBA74', animKey:'heat'        },
  { id:'cold_sens',    cat:'Autonomic', label:'Cold Sensitivity',            color:'#BAE6FD', animKey:'cold'        },
  { id:'dysautonomia', cat:'Autonomic', label:'POTS / Dysautonomia',         color:'#F87171', animKey:'pots'        },
];

// ─── Sparkle node positions ────────────────────────────────────
const BRAIN_NODES = [
  { x:100, y:22, r:2.5 }, { x:18, y:86, r:2.0 }, { x:182, y:72, r:2.0 },
  { x:100, y:128, r:2.2 }, { x:48, y:170, r:1.8 }, { x:152, y:172, r:1.8 },
  { x:100, y:190, r:2.2 }, { x:100, y:244, r:1.8 },
];

// ─── All CSS animations for symptom overlays ───────────────────
const BRAIN_CSS = `
  @keyframes brainNodePulse  { 0%,100%{opacity:.45} 50%{opacity:1} }
  @keyframes brainVascular   { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-30} }
  @keyframes brainSulci      { 0%,100%{stroke-opacity:.12} 50%{stroke-opacity:.28} }

  /* Per-symptom animations — play directly on selected region path */
  @keyframes sym-migraine    { 0%,100%{opacity:0;fill:rgba(255,224,51,0)}
                               10%,30%{opacity:1;fill:rgba(255,224,51,.38)}
                               20%,40%{opacity:0;fill:rgba(255,224,51,0)}
                               60%,80%{opacity:.8;fill:rgba(255,120,0,.25)} }
  @keyframes sym-pressure    { 0%,100%{fill:rgba(239,68,68,.12);stroke-width:0}
                               50%{fill:rgba(239,68,68,.42);stroke-width:2.5} }
  @keyframes sym-nervepain   { 0%,100%{fill:rgba(249,115,22,.1)}
                               50%{fill:rgba(249,115,22,.38)} }
  @keyframes sym-facepain    { 0%,100%{fill:rgba(251,146,60,.1)}
                               50%{fill:rgba(251,146,60,.35)} }
  @keyframes sym-fog         { 0%{fill:rgba(148,163,184,.04);filter:blur(0px)}
                               50%{fill:rgba(148,163,184,.3);filter:blur(1.8px)}
                               100%{fill:rgba(148,163,184,.04);filter:blur(0px)} }
  @keyframes sym-memory      { 0%{fill:rgba(124,58,237,.25);opacity:1}
                               25%{opacity:.15} 50%{opacity:.9}
                               75%{opacity:.1} 100%{fill:rgba(124,58,237,.25);opacity:1} }
  @keyframes sym-wordfind    { 0%,100%{fill:rgba(167,139,250,.08)}
                               33%{fill:rgba(167,139,250,.38)}
                               66%{fill:rgba(167,139,250,.05)} }
  @keyframes sym-confusion   { 0%{fill:rgba(212,168,67,.1);stroke-dashoffset:0}
                               100%{fill:rgba(212,168,67,.2);stroke-dashoffset:-60} }
  @keyframes sym-fatigue     { 0%,100%{fill:rgba(192,132,252,.06);opacity:.4}
                               50%{fill:rgba(192,132,252,.2);opacity:1} }
  @keyframes sym-tingling    { 0%,33%,66%,100%{opacity:.2} 16%,50%,83%{opacity:1} }
  @keyframes sym-numbness    { 0%{fill:rgba(125,211,252,.04)}
                               50%{fill:rgba(125,211,252,.3)}
                               100%{fill:rgba(125,211,252,.04)} }
  @keyframes sym-photo       { 0%,100%{fill:rgba(253,230,138,.05)}
                               10%{fill:rgba(253,230,138,.55)}
                               20%{fill:rgba(253,230,138,.02)}
                               40%{fill:rgba(253,230,138,.4)} }
  @keyframes sym-phono       { 0%,100%{stroke-width:0;opacity:.1}
                               50%{stroke-width:3;opacity:.7} }
  @keyframes sym-aura        { 0%{fill:rgba(240,171,252,.1);stroke-dashoffset:0}
                               100%{fill:rgba(240,171,252,.25);stroke-dashoffset:40} }
  @keyframes sym-tinnitus    { 0%,100%{stroke-width:.5;opacity:.2}
                               50%{stroke-width:2;opacity:.85} }
  @keyframes sym-vertigo     { 0%{fill:rgba(52,211,153,.08);transform-origin:center;transform:rotate(0deg)}
                               100%{fill:rgba(52,211,153,.22);transform-origin:center;transform:rotate(360deg)} }
  @keyframes sym-coord       { 0%,100%{fill:rgba(16,185,129,.08);transform:translate(0,0)}
                               25%{transform:translate(1.5px,-1px)}
                               50%{transform:translate(-1px,1.5px)}
                               75%{transform:translate(1px,1px)} }
  @keyframes sym-tremor      { 0%,100%{transform:translate(0,0)}
                               20%{transform:translate(-1.5px,1px)}
                               40%{transform:translate(1.5px,-1px)}
                               60%{transform:translate(-1px,-1.5px)}
                               80%{transform:translate(1px,1.5px)} }
  @keyframes sym-weakness    { 0%,100%{fill:rgba(253,164,175,.08);opacity:.4}
                               50%{fill:rgba(253,164,175,.28);opacity:.9} }
  @keyframes sym-sleep       { 0%,100%{fill:rgba(129,140,248,.06)}
                               50%{fill:rgba(129,140,248,.3)} }
  @keyframes sym-mood        { 0%{fill:rgba(236,72,153,.08)}
                               33%{fill:rgba(139,92,246,.25)}
                               66%{fill:rgba(59,130,246,.18)}
                               100%{fill:rgba(236,72,153,.08)} }
  @keyframes sym-heat        { 0%,100%{fill:rgba(253,186,116,.08)}
                               50%{fill:rgba(253,186,116,.42)} }
  @keyframes sym-cold        { 0%,100%{fill:rgba(186,230,253,.05)}
                               50%{fill:rgba(186,230,253,.35)} }
  @keyframes sym-pots        { 0%,100%{fill:rgba(248,113,113,.08);stroke-width:.5}
                               25%{stroke-width:2.5;fill:rgba(248,113,113,.3)}
                               75%{stroke-width:.5;fill:rgba(248,113,113,.1)} }

  /* Region base styles */
  .br { cursor:pointer; }
  .br path {
    fill: rgba(201,168,76,.04);
    stroke: rgba(201,168,76,.22);
    stroke-width: 0.7;
    stroke-linejoin: round;
    transition: fill .2s, stroke .2s, stroke-width .2s, filter .2s;
  }
  .br:hover path {
    fill: rgba(42,92,173,.18);
    stroke: rgba(74,144,217,.8);
    stroke-width: 1.5;
    filter: drop-shadow(0 0 5px rgba(42,92,173,.5));
  }
  .br.sel path {
    fill: rgba(42,92,173,.26);
    stroke: #4A90D9;
    stroke-width: 2;
    filter: drop-shadow(0 0 8px rgba(42,92,173,.6));
  }

  /* Symptom overlay animations applied to matching path elements */
  .sym-overlay-migraine  { animation: sym-migraine  1.3s ease-in-out infinite; }
  .sym-overlay-pressure  { animation: sym-pressure  1.8s ease-in-out infinite; }
  .sym-overlay-nervepain { animation: sym-nervepain 2.2s ease-in-out infinite; }
  .sym-overlay-facepain  { animation: sym-facepain  2.5s ease-in-out infinite; }
  .sym-overlay-fog       { animation: sym-fog       3.5s ease-in-out infinite; }
  .sym-overlay-memory    { animation: sym-memory    2.0s ease-in-out infinite; }
  .sym-overlay-wordfind  { animation: sym-wordfind  1.6s ease-in-out infinite; }
  .sym-overlay-confusion { animation: sym-confusion 4.0s linear infinite; stroke:rgba(212,168,67,.4);stroke-dasharray:6 4; }
  .sym-overlay-fatigue   { animation: sym-fatigue   3.0s ease-in-out infinite; }
  .sym-overlay-tingling  { animation: sym-tingling  0.6s ease-in-out infinite; }
  .sym-overlay-numbness  { animation: sym-numbness  3.0s ease-in-out infinite; }
  .sym-overlay-photo     { animation: sym-photo     1.1s ease-in-out infinite; }
  .sym-overlay-phono     { animation: sym-phono     1.4s ease-in-out infinite; stroke:rgba(110,231,183,.5); }
  .sym-overlay-aura      { animation: sym-aura      2.5s linear infinite; stroke:rgba(240,171,252,.6);stroke-dasharray:3 5; }
  .sym-overlay-tinnitus  { animation: sym-tinnitus  1.2s ease-in-out infinite; stroke:rgba(56,189,248,.6);fill:none; }
  .sym-overlay-vertigo   { animation: sym-vertigo   3.0s linear infinite; }
  .sym-overlay-coord     { animation: sym-coord     0.8s ease-in-out infinite; }
  .sym-overlay-tremor    { animation: sym-tremor    0.25s ease-in-out infinite; }
  .sym-overlay-weakness  { animation: sym-weakness  2.8s ease-in-out infinite; }
  .sym-overlay-sleep     { animation: sym-sleep     4.0s ease-in-out infinite; }
  .sym-overlay-mood      { animation: sym-mood      4.0s ease-in-out infinite; }
  .sym-overlay-heat      { animation: sym-heat      2.0s ease-in-out infinite; }
  .sym-overlay-cold      { animation: sym-cold      2.5s ease-in-out infinite; }
  .sym-overlay-pots      { animation: sym-pots      1.5s ease-in-out infinite; }
`;

// ─── Brain corners ─────────────────────────────────────────────
function BrainCorners({ w=200, h=256 }) {
  const len=14, pad=4, color='rgba(201,168,76,.4)';
  const x1=pad, y1=pad, x2=w-pad, y2=h-pad;
  return (
    <>
      <polyline points={`${x1},${y1+len} ${x1},${y1} ${x1+len},${y1}`} fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="square"/>
      <polyline points={`${x2-len},${y1} ${x2},${y1} ${x2},${y1+len}`} fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="square"/>
      <polyline points={`${x1},${y2-len} ${x1},${y2} ${x1+len},${y2}`} fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="square"/>
      <polyline points={`${x2-len},${y2} ${x2},${y2} ${x2},${y2-len}`} fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="square"/>
    </>
  );
}

// ─── Brain SVG (no zoom, multi-region, multi-symptom overlays) ─
function BrainSVG({ selectedRegions, activeSymptoms, onToggle }) {
  return (
    <div style={{ position:'relative', overflow:'hidden', borderRadius:6, background:'#000', lineHeight:0 }}>
      <svg viewBox="0 0 200 256" style={{ width:'100%', maxWidth:300, display:'block' }}>

        <defs>
          <filter id="brnGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="brnNodeGlow">
            <feGaussianBlur stdDeviation="1.8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Clip paths — one per region so overlays are contained */}
          {BRAIN_REGIONS.map(r => (
            <clipPath key={`clip-${r.id}`} id={`bclip-${r.id}`}>
              <path d={r.d}/>
            </clipPath>
          ))}
        </defs>

        <style>{BRAIN_CSS}</style>

        {/* Black base */}
        <rect x="0" y="0" width="200" height="256" fill="#000"/>

        {/* Brain lobe underlay */}
        <g opacity="0.45">
          {BRAIN_REGIONS.map(r => (
            <path key={r.id+'-bg'} d={r.d} fill="rgba(201,168,76,.05)" stroke="rgba(201,168,76,.28)" strokeWidth="0.65" strokeLinejoin="round"/>
          ))}
        </g>

        {/* Gyri / sulci texture */}
        <path d="M62,36 C56,52 56,70 62,84" fill="none" stroke="rgba(201,168,76,.14)" strokeWidth="0.9" strokeLinecap="round"/>
        <path d="M40,58 C38,72 40,86 46,98"  fill="none" stroke="rgba(201,168,76,.10)" strokeWidth="0.8" strokeLinecap="round"/>
        <path d="M138,36 C144,52 144,70 138,84" fill="none" stroke="rgba(201,168,76,.14)" strokeWidth="0.9" strokeLinecap="round"/>
        <path d="M160,58 C162,72 160,86 154,98" fill="none" stroke="rgba(201,168,76,.10)" strokeWidth="0.8" strokeLinecap="round"/>
        <path d="M42,100 Q100,80 158,100" fill="none" stroke="rgba(74,144,217,.22)" strokeWidth="0.8" strokeLinecap="round"/>
        <path d="M56,186 Q100,180 144,186" fill="none" stroke="rgba(74,144,217,.18)" strokeWidth="0.7" strokeLinecap="round"/>
        <path d="M52,196 Q100,190 148,196" fill="none" stroke="rgba(74,144,217,.14)" strokeWidth="0.6" strokeLinecap="round"/>

        {/* Neural flows */}
        <path d="M42,100 Q100,75 158,100" fill="none" stroke="rgba(42,92,173,.4)" strokeWidth="1.2" strokeDasharray="4,4"
          style={{ animation:'brainVascular 3s linear infinite' }}/>
        <line x1="100" y1="212" x2="100" y2="244" stroke="rgba(42,92,173,.45)" strokeWidth="1.3" strokeDasharray="3,3"
          style={{ animation:'brainVascular 2.5s linear infinite' }}/>
        <path d="M34,120 Q28,140 26,162" fill="none" stroke="rgba(42,92,173,.28)" strokeWidth="0.8" strokeDasharray="2,4"
          style={{ animation:'brainVascular 4s 0.5s linear infinite' }}/>
        <path d="M166,118 Q172,138 174,162" fill="none" stroke="rgba(42,92,173,.28)" strokeWidth="0.8" strokeDasharray="2,4"
          style={{ animation:'brainVascular 4s 1.5s linear infinite' }}/>

        {/* Interactive regions */}
        {BRAIN_REGIONS.map(r => {
          const sel = selectedRegions.includes(r.id);
          return (
            <g key={r.id} className={`br${sel ? ' sel' : ''}`}
              onClick={e => { e.stopPropagation(); onToggle(r.id); }}>
              <path d={r.d}/>
            </g>
          );
        })}

        {/* ── Symptom animation overlays — clipped to each selected region ── */}
        {selectedRegions.map(regionId => {
          const region = BRAIN_REGIONS.find(r => r.id === regionId);
          if (!region) return null;
          return activeSymptoms.map(symId => {
            const sym = BRAIN_SYMPTOMS.find(s => s.id === symId);
            if (!sym) return null;
            return (
              <path
                key={`overlay-${regionId}-${symId}`}
                d={region.d}
                className={`sym-overlay-${sym.animKey}`}
                clipPath={`url(#bclip-${regionId})`}
                style={{ pointerEvents:'none' }}
              />
            );
          });
        })}

        {/* Lapis sparkle nodes */}
        {BRAIN_NODES.map((n, i) => (
          <g key={i} filter="url(#brnNodeGlow)">
            <circle cx={n.x} cy={n.y} r={n.r} fill="rgba(74,144,217,.8)"
              style={{ animation:`brainNodePulse ${2.0+(i%3)*.8}s ${(i%4)*.35}s ease-in-out infinite` }}/>
            <line x1={n.x-n.r*2} y1={n.y} x2={n.x+n.r*2} y2={n.y} stroke="rgba(74,144,217,.4)" strokeWidth="0.5"/>
            <line x1={n.x} y1={n.y-n.r*2} x2={n.x} y2={n.y+n.r*2} stroke="rgba(74,144,217,.4)" strokeWidth="0.5"/>
          </g>
        ))}

        {/* Region labels */}
        {BRAIN_REGIONS.map(r => {
          const sel = selectedRegions.includes(r.id);
          return (
            <text key={r.id+'l'} x={r.cx} y={r.cy} textAnchor="middle"
              fontSize={sel ? 9 : 7.5}
              fill={sel ? 'rgba(74,144,217,.95)' : 'rgba(201,168,76,.3)'}
              fontFamily="'DM Sans',sans-serif" fontWeight={sel ? '700' : '400'}
              style={{ pointerEvents:'none', transition:'all .2s' }}>
              {r.label.split(' ')[0]}
            </text>
          );
        })}

        <BrainCorners/>
        <text x="196" y="252" textAnchor="end" fontSize="5.5" fill="rgba(201,168,76,.3)" fontFamily="'DM Sans',sans-serif">LAZULI BIO</text>
      </svg>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────
export default function BrainSection({ data, upd }) {
  const brainLogs = data.brain || [];

  // Multi-select: regions AND symptoms
  const [selectedRegions,  setSelectedRegions]  = useState([]);
  const [activeSymptoms,   setActiveSymptoms]   = useState([]); // multiple symptoms at once
  const [intensity,        setIntensity]        = useState(5);
  const [notes,            setNotes]            = useState('');
  const [saveMsg,          setSaveMsg]          = useState('');
  const [activeCat,        setActiveCat]        = useState('Pain');
  const [showLog,          setShowLog]          = useState(false);

  const toggleRegion = id =>
    setSelectedRegions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSymptom = id =>
    setActiveSymptoms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const save = () => {
    if (!selectedRegions.length || !activeSymptoms.length) {
      setSaveMsg('Select at least one region and one symptom.');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }
    const entryId = `${todayStr()}-${Date.now()}`;
    const entry = {
      id: entryId,
      date: todayStr(),
      timestamp: Date.now(),
      regions: selectedRegions,
      regionLabels: selectedRegions.map(id => BRAIN_REGIONS.find(r => r.id === id)?.label || id),
      symptoms: activeSymptoms,
      symptomLabels: activeSymptoms.map(id => BRAIN_SYMPTOMS.find(s => s.id === id)?.label || id),
      intensity,
      notes,
    };
    upd('brain', [...brainLogs, entry]);
    // Reset for new entry
    setSelectedRegions([]);
    setActiveSymptoms([]);
    setIntensity(5);
    setNotes('');
    setSaveMsg('Logged successfully ✓');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const deleteLog = id => upd('brain', brainLogs.filter(l => l.id !== id));

  const catSymptoms = BRAIN_SYMPTOMS.filter(s => s.cat === activeCat);

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
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:22, fontWeight:700, color:'#C9A84C', marginBottom:4, letterSpacing:.5 }}>
          ◐ The Brain
        </div>
        <div style={{ fontSize:13, color:'rgba(74,144,217,.55)', fontFamily:"'DM Sans',sans-serif" }}>
          Select regions · choose symptoms · tap multiple of each simultaneously
        </div>
      </div>

      {/* Uplift quote */}
      <div style={{ marginBottom:20, padding:'12px 18px', background:'rgba(42,92,173,.06)', border:'1px solid rgba(42,92,173,.15)', borderRadius:12, fontSize:14, color:'rgba(168,196,240,.65)', lineHeight:1.7, fontFamily:"'DM Sans',sans-serif", fontStyle:'italic' }}>
        {quote}
      </div>

      {/* Main layout */}
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:22, alignItems:'start' }} className="two-col">

        {/* ── Brain visual ── */}
        <div style={{ background:'#000', border:'1px solid rgba(42,92,173,.2)', borderRadius:14, padding:'16px 12px', display:'flex', flexDirection:'column', alignItems:'center', minWidth:220, boxShadow:'0 0 48px rgba(42,92,173,.1)' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.35)', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>
            Tap regions to mark
          </div>

          <BrainSVG
            selectedRegions={selectedRegions}
            activeSymptoms={activeSymptoms}
            onToggle={toggleRegion}
          />

          {/* Selected regions chips */}
          {selectedRegions.length > 0 && (
            <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center' }}>
              {selectedRegions.map(id => {
                const r = BRAIN_REGIONS.find(x => x.id === id);
                return r ? (
                  <button key={id} onClick={() => toggleRegion(id)}
                    style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(42,92,173,.18)', border:'1px solid rgba(74,144,217,.4)', color:'rgba(74,144,217,.9)', fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>
                    {r.label} ×
                  </button>
                ) : null;
              })}
            </div>
          )}

          <button onClick={() => setSelectedRegions([])}
            style={{ marginTop:8, background:'transparent', border:'none', color:'rgba(168,196,240,.2)', fontSize:11, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Clear regions
          </button>
        </div>

        {/* ── Controls ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

          {/* Symptom category tabs */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(201,168,76,.5)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>
              Symptom Category
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
              {SYMPTOM_CATS.map(cat => (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .18s',
                    background: activeCat === cat ? 'rgba(201,168,76,.18)' : 'rgba(42,92,173,.06)',
                    border: `1.5px solid ${activeCat === cat ? 'rgba(201,168,76,.65)' : 'rgba(42,92,173,.25)'}`,
                    color: activeCat === cat ? '#C9A84C' : 'rgba(168,196,240,.45)',
                    boxShadow: activeCat === cat ? '0 0 10px rgba(201,168,76,.2)' : 'none',
                  }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Symptoms grid for active category */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {catSymptoms.map(s => {
                const active = activeSymptoms.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggleSymptom(s.id)}
                    style={{ padding:'7px 13px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .18s',
                      background: active ? `${s.color}22` : 'rgba(255,255,255,.04)',
                      border: `1.5px solid ${active ? s.color : 'rgba(255,255,255,.1)'}`,
                      color: active ? s.color : 'rgba(168,196,240,.5)',
                      boxShadow: active ? `0 0 12px ${s.color}40` : 'none',
                      transform: active ? 'translateY(-1px)' : 'none',
                    }}>
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Active symptoms summary */}
            {activeSymptoms.length > 0 && (
              <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:5 }}>
                {activeSymptoms.map(id => {
                  const s = BRAIN_SYMPTOMS.find(x => x.id === id);
                  return s ? (
                    <button key={id} onClick={() => toggleSymptom(id)}
                      style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:`${s.color}18`, border:`1px solid ${s.color}60`, color:s.color, fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>
                      {s.label} ×
                    </button>
                  ) : null;
                })}
                <button onClick={() => setActiveSymptoms([])}
                  style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'transparent', border:'1px solid rgba(168,196,240,.15)', color:'rgba(168,196,240,.3)', fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}>
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Intensity slider */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'rgba(201,168,76,.5)', letterSpacing:1.5, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>
                Intensity
              </span>
              <span style={{ fontSize:14, fontWeight:700, color: intensity>=8?'#EF4444':intensity>=5?'#F59E0B':'#6EE7B7', fontFamily:"'DM Sans',sans-serif" }}>
                {intensity} / 10 {intensity>=8?' — severe':intensity>=5?' — moderate':' — mild'}
              </span>
            </div>
            <input type="range" min="1" max="10" value={intensity} onChange={e=>setIntensity(+e.target.value)}
              style={{ width:'100%', accentColor:'#4A90D9' }}/>
          </div>

          {/* Notes */}
          <div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Add notes — triggers, onset time, other observations..."
              style={{ width:'100%', minHeight:70, background:'rgba(4,16,52,.8)', border:'1px solid rgba(42,92,173,.25)', borderRadius:10, color:'rgba(240,232,255,.8)', fontFamily:"'DM Sans',sans-serif", fontSize:14, padding:'10px 12px', resize:'vertical', outline:'none', lineHeight:1.6, boxSizing:'border-box' }}/>
          </div>

          {/* Save / feedback */}
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={save}
              style={{ padding:'10px 26px', borderRadius:12, background:'linear-gradient(135deg,rgba(42,92,173,.8),rgba(74,144,217,.6))', border:'1px solid rgba(74,144,217,.5)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .2s', boxShadow:'0 4px 16px rgba(42,92,173,.3)' }}>
              Log Entry
            </button>
            {saveMsg && (
              <span style={{ fontSize:13, color: saveMsg.includes('✓') ? '#6EE7B7' : '#F87171', fontFamily:"'DM Sans',sans-serif" }}>
                {saveMsg}
              </span>
            )}
          </div>

          {/* Region instructions */}
          {selectedRegions.length === 0 && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(42,92,173,.05)', border:'1px dashed rgba(42,92,173,.2)', fontSize:13, color:'rgba(168,196,240,.4)', fontFamily:"'DM Sans',sans-serif", lineHeight:1.6 }}>
              Tap a lobe on the brain diagram to select it. Select multiple regions and multiple symptoms — animations play directly on each chosen area.
            </div>
          )}
        </div>
      </div>

      {/* ── Brain Log ── */}
      {brainLogs.length > 0 && (
        <div style={{ marginTop:28 }}>
          <button onClick={() => setShowLog(s => !s)}
            style={{ display:'flex', alignItems:'center', gap:8, background:'transparent', border:'none', color:'rgba(201,168,76,.6)', fontSize:15, fontFamily:"'Cormorant Garamond',serif", fontWeight:700, cursor:'pointer', marginBottom: showLog ? 14 : 0, padding:0 }}>
            Brain Log ({brainLogs.length} {brainLogs.length === 1 ? 'entry' : 'entries'}) {showLog ? '▲' : '▼'}
          </button>
          {showLog && (
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:360, overflowY:'auto' }}>
              {[...brainLogs].reverse().map(entry => (
                <div key={entry.id} style={{ padding:'14px 16px', borderRadius:12, border:'1px solid rgba(42,92,173,.2)', background:'rgba(4,16,52,.7)', position:'relative' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'rgba(201,168,76,.7)', fontFamily:"'DM Sans',sans-serif" }}>
                      {fmtDate(entry.date)} — Intensity {entry.intensity}/10
                    </div>
                    <button onClick={() => deleteLog(entry.id)}
                      style={{ padding:'2px 8px', borderRadius:6, background:'transparent', border:'1px solid rgba(248,113,113,.2)', color:'rgba(248,113,113,.5)', fontSize:11, cursor:'pointer' }}>
                      ✕
                    </button>
                  </div>
                  <div style={{ fontSize:12, color:'rgba(74,144,217,.7)', marginBottom:4, fontFamily:"'DM Sans',sans-serif" }}>
                    Regions: {(entry.regionLabels || entry.regions || []).join(' · ')}
                  </div>
                  <div style={{ fontSize:12, color:'rgba(168,196,240,.65)', marginBottom: entry.notes ? 6 : 0, fontFamily:"'DM Sans',sans-serif" }}>
                    Symptoms: {(entry.symptomLabels || (entry.symptom ? [entry.symptom] : [])).join(' · ')}
                  </div>
                  {entry.notes && (
                    <div style={{ fontSize:12, color:'rgba(168,196,240,.4)', fontStyle:'italic', fontFamily:"'DM Sans',sans-serif" }}>
                      {entry.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
