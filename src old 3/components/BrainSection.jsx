import { useState, useEffect } from "react";
import { todayStr, fmtDate } from "../utils";

// Brain lobes styled exactly like the medical illustration reference:
// Frontal (gold/yellow-green), Motor Cortex (orange), Somatosensory (red-orange),
// Parietal (purple), Temporal (olive-green), Occipital (blue), Cerebellum (teal), Brainstem (light teal)
const BRAIN_LOBES = [
  {
    id: 'frontal',
    label: 'Frontal Lobe',
    desc: 'Emotion, decision-making, organization',
    // Large forward lobe — left side dominant
    d: 'M90,46 C72,44 52,52 40,68 C30,80 28,98 34,112 C40,124 52,132 66,136 L82,134 L90,118 L94,100 L96,80 L96,58 Z',
    color: '#b8a830',
    labelPos: { x:58, y:88 },
  },
  {
    id: 'prefrontal',
    label: 'Prefrontal Cortex',
    desc: 'Short term memory, attention',
    d: 'M96,58 L96,80 L94,100 L90,118 L96,130 L104,132 L110,118 L112,100 L110,78 L106,60 Z',
    color: '#c8a020',
    labelPos: { x:103, y:95 },
  },
  {
    id: 'motor',
    label: 'Motor Cortex',
    desc: 'Movement and coordination',
    d: 'M110,78 L112,100 L110,118 L116,132 L124,136 L132,132 L136,116 L136,96 L130,78 L120,72 Z',
    color: '#d4661a',
    labelPos: { x:122, y:104 },
  },
  {
    id: 'somatosensory',
    label: 'Somatosensory',
    desc: 'Sensation processing',
    d: 'M130,78 L136,96 L136,116 L132,132 L138,138 L148,140 L156,134 L158,116 L156,94 L148,78 Z',
    color: '#c03010',
    labelPos: { x:144, y:108 },
  },
  {
    id: 'parietal',
    label: 'Parietal Lobe',
    desc: 'Sensory info, spatial awareness',
    d: 'M148,78 L156,94 L158,116 L156,134 L164,136 L174,130 L180,118 L180,96 L174,78 L162,70 Z',
    color: '#7040b0',
    labelPos: { x:164, y:104 },
  },
  {
    id: 'temporal',
    label: 'Temporal Lobe',
    desc: 'Memory, language, hearing',
    d: 'M34,112 C28,126 28,146 34,160 C40,172 52,180 66,182 L78,178 L86,166 L90,148 L88,132 L82,134 L66,136 Z',
    color: '#6a7820',
    labelPos: { x:56, y:152 },
  },
  {
    id: 'occipital',
    label: 'Occipital Lobe',
    desc: 'Visual processing',
    d: 'M164,136 L174,130 L180,118 L182,138 L180,156 L170,168 L156,172 L144,168 L138,156 L138,138 L148,140 L156,134 Z',
    color: '#2060b0',
    labelPos: { x:160, y:152 },
  },
  {
    id: 'cerebellum',
    label: 'Cerebellum',
    desc: 'Skill memory, movement coordination',
    d: 'M86,166 L78,178 L66,182 L68,196 L80,208 L96,214 L112,216 L128,214 L142,208 L152,196 L152,180 L142,170 L130,168 L118,166 L104,164 Z',
    color: '#148888',
    labelPos: { x:109, y:194 },
  },
  {
    id: 'brainstem',
    label: 'Brain Stem',
    desc: 'Heart rate, breathing, alertness, sleep',
    d: 'M104,164 L118,166 L130,168 L134,182 L132,196 L128,214 L116,218 L104,218 L96,214 L96,198 L98,182 Z',
    color: '#20a898',
    labelPos: { x:115, y:198 },
  },
];

const BRAIN_SYMPTOMS = [
  { id:'migraine',   label:'Migraine / Headache',  icon:'⚡', anim:'lightning' },
  { id:'pressure',   label:'Pressure / Tension',   icon:'🔴', anim:'heatmap'   },
  { id:'brain_fog',  label:'Brain Fog',             icon:'☁️', anim:'fog'       },
  { id:'fatigue',    label:'Mental Fatigue',        icon:'💤', anim:'fatigue'   },
  { id:'tingling',   label:'Tingling / Numbness',   icon:'✦',  anim:'pulse'     },
  { id:'confusion',  label:'Confusion / Disorientation', icon:'◎', anim:'spin' },
];

