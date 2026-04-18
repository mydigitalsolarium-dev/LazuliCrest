import { useState, useCallback, useEffect, useRef } from "react";
import { todayStr } from "../utils";

const PAIN_TYPES = [
  'Aching','Sharp','Burning','Throbbing','Stabbing',
  'Cramping','Stiffness','Tingling','Numbness','Pressure','Shooting','Tenderness'
];

// Human body surface regions — viewBox 200×510
const SURFACE_REGIONS = [
  // Head with ears (proper human head shape)
  { id:'head',           label:'Head',              cx:100, cy:50,
    d:'M100,10 C84,10 68,18 63,36 C59,50 60,60 55,63 C52,65 52,69 55,71 C58,73 61,70 63,68 C62,76 64,84 72,90 L80,94 L85,96 L115,96 L120,94 C128,88 138,78 137,68 C139,70 142,73 145,71 C148,69 148,65 145,63 C140,60 141,50 137,36 C132,18 116,10 100,10 Z' },
  { id:'neck',           label:'Neck',              cx:100, cy:107, d:'M85,96 L85,116 Q100,121 115,116 L115,96 Q100,93 85,96 Z' },
  { id:'left_shoulder',  label:'Left Shoulder',     cx:42,  cy:136, d:'M72,116 C60,116 48,119 38,127 C30,134 26,143 28,153 C30,161 38,165 48,163 L65,149 L72,131 Z' },
  { id:'right_shoulder', label:'Right Shoulder',    cx:158, cy:136, d:'M128,116 C140,116 152,119 162,127 C170,134 174,143 172,153 C170,161 162,165 152,163 L135,149 L128,131 Z' },
  { id:'chest',          label:'Chest',             cx:100, cy:145, d:'M72,116 Q100,111 128,116 L132,170 Q100,175 68,170 Z' },
  { id:'abdomen',        label:'Abdomen',           cx:100, cy:198, d:'M68,170 Q100,175 132,170 L134,220 Q100,226 66,220 Z' },
  { id:'left_hip',       label:'Left Hip',          cx:75,  cy:242, d:'M66,220 Q82,226 100,227 L100,272 L80,268 L66,265 Z' },
  { id:'right_hip',      label:'Right Hip',         cx:125, cy:242, d:'M100,227 Q118,226 134,220 L134,265 L120,268 L100,272 Z' },
  { id:'left_upper_arm', label:'Left Upper Arm',    cx:36,  cy:197, d:'M48,163 L28,166 L18,221 Q22,233 34,235 L50,211 L65,181 Z' },
  { id:'right_upper_arm',label:'Right Upper Arm',   cx:164, cy:197, d:'M152,163 L172,166 L182,221 Q178,233 166,235 L150,211 L135,181 Z' },
  { id:'left_forearm',   label:'Left Forearm',      cx:25,  cy:266, d:'M16,241 Q12,259 14,277 Q16,289 22,295 L34,293 Q38,281 36,263 Q36,253 38,239 Q28,249 16,241 Z' },
  { id:'right_forearm',  label:'Right Forearm',     cx:175, cy:266, d:'M184,241 Q188,259 186,277 Q184,289 178,295 L166,293 Q162,281 164,263 Q164,253 162,239 Q172,249 184,241 Z' },
  { id:'left_hand',      label:'Left Hand',         cx:22,  cy:318, d:'M10,295 Q6,309 8,321 Q10,333 18,339 Q26,343 34,339 Q40,331 40,319 L36,301 Q28,303 18,301 Q14,299 10,295 Z' },
  { id:'right_hand',     label:'Right Hand',        cx:178, cy:318, d:'M190,295 Q194,309 192,321 Q190,333 182,339 Q174,343 166,339 Q160,331 160,319 L164,301 Q172,303 182,301 Q186,299 190,295 Z' },
  { id:'left_thigh',     label:'Left Thigh',        cx:66,  cy:300, d:'M66,221 L80,249 Q84,269 82,301 Q80,319 78,337 L58,335 Q54,315 54,295 Q52,271 54,249 Z' },
  { id:'right_thigh',    label:'Right Thigh',       cx:134, cy:300, d:'M134,221 L120,249 Q116,269 118,301 Q120,319 122,337 L142,335 Q146,315 146,295 Q148,271 146,249 Z' },
  { id:'left_knee',      label:'Left Knee',         cx:62,  cy:355, d:'M56,335 Q50,345 50,357 Q52,367 60,371 Q68,373 74,367 Q78,357 76,345 L78,337 L58,335 Z' },
  { id:'right_knee',     label:'Right Knee',        cx:138, cy:355, d:'M144,335 Q150,345 150,357 Q148,367 140,371 Q132,373 126,367 Q122,357 124,345 L122,337 L142,335 Z' },
  { id:'left_shin',      label:'Left Shin',         cx:58,  cy:403, d:'M50,357 Q46,381 46,409 Q48,429 54,443 L68,441 Q72,425 72,405 Q72,383 70,367 Q64,371 60,371 Q54,367 50,357 Z' },
  { id:'right_shin',     label:'Right Shin',        cx:142, cy:403, d:'M150,357 Q154,381 154,409 Q152,429 146,443 L132,441 Q128,425 128,405 Q128,383 130,367 Q136,371 140,371 Q146,367 150,357 Z' },
  { id:'left_foot',      label:'Left Foot',         cx:57,  cy:472, d:'M44,451 Q38,461 36,473 Q36,483 40,489 Q46,495 56,495 Q68,493 76,485 Q80,477 78,467 L72,453 Q62,461 50,461 Q46,459 44,451 Z' },
  { id:'right_foot',     label:'Right Foot',        cx:143, cy:472, d:'M156,451 Q162,461 164,473 Q164,483 160,489 Q154,495 144,495 Q132,493 124,485 Q120,477 122,467 L128,453 Q138,461 150,461 Q154,459 156,451 Z' },
];

const HOTSPOT_CSS = `
  @keyframes bmPulse   { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes bmBloom   { 0%{opacity:0;filter:blur(4px)} 100%{opacity:1;filter:blur(0)} }
  @keyframes bmFlow    { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-30} }

  .bm-region { cursor:pointer; transition: all .3s; }
  .bm-region path {
    fill: rgba(255,255,255,.0);
    stroke: rgba(201,168,76,.0);
    stroke-width: 0;
    transition: fill .4s ease, stroke .4s ease, stroke-width .3s, filter .3s;
  }
  .bm-region:hover path {
    fill: rgba(42,92,173,.16);
    stroke: rgba(100,160,255,.6);
    stroke-width: 1.5;
    filter: drop-shadow(0 0 6px rgba(42,92,173,.5));
  }
  .bm-region.selected path {
    fill: rgba(42,92,173,.28);
    stroke: rgba(100,160,255,.9);
    stroke-width: 2;
    filter: drop-shadow(0 0 10px rgba(42,92,173,.7));
    animation: bmBloom .35s ease forwards;
  }
`;


function BodySilhouette({ painData, selectedIds, onTap }) {
  return (
    <div style={{ position:'relative', background:'rgba(2,4,14,.92)', borderRadius:12, border:'1px solid rgba(201,168,76,.2)', boxShadow:'0 0 40px rgba(42,92,173,.15), inset 0 0 30px rgba(0,0,0,.5)', lineHeight:0 }}>
      <svg viewBox="0 0 200 510" style={{ width:'100%', maxWidth:220, display:'block' }}>
        <defs>
          <filter id="bmglow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <linearGradient id="bm-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F0C855" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="bm-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4A90D9" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#2A5CAD" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <style>{HOTSPOT_CSS}</style>

        {/* Background */}
        <rect x="0" y="0" width="200" height="510" fill="rgba(0,0,0,.8)"/>

        {/* Body silhouette — full outline */}
        <path
          d="M100,5 C82,5 64,18 62,36 C58,58 66,78 80,88 L85,93 L88,98 Q80,100 74,106 Q58,112 44,122 Q28,134 20,148 L12,190 L6,246 L4,298 Q4,314 8,320 Q16,326 24,324 Q36,322 40,308 L44,260 L52,200 L62,158 L68,130 Q68,145 68,190 L68,228 L66,268 L60,286 L48,340 L42,400 L36,456 L34,492 Q34,504 40,508 L58,510 Q72,510 76,500 L78,462 L74,450 L68,392 L70,340 L78,282 Q84,272 100,270 Q116,272 122,282 L130,340 L132,392 L126,450 L122,462 L124,500 Q128,510 142,510 L160,508 Q166,504 166,492 L164,456 L158,400 L152,340 L134,286 L134,268 L132,228 L132,190 Q132,145 138,130 L144,158 L148,200 L156,260 L160,308 Q164,322 176,324 Q184,326 192,320 Q196,314 196,298 L194,246 L188,190 L180,148 Q172,134 156,122 Q142,112 126,106 Q120,100 112,98 L115,93 L120,88 C134,78 142,58 138,36 C136,18 118,5 100,5 Z"
          fill="rgba(14,20,38,.65)"
          stroke="rgba(201,168,76,.3)"
          strokeWidth="0.9"
        />

        {/* Subtle anatomy lines */}
        <line x1="100" y1="118" x2="100" y2="270" stroke="rgba(201,168,76,.14)" strokeWidth="0.6" strokeDasharray="3,4"/>
        <path d="M88,114 Q64,118 44,124" fill="none" stroke="rgba(201,168,76,.14)" strokeWidth="0.6"/>
        <path d="M112,114 Q136,118 156,124" fill="none" stroke="rgba(201,168,76,.14)" strokeWidth="0.6"/>
        <path d="M62,132 Q100,128 138,132 L136,186 Q100,191 64,186 Z" fill="none" stroke="rgba(201,168,76,.1)" strokeWidth="0.6" strokeDasharray="2,3"/>
        <path d="M64,222 Q100,228 136,222" fill="none" stroke="rgba(201,168,76,.12)" strokeWidth="0.6"/>

        {/* Clickable surface regions */}
        {SURFACE_REGIONS.map(r => {
          const logs = painData.filter(e => (e.regionId || e.id) === r.id);
          const isSel = selectedIds.includes(r.id);
          const cls = `bm-region${isSel ? ' selected' : ''}`;
          return (
            <g key={r.id} className={cls} onClick={e => { e.stopPropagation(); onTap(r); }}>
              <path d={r.d}/>
              <title>{r.label}{logs.length ? ` — ${logs.length} log${logs.length>1?'s':''}` : ''}</title>
            </g>
          );
        })}

        {/* Joint sparkle nodes */}
        {[
          {x:100,y:18,r:2.2},{x:38,y:130,r:2.8},{x:162,y:130,r:2.8},
          {x:20,y:238,r:2.2},{x:180,y:238,r:2.2},
          {x:66,y:224,r:2.5},{x:134,y:224,r:2.5},
          {x:62,y:353,r:2.5},{x:138,y:353,r:2.5},
          {x:57,y:448,r:2.0},{x:143,y:448,r:2.0},
        ].map((n,i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r}
            fill="rgba(201,168,76,.65)"
            opacity="0.7"
            style={{ animation:`bmPulse ${2.2+(i%3)*.7}s ${(i%4)*.3}s ease-in-out infinite` }}/>
        ))}

        {/* Blueprint corners */}
        {([[4,20,4,4,20,4],[180,4,196,4,196,20],[4,490,4,506,20,506],[180,506,196,506,196,490]]).map((p,i)=>(
          <polyline key={i} points={`${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}`} fill="none" stroke="rgba(201,168,76,.35)" strokeWidth="1.1" strokeLinecap="square"/>
        ))}
      </svg>
    </div>
  );
}