const ANIM_CSS = `
@keyframes lightning {
  0%,100%{opacity:0} 8%,24%{opacity:.95} 16%,40%{opacity:0} 52%,68%{opacity:.75} 60%{opacity:0} 80%{opacity:.5}
}
@keyframes heatPulse {
  0%,100%{opacity:.3} 50%{opacity:.65}
}
@keyframes fogDrift {
  0%{transform:translate(-14px,-6px);opacity:0}
  20%{opacity:.55}
  80%{opacity:.5}
  100%{transform:translate(16px,4px);opacity:0}
}
@keyframes fatigueBob {
  0%{transform:translateY(0);opacity:0}
  15%{opacity:1}
  85%{opacity:.9}
  100%{transform:translateY(-28px);opacity:0}
}
@keyframes gentlePulse {
  0%,100%{opacity:.35;transform:scale(1)}
  50%{opacity:.75;transform:scale(1.03)}
}
@keyframes slowSpin {
  from{transform:rotate(0deg)} to{transform:rotate(360deg)}
}
@keyframes lobeHover {
  from{filter:brightness(1)} to{filter:brightness(1.25)}
}
`;

function BrainIllustration({ selectedRegions, activeSymptom, onToggle }) {
  return (
    <svg viewBox="0 0 220 240" style={{ width:'100%', maxWidth:260, display:'block', margin:'0 auto' }}>
      <style>{ANIM_CSS}</style>
      <defs>
        <filter id="lobeGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="softShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,.5)" floodOpacity="0.5"/>
        </filter>
        <clipPath id="brainClip">
          <path d="M34,60 C20,80 16,112 22,140 C28,168 44,190 68,204 C84,214 100,218 116,218 C132,218 150,214 164,204 C180,192 190,174 192,154 C196,132 188,110 178,94 C166,76 148,64 130,58 C114,52 96,48 80,48 C64,48 46,52 34,60 Z"/>
        </clipPath>
      </defs>

      {/* Brain base — cream/tan like the illustration */}
      <path d="M34,60 C20,80 16,112 22,140 C28,168 44,190 68,204 C84,214 100,218 116,218 C132,218 150,214 164,204 C180,192 190,174 192,154 C196,132 188,110 178,94 C166,76 148,64 130,58 C114,52 96,48 80,48 C64,48 46,52 34,60 Z"
        fill="rgba(15,6,30,.85)" stroke="rgba(123,47,190,.3)" strokeWidth="1.5"/>

      {/* Render lobes */}
      {BRAIN_LOBES.map(lobe => {
        const isActive  = selectedRegions.includes(lobe.id);
        const sym       = activeSymptom;
        const baseAlpha = isActive ? '.65' : '.28';
        const col       = lobe.color;

        // Parse hex → rgba
        const hex = col.replace('#','');
        const r = parseInt(hex.slice(0,2),16);
        const g = parseInt(hex.slice(2,4),16);
        const b = parseInt(hex.slice(4,6),16);

        return (
          <g key={lobe.id} onClick={() => onToggle(lobe.id)} style={{ cursor:'pointer' }}>
            {/* Main lobe fill */}
            <path
              d={lobe.d}
              fill={`rgba(${r},${g},${b},${isActive?'.55':'.22'})`}
              stroke={`rgba(${r},${g},${b},${isActive?'.9':'.5'})`}
              strokeWidth={isActive ? 2 : 1}
              strokeLinejoin="round"
              filter={isActive ? 'url(#lobeGlow)' : undefined}
              style={{ transition:'all .2s ease' }}
            />

            {/* Symptom overlays */}
            {isActive && sym === 'lightning' && (
              <path d={lobe.d} fill={`rgba(255,220,50,.18)`}
                style={{ animation:'lightning 1.3s ease-in-out infinite', filter:'url(#lobeGlow)', pointerEvents:'none' }}/>
            )}
            {isActive && sym === 'heatmap' && (
              <path d={lobe.d} fill={`rgba(239,68,68,.28)`}
                style={{ animation:'heatPulse 1.8s ease-in-out infinite', pointerEvents:'none' }}/>
            )}
            {isActive && sym === 'fog' && (
              <path d={lobe.d} fill={`rgba(180,190,210,.22)`}
                style={{ animation:'fogDrift 3.2s ease-in-out infinite', pointerEvents:'none' }}/>
            )}
            {isActive && sym === 'pulse' && (
              <path d={lobe.d} fill={`rgba(192,132,252,.25)`}
                style={{ animation:'gentlePulse 1.6s ease-in-out infinite', pointerEvents:'none' }}/>
            )}
          </g>
        );
      })}

      {/* Sulci / gyri lines — gives the brain texture */}
      <g fill="none" strokeLinejoin="round" style={{ pointerEvents:'none' }}>
        <path d="M80,60 Q74,72 72,86 Q70,96 74,106" stroke="rgba(123,47,190,.12)" strokeWidth="1"/>
        <path d="M96,52 Q90,64 90,80 Q90,94 88,108" stroke="rgba(123,47,190,.1)" strokeWidth="1"/>
        <path d="M116,50 Q112,64 112,82" stroke="rgba(123,47,190,.1)" strokeWidth="1"/>
        <path d="M134,56 Q130,70 128,86 Q126,100 128,114" stroke="rgba(123,47,190,.1)" strokeWidth="1"/>
        <path d="M150,68 Q148,82 146,96 Q144,110 146,124" stroke="rgba(123,47,190,.1)" strokeWidth="1"/>
        <path d="M164,88 Q162,102 160,116" stroke="rgba(123,47,190,.1)" strokeWidth="1"/>
        <path d="M60,120 Q58,136 60,150 Q62,162 66,172" stroke="rgba(123,47,190,.1)" strokeWidth="1"/>
        <path d="M76,136 Q78,150 76,164" stroke="rgba(123,47,190,.1)" strokeWidth="0.8"/>
        {/* Lobe dividing fissures */}
        <path d="M96,130 Q104,120 116,118 Q128,116 136,124" stroke="rgba(200,200,220,.12)" strokeWidth="1.2" strokeDasharray="3,2"/>
        <path d="M88,168 Q100,160 116,158 Q132,156 144,164" stroke="rgba(200,200,220,.12)" strokeWidth="1.2" strokeDasharray="3,2"/>
      </g>

      {/* Lightning bolts (migraine) */}
      {activeSymptom === 'lightning' && selectedRegions.length > 0 && (
        <>
          <polyline points="104,42 97,62 105,62 88,88" fill="none" stroke="rgba(255,220,50,.85)" strokeWidth="2.2" strokeLinecap="round"
            style={{ animation:'lightning 1.1s ease-in-out infinite', filter:'url(#lobeGlow)', pointerEvents:'none' }}/>
          <polyline points="120,40 115,58 121,58 110,80" fill="none" stroke="rgba(255,200,50,.65)" strokeWidth="1.6" strokeLinecap="round"
            style={{ animation:'lightning 1.4s ease-in-out .25s infinite', filter:'url(#lobeGlow)', pointerEvents:'none' }}/>
          <polyline points="134,44 130,62 136,62 126,82" fill="none" stroke="rgba(255,220,50,.55)" strokeWidth="1.3" strokeLinecap="round"
            style={{ animation:'lightning 1.6s ease-in-out .5s infinite', filter:'url(#lobeGlow)', pointerEvents:'none' }}/>
        </>
      )}

      {/* Fog overlay */}
      {activeSymptom === 'fog' && selectedRegions.length > 0 && (
        <>
          {[0,1,2].map(i => (
            <ellipse key={i} cx={80+i*22} cy={52+i*6} rx={18+i*4} ry={8+i*2}
              fill="rgba(180,190,220,.18)"
              style={{ animation:`fogDrift ${2.8+i*0.7}s ease-in-out ${i*0.8}s infinite`, pointerEvents:'none' }}/>
          ))}
        </>
      )}

      {/* Fatigue zzz */}
      {activeSymptom === 'fatigue' && selectedRegions.length > 0 && (
        <>
          {['💤','💤','💤'].map((z,i) => (
            <text key={i} x={85+i*18} y={55} fontSize={12}
              style={{ animation:`fatigueBob ${2+i*0.6}s ease-in-out ${i*0.7}s infinite`, pointerEvents:'none' }}>
              {z}
            </text>
          ))}
        </>
      )}

      {/* Confusion spin */}
      {activeSymptom === 'spin' && selectedRegions.length > 0 && (
        <g transform="translate(113,130)" style={{ pointerEvents:'none' }}>
          <circle r="72" fill="none" stroke="rgba(192,132,252,.18)" strokeWidth="1" strokeDasharray="8 5"
            style={{ animation:'slowSpin 5s linear infinite', transformOrigin:'0 0' }}/>
          <circle r="52" fill="none" stroke="rgba(201,168,76,.12)" strokeWidth="1" strokeDasharray="6 6"
            style={{ animation:'slowSpin 8s linear reverse infinite', transformOrigin:'0 0' }}/>
        </g>
      )}

      {/* Lobe labels — clean, anatomical style */}
      {BRAIN_LOBES.map(lobe => {
        const isActive = selectedRegions.includes(lobe.id);
        const hex = lobe.color.replace('#','');
        const r2 = parseInt(hex.slice(0,2),16);
        const g2 = parseInt(hex.slice(2,4),16);
        const b2 = parseInt(hex.slice(4,6),16);
        const lines = lobe.label.split(' / ');
        return (
          <g key={lobe.id+'_lbl'} style={{ pointerEvents:'none' }}>
            {lines.map((line, li) => (
              <text key={li}
                x={lobe.labelPos.x}
                y={lobe.labelPos.y + li * 11}
                textAnchor="middle"
                fontSize={isActive ? 8.5 : 7.5}
                fontWeight={isActive ? '700' : '500'}
                fill={isActive ? `rgba(${r2},${g2},${b2},1)` : `rgba(${r2},${g2},${b2},.7)`}
                fontFamily="'DM Sans',sans-serif"
                style={{ transition:'all .2s', letterSpacing:.2 }}>
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Outer brain border */}
      <path d="M34,60 C20,80 16,112 22,140 C28,168 44,190 68,204 C84,214 100,218 116,218 C132,218 150,214 164,204 C180,192 190,174 192,154 C196,132 188,110 178,94 C166,76 148,64 130,58 C114,52 96,48 80,48 C64,48 46,52 34,60 Z"
        fill="none" stroke="rgba(123,47,190,.35)" strokeWidth="1.5"/>
    </svg>
  );
}

export default function BrainSection({ data, upd }) {
  const brainLogs = data.brain || [];
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [activeSymptom, setActiveSymptom]     = useState('');
  const [notes, setNotes]                     = useState('');
  const [intensity, setIntensity]             = useState(5);
  const [saveMsg, setSaveMsg]                 = useState('');

  useEffect(() => {
    const todayLog = brainLogs.find(l => l.date === todayStr());
    if (todayLog) {
      setSelectedRegions(todayLog.regions || []);
      setActiveSymptom(todayLog.symptom || '');
      setIntensity(todayLog.intensity || 5);
      setNotes(todayLog.notes || '');
    }
  }, []);

  const toggleRegion = id => setSelectedRegions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const save = () => {
    if (!selectedRegions.length || !activeSymptom) {
      setSaveMsg('Please select at least one brain region and a symptom type.');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }
    const entry = {
      id: todayStr() + '-' + activeSymptom,
      date: todayStr(),
      regions: selectedRegions,
      regionLabels: selectedRegions.map(id => BRAIN_LOBES.find(r => r.id === id)?.label || id),
      symptom: activeSymptom,
      symptomLabel: BRAIN_SYMPTOMS.find(s => s.id === activeSymptom)?.label || activeSymptom,
      intensity,
      notes,
    };
    upd('brain', [...brainLogs.filter(l => l.date !== todayStr()), entry]);
    setSaveMsg('Saved ✓');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const MESSAGES = [
    'Your brain is doing remarkable work even on the hardest days.',
    'Tracking neurological symptoms is one of the most powerful forms of self-advocacy.',
    'Every data point you log helps your care team understand your experience.',
    'Rest is healing. Recovery is not failure.',
    'You know your brain better than anyone. Trust what you feel.',
  ];
  const quote = MESSAGES[new Date().getDate() % MESSAGES.length];

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', marginBottom:4 }}>🧠 The Brain</div>
          <div style={{ fontSize:13, color:'rgba(240,232,255,.4)' }}>Track neurological symptoms with real-time visual feedback</div>
        </div>
      </div>

      <div style={{ marginBottom:20, padding:'12px 18px', background:'rgba(123,47,190,.06)', border:'1px solid rgba(123,47,190,.11)', borderRadius:13, fontFamily:"'Cormorant Garamond',serif", fontSize:14, color:'rgba(192,132,252,.62)', fontStyle:'italic', lineHeight:1.7 }}>
        💜 {quote}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:22, alignItems:'start' }} className="two-col">
        {/* Brain diagram */}
        <div className="glass-card-static" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', minWidth:200 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.45)', letterSpacing:2, textTransform:'uppercase', marginBottom:12 }}>Select Regions</div>
          <BrainIllustration
            selectedRegions={selectedRegions}
            activeSymptom={BRAIN_SYMPTOMS.find(s => s.id === activeSymptom)?.anim || ''}
            onToggle={toggleRegion}
          />
          <button onClick={() => setSelectedRegions([])} style={{ marginTop:10, background:'transparent', border:'none', color:'rgba(240,232,255,.25)', fontSize:11, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            Clear selection
          </button>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Lobe chips */}
          <div className="glass-card-static" style={{ padding:18 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:'#C9A84C', marginBottom:12 }}>Brain Regions</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {BRAIN_LOBES.map(r => {
                const hex = r.color.replace('#','');
                const rv = parseInt(hex.slice(0,2),16);
                const gv = parseInt(hex.slice(2,4),16);
                const bv = parseInt(hex.slice(4,6),16);
                const isOn = selectedRegions.includes(r.id);
                return (
                  <button key={r.id} onClick={() => toggleRegion(r.id)}
                    style={{ padding:'6px 14px', borderRadius:20, fontSize:12, border:`1.5px solid ${isOn?r.color:'rgba(123,47,190,.2)'}`, background:isOn?`rgba(${rv},${gv},${bv},.18)`:'rgba(255,255,255,.03)', color:isOn?r.color:'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .15s' }}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Symptom type */}
          <div className="glass-card-static" style={{ padding:18 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:'#C9A84C', marginBottom:12 }}>Symptom Type</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }} className="two-col">
              {BRAIN_SYMPTOMS.map(s => (
                <button key={s.id} onClick={() => setActiveSymptom(activeSymptom === s.id ? '' : s.id)}
                  style={{ padding:'10px 14px', borderRadius:12, fontSize:12, border:`1.5px solid ${activeSymptom===s.id?'#C9A84C':'rgba(123,47,190,.2)'}`, background:activeSymptom===s.id?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)', color:activeSymptom===s.id?'#C9A84C':'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:8, transition:'all .15s' }}>
                  <span style={{ fontSize:15 }}>{s.icon}</span>
                  <span style={{ textAlign:'left', lineHeight:1.3 }}>{s.label}</span>
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
            <textarea className="field" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Duration, triggers, what helps or worsens it…" style={{ resize:'vertical', marginTop:6 }}/>
          </div>

          {saveMsg && (
            <div style={{ padding:'10px 16px', borderRadius:10, background:saveMsg.includes('✓')?'rgba(110,231,183,.1)':'rgba(255,80,80,.1)', border:`1px solid ${saveMsg.includes('✓')?'rgba(110,231,183,.25)':'rgba(255,80,80,.2)'}`, fontSize:13, color:saveMsg.includes('✓')?'#6ee7b7':'#ff8080' }}>
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
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {[...brainLogs].sort((a,b) => b.date.localeCompare(a.date)).slice(0,12).map(l => {
              const sym = BRAIN_SYMPTOMS.find(s => s.id === l.symptom);
              return (
                <div key={l.id} className="glass-card-static" style={{ padding:'13px 16px', display:'flex', gap:13, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, color:'#C9A84C', minWidth:76, flexShrink:0 }}>{fmtDate(l.date)}</div>
                  {sym && <span style={{ fontSize:13 }}>{sym.icon}</span>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#F0E8FF' }}>{l.symptomLabel}</div>
                    <div style={{ fontSize:11, color:'rgba(240,232,255,.35)' }}>{l.regionLabels?.join(', ')}</div>
                    {l.notes && <div style={{ fontSize:11, color:'rgba(240,232,255,.3)', marginTop:2, fontStyle:'italic' }}>{l.notes}</div>}
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