export default function BodyMap({ data, upd }) {
  const bodyMap = data.bodyMap || [];
  const [selectedIds, setSelectedIds] = useState([]);
  const [editOpen,    setEditOpen]    = useState(false);
  const [form,        setForm]        = useState({ severity:5, types:[], notes:'' });
  const [saveMsg,     setSaveMsg]     = useState('');

  const draftTimer = useRef(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lazuli_bodymap_draft');
      if (raw) {
        const d = JSON.parse(raw);
        if (d.selectedIds?.length || d.form?.notes) {
          if (d.selectedIds?.length) { setSelectedIds(d.selectedIds); setEditOpen(true); }
          if (d.form) setForm(d.form);
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 4000);
        }
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft
  useEffect(() => {
    if (!selectedIds.length && !form.notes && !form.types?.length) return;
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      try { localStorage.setItem('lazuli_bodymap_draft', JSON.stringify({ selectedIds, form, savedAt: Date.now() })); } catch {}
    }, 800);
    return () => clearTimeout(draftTimer.current);
  }, [selectedIds, form]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTap = useCallback((region) => {
    setSelectedIds(prev =>
      prev.includes(region.id) ? prev.filter(x => x !== region.id) : [...prev, region.id]
    );
    setEditOpen(true);
  }, []);

  const toggleType = t => setForm(f => ({
    ...f, types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t]
  }));

  const save = () => {
    if (!selectedIds.length) return;
    const timestamp = Date.now();
    const entries = selectedIds.map(id => ({
      id: `${id}-${timestamp}`,
      regionId: id,
      label: SURFACE_REGIONS.find(r => r.id === id)?.label || id,
      severity: form.severity, types: form.types, notes: form.notes,
      date: todayStr(), timestamp,
    }));
    upd('bodyMap', [...bodyMap, ...entries]);
    try { localStorage.removeItem('lazuli_bodymap_draft'); } catch {}
    setEditOpen(false);
    setSelectedIds([]);
    setForm({ severity:5, types:[], notes:'' });
    setSaveMsg('Logged ✓');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setEditOpen(false);
    setForm({ severity:5, types:[], notes:'' });
    try { localStorage.removeItem('lazuli_bodymap_draft'); } catch {}
  };

  // Aggregate pain data per region for display
  const painData = bodyMap;

  // History grouped by date
  const byDate = [...bodyMap].reverse().reduce((acc, e) => {
    const k = e.date || todayStr();
    if (!acc[k]) acc[k] = [];
    acc[k].push(e);
    return acc;
  }, {});

  const selectedLabels = selectedIds.map(id => SURFACE_REGIONS.find(r => r.id === id)?.label || id);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:22, fontWeight:700, color:'#C9A84C', marginBottom:4, letterSpacing:.5 }}>◎ Body Map</div>
        <div style={{ fontSize:13, color:'rgba(74,144,217,.55)', fontFamily:"'DM Sans',sans-serif" }}>
          Tap any region to mark pain or discomfort — select multiple areas at once
        </div>
      </div>

      {saveMsg && (
        <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(110,231,183,.1)', border:'1px solid rgba(110,231,183,.3)', color:'#6ee7b7', fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif", marginBottom:14 }}>
          {saveMsg}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:20, alignItems:'start' }} className="two-col">

        {/* ── Left: body silhouette ── */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <BodySilhouette
            painData={painData}
            selectedIds={selectedIds}
            onTap={handleTap}
          />
          {selectedIds.length > 0 && (
            <button onClick={clearSelection} style={{ fontSize:12, color:'rgba(168,196,240,.4)', background:'transparent', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", padding:'4px 8px' }}>
              Clear selection
            </button>
          )}
        </div>

        {/* ── Right: log panel ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Selected regions */}
          {selectedIds.length > 0 && (
            <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(42,92,173,.08)', border:'1px solid rgba(42,92,173,.25)' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(201,168,76,.6)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:8, fontFamily:"'DM Sans',sans-serif" }}>Selected Areas</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {selectedLabels.map((label, i) => (
                  <span key={i} style={{ padding:'4px 10px', borderRadius:20, background:'rgba(42,92,173,.18)', border:'1px solid rgba(100,160,255,.4)', color:'rgba(168,196,240,.9)', fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Log panel — shows when regions selected */}
          {editOpen && selectedIds.length > 0 && (
            <div style={{ padding:'18px', borderRadius:14, background:'rgba(4,8,28,.85)', border:'1px solid rgba(201,168,76,.25)', display:'flex', flexDirection:'column', gap:14 }}>

              {draftRestored && (
                <div style={{ padding:'8px 14px', borderRadius:10, background:'rgba(201,168,76,.12)', border:'1px solid rgba(201,168,76,.35)', color:'#C9A84C', fontSize:13, fontWeight:600, fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', gap:8 }}>
                  <span>✦</span> Draft restored — your unsaved entry has been recovered
                </div>
              )}

              {/* Pain intensity */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'rgba(201,168,76,.7)', letterSpacing:1, textTransform:'uppercase', marginBottom:8, fontFamily:"'DM Sans',sans-serif" }}>
                  Pain Intensity — {form.severity}/10
                </div>
                <input type="range" min="1" max="10" value={form.severity}
                  onChange={e => setForm(f => ({...f, severity:+e.target.value}))}
                  style={{ width:'100%', accentColor:'#C9A84C' }}
                />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(168,196,240,.35)', fontFamily:"'DM Sans',sans-serif", marginTop:2 }}>
                  <span>Mild</span><span>Moderate</span><span>Severe</span>
                </div>
              </div>

              {/* Symptom types */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'rgba(201,168,76,.7)', letterSpacing:1, textTransform:'uppercase', marginBottom:8, fontFamily:"'DM Sans',sans-serif" }}>
                  Symptom Type
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {PAIN_TYPES.map(t => (
                    <button key={t} onClick={() => toggleType(t)} style={{
                      padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                      fontFamily:"'DM Sans',sans-serif", transition:'all .15s',
                      border: form.types.includes(t) ? '1.5px solid rgba(201,168,76,.7)' : '1px solid rgba(42,92,173,.3)',
                      background: form.types.includes(t) ? 'rgba(201,168,76,.15)' : 'rgba(42,92,173,.06)',
                      color: form.types.includes(t) ? '#C9A84C' : 'rgba(168,196,240,.55)',
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'rgba(201,168,76,.7)', letterSpacing:1, textTransform:'uppercase', marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>Notes</div>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))}
                  placeholder="Describe the pain, what triggered it, how long it's lasted…"
                  rows={3}
                  style={{ width:'100%', background:'rgba(4,8,28,.8)', border:'1px solid rgba(42,92,173,.25)', borderRadius:10, color:'rgba(240,232,255,.85)', padding:'10px 12px', fontSize:14, fontFamily:"'DM Sans',sans-serif", resize:'vertical', boxSizing:'border-box' }}
                />
              </div>

              <button onClick={save} className="btn btn-gold" style={{ alignSelf:'flex-start', padding:'10px 24px', fontSize:14 }}>
                Log {selectedIds.length} Area{selectedIds.length > 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* History */}
          {Object.keys(byDate).length > 0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'rgba(201,168,76,.5)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:10, fontFamily:"'DM Sans',sans-serif" }}>
                Pain Log History
              </div>
              {Object.entries(byDate).slice(0, 7).map(([date, entries]) => (
                <div key={date} style={{ marginBottom:12, padding:'12px 14px', borderRadius:12, background:'rgba(4,8,28,.7)', border:'1px solid rgba(42,92,173,.18)' }}>
                  <div style={{ fontSize:11, color:'rgba(201,168,76,.6)', fontWeight:700, marginBottom:6, fontFamily:"'DM Sans',sans-serif" }}>{date}</div>
                  {entries.map(e => (
                    <div key={e.id} style={{ display:'flex', alignItems:'flex-start', gap:8, paddingBottom:6, marginBottom:6, borderBottom:'1px solid rgba(42,92,173,.1)' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background: e.severity>=7 ? '#ef4444' : e.severity>=4 ? '#C9A84C' : '#6ee7b7', flexShrink:0, marginTop:5 }}/>
                      <div style={{ flex:1 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'rgba(240,232,255,.8)', fontFamily:"'DM Sans',sans-serif" }}>{e.label}</span>
                        {e.types?.length > 0 && <span style={{ fontSize:12, color:'rgba(168,196,240,.5)', marginLeft:6 }}>· {e.types.join(', ')}</span>}
                        <span style={{ fontSize:12, color: e.severity>=7?'#ef4444':e.severity>=4?'#C9A84C':'#6ee7b7', marginLeft:6, fontWeight:700 }}>{e.severity}/10</span>
                        {e.notes && <div style={{ fontSize:12, color:'rgba(168,196,240,.45)', marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>{e.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!editOpen && !selectedIds.length && bodyMap.length === 0 && (
            <div style={{ padding:'30px', textAlign:'center', color:'rgba(168,196,240,.3)', fontSize:14, fontFamily:"'DM Sans',sans-serif" }}>
              Tap any region on the body map to start logging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
