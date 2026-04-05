import { useState, useCallback } from "react";
import { todayStr, fmtDate } from "../utils";

const PAIN_TYPES = [
  'Aching','Sharp','Burning','Throbbing','Stabbing',
  'Cramping','Stiffness','Tingling','Numbness','Pressure','Shooting','Tenderness'
];

// Multi-select body groups — allow logging same pain across related parts
const PART_GROUPS = {
  'Both Hands':     ['Left Hand','Right Hand'],
  'Both Feet':      ['Left Foot','Right Foot'],
  'Both Knees':     ['Left Knee','Right Knee'],
  'Both Shoulders': ['Left Shoulder','Right Shoulder'],
  'Both Hips':      ['Left Hip','Right Hip'],
  'Both Ankles':    ['Left Ankle','Right Ankle'],
  'Both Elbows':    ['Left Elbow','Right Elbow'],
  'Both Wrists':    ['Left Wrist','Right Wrist'],
};

// Human figure drawn with proper anatomical curves using SVG paths
// Based on a standing neutral-pose medical chart outline
const FRONT_REGIONS = [
  {
    id: 'head',
    label: 'Head',
    // Round head with slight chin
    d: 'M100,10 C78,10 60,28 60,50 C60,68 70,82 85,88 L85,95 L115,95 L115,88 C130,82 140,68 140,50 C140,28 122,10 100,10 Z',
  },
  {
    id: 'neck',
    label: 'Neck',
    d: 'M85,95 L85,115 Q100,120 115,115 L115,95 Q100,92 85,95 Z',
  },
  {
    id: 'left_shoulder',
    label: 'Left Shoulder',
    d: 'M72,115 C60,115 48,118 38,126 C30,133 26,142 28,152 C30,160 38,164 48,162 L65,148 L72,130 Z',
  },
  {
    id: 'right_shoulder',
    label: 'Right Shoulder',
    d: 'M128,115 C140,115 152,118 162,126 C170,133 174,142 172,152 C170,160 162,164 152,162 L135,148 L128,130 Z',
  },
  {
    id: 'chest',
    label: 'Chest',
    d: 'M72,115 Q100,110 128,115 L132,170 Q100,175 68,170 Z',
  },
  {
    id: 'abdomen',
    label: 'Abdomen',
    d: 'M68,170 Q100,175 132,170 L134,220 Q100,226 66,220 Z',
  },
  {
    id: 'left_hip',
    label: 'Left Hip',
    d: 'M66,220 Q100,226 134,220 L132,245 Q115,250 100,250 L80,248 Z',
  },
  {
    id: 'right_hip',
    label: 'Right Hip',
    d: 'M100,250 Q115,250 132,245 L128,265 Q114,270 100,268 Z',
  },
  {
    id: 'groin',
    label: 'Groin / Pelvis',
    d: 'M80,248 Q100,255 120,248 L116,268 Q100,274 84,268 Z',
  },
  {
    id: 'left_upper_arm',
    label: 'Left Upper Arm',
    d: 'M48,162 L28,165 L18,220 Q22,232 34,234 L50,210 L65,180 Z',
  },
  {
    id: 'right_upper_arm',
    label: 'Right Upper Arm',
    d: 'M152,162 L172,165 L182,220 Q178,232 166,234 L150,210 L135,180 Z',
  },
  {
    id: 'left_elbow',
    label: 'Left Elbow',
    d: 'M18,220 Q15,230 16,240 Q20,248 28,248 Q36,246 38,238 L34,234 Q22,232 18,220 Z',
  },
  {
    id: 'right_elbow',
    label: 'Right Elbow',
    d: 'M182,220 Q185,230 184,240 Q180,248 172,248 Q164,246 162,238 L166,234 Q178,232 182,220 Z',
  },
  {
    id: 'left_forearm',
    label: 'Left Forearm',
    d: 'M16,240 Q12,258 14,276 Q16,288 22,294 L34,292 Q38,280 36,262 Q36,252 38,238 Q28,248 16,240 Z',
  },
  {
    id: 'right_forearm',
    label: 'Right Forearm',
    d: 'M184,240 Q188,258 186,276 Q184,288 178,294 L166,292 Q162,280 164,262 Q164,252 162,238 Q172,248 184,240 Z',
  },
  {
    id: 'left_wrist',
    label: 'Left Wrist',
    d: 'M14,276 Q12,286 14,294 Q18,300 26,300 Q34,298 36,292 Q38,280 36,276 Q24,280 14,276 Z',
  },
  {
    id: 'right_wrist',
    label: 'Right Wrist',
    d: 'M186,276 Q188,286 186,294 Q182,300 174,300 Q166,298 164,292 Q162,280 164,276 Q176,280 186,276 Z',
  },
  {
    id: 'left_hand',
    label: 'Left Hand',
    d: 'M10,294 Q6,308 8,320 Q10,332 18,338 Q26,342 34,338 Q40,330 40,318 L36,300 Q28,302 18,300 Q14,298 10,294 Z',
  },
  {
    id: 'right_hand',
    label: 'Right Hand',
    d: 'M190,294 Q194,308 192,320 Q190,332 182,338 Q174,342 166,338 Q160,330 160,318 L164,300 Q172,302 182,300 Q186,298 190,294 Z',
  },
  {
    id: 'left_thigh',
    label: 'Left Thigh',
    d: 'M66,220 L80,248 Q84,268 82,300 Q80,318 78,336 L58,334 Q54,314 54,294 Q52,270 54,248 Z',
  },
  {
    id: 'right_thigh',
    label: 'Right Thigh',
    d: 'M134,220 L120,248 Q116,268 118,300 Q120,318 122,336 L142,334 Q146,314 146,294 Q148,270 146,248 Z',
  },
  {
    id: 'left_knee',
    label: 'Left Knee',
    d: 'M56,334 Q50,344 50,356 Q52,366 60,370 Q68,372 74,366 Q78,356 76,344 L78,336 L58,334 Z',
  },
  {
    id: 'right_knee',
    label: 'Right Knee',
    d: 'M144,334 Q150,344 150,356 Q148,366 140,370 Q132,372 126,366 Q122,356 124,344 L122,336 L142,334 Z',
  },
  {
    id: 'left_shin',
    label: 'Left Shin / Calf',
    d: 'M50,356 Q46,372 46,392 Q46,412 50,430 Q54,442 60,446 L68,444 Q72,432 72,414 Q72,394 70,372 Q68,360 74,366 Q68,372 74,366 Q66,366 60,370 Q56,362 50,356 Z',
  },
  {
    id: 'right_shin',
    label: 'Right Shin / Calf',
    d: 'M150,356 Q154,372 154,392 Q154,412 150,430 Q146,442 140,446 L132,444 Q128,432 128,414 Q128,394 130,372 Q132,360 126,366 Q134,372 140,370 Q144,362 150,356 Z',
  },
  {
    id: 'left_ankle',
    label: 'Left Ankle',
    d: 'M48,430 Q44,440 46,450 Q50,458 60,460 Q70,458 72,450 Q74,442 70,432 L60,446 Z',
  },
  {
    id: 'right_ankle',
    label: 'Right Ankle',
    d: 'M152,430 Q156,440 154,450 Q150,458 140,460 Q130,458 128,450 Q126,442 130,432 L140,446 Z',
  },
  {
    id: 'left_foot',
    label: 'Left Foot',
    d: 'M44,450 Q38,460 36,472 Q36,482 40,488 Q46,494 56,494 Q68,492 76,484 Q80,476 78,466 L72,452 Q62,460 50,460 Q46,458 44,450 Z',
  },
  {
    id: 'right_foot',
    label: 'Right Foot',
    d: 'M156,450 Q162,460 164,472 Q164,482 160,488 Q154,494 144,494 Q132,492 124,484 Q120,476 122,466 L128,452 Q138,460 150,460 Q154,458 156,450 Z',
  },
];

const BACK_REGIONS = [
  { id:'back_head', label:'Back of Head', d:'M100,10 C78,10 60,28 60,50 C60,68 70,82 85,88 L85,95 L115,95 L115,88 C130,82 140,68 140,50 C140,28 122,10 100,10 Z' },
  { id:'back_neck', label:'Back of Neck', d:'M85,95 L85,115 Q100,120 115,115 L115,95 Q100,92 85,95 Z' },
  { id:'upper_back', label:'Upper Back', d:'M72,115 Q100,110 128,115 L132,165 Q100,170 68,165 Z' },
  { id:'mid_back', label:'Mid Back', d:'M68,165 Q100,170 132,165 L133,208 Q100,214 67,208 Z' },
  { id:'lower_back', label:'Lower Back', d:'M67,208 Q100,214 133,208 L130,244 Q100,250 70,244 Z' },
  { id:'tailbone', label:'Tailbone / Sacrum', d:'M70,244 Q100,250 130,244 L126,268 Q100,274 74,268 Z' },
  { id:'back_left_shoulder', label:'Left Shoulder (back)', d:'M72,115 C60,115 48,118 38,126 C30,133 26,142 28,152 C30,160 38,164 48,162 L65,148 L72,130 Z' },
  { id:'back_right_shoulder', label:'Right Shoulder (back)', d:'M128,115 C140,115 152,118 162,126 C170,133 174,142 172,152 C170,160 162,164 152,162 L135,148 L128,130 Z' },
  { id:'left_lat', label:'Left Lat / Side', d:'M48,162 L28,165 L18,220 Q22,232 34,234 L50,210 L65,180 Z' },
  { id:'right_lat', label:'Right Lat / Side', d:'M152,162 L172,165 L182,220 Q178,232 166,234 L150,210 L135,180 Z' },
  { id:'back_left_elbow', label:'Left Elbow (back)', d:'M18,220 Q15,230 16,240 Q20,248 28,248 Q36,246 38,238 L34,234 Q22,232 18,220 Z' },
  { id:'back_right_elbow', label:'Right Elbow (back)', d:'M182,220 Q185,230 184,240 Q180,248 172,248 Q164,246 162,238 L166,234 Q178,232 182,220 Z' },
  { id:'back_left_forearm', label:'Left Forearm (back)', d:'M16,240 Q12,258 14,276 Q16,288 22,294 L34,292 Q38,280 36,262 Q36,252 38,238 Q28,248 16,240 Z' },
  { id:'back_right_forearm', label:'Right Forearm (back)', d:'M184,240 Q188,258 186,276 Q184,288 178,294 L166,292 Q162,280 164,262 Q164,252 162,238 Q172,248 184,240 Z' },
  { id:'back_left_hand', label:'Left Hand (back)', d:'M10,294 Q6,308 8,320 Q10,332 18,338 Q26,342 34,338 Q40,330 40,318 L36,300 Q28,302 18,300 Q14,298 10,294 Z' },
  { id:'back_right_hand', label:'Right Hand (back)', d:'M190,294 Q194,308 192,320 Q190,332 182,338 Q174,342 166,338 Q160,330 160,318 L164,300 Q172,302 182,300 Q186,298 190,294 Z' },
  { id:'left_hamstring', label:'Left Hamstring', d:'M66,220 L80,248 Q84,268 82,300 Q80,318 78,336 L58,334 Q54,314 54,294 Q52,270 54,248 Z' },
  { id:'right_hamstring', label:'Right Hamstring', d:'M134,220 L120,248 Q116,268 118,300 Q120,318 122,336 L142,334 Q146,314 146,294 Q148,270 146,248 Z' },
  { id:'back_left_knee', label:'Left Knee (back)', d:'M56,334 Q50,344 50,356 Q52,366 60,370 Q68,372 74,366 Q78,356 76,344 L78,336 L58,334 Z' },
  { id:'back_right_knee', label:'Right Knee (back)', d:'M144,334 Q150,344 150,356 Q148,366 140,370 Q132,372 126,366 Q122,356 124,344 L122,336 L142,334 Z' },
  { id:'left_calf', label:'Left Calf', d:'M50,356 Q46,372 46,392 Q46,412 50,430 Q54,442 60,446 L68,444 Q72,432 72,414 Q72,394 70,372 Q68,360 74,366 Q66,366 60,370 Q56,362 50,356 Z' },
  { id:'right_calf', label:'Right Calf', d:'M150,356 Q154,372 154,392 Q154,412 150,430 Q146,442 140,446 L132,444 Q128,432 128,414 Q128,394 130,372 Q132,360 126,366 Q134,372 140,370 Q144,362 150,356 Z' },
  { id:'left_achilles', label:'Left Achilles / Ankle', d:'M48,430 Q44,440 46,450 Q50,458 60,460 Q70,458 72,450 Q74,442 70,432 L60,446 Z' },
  { id:'right_achilles', label:'Right Achilles / Ankle', d:'M152,430 Q156,440 154,450 Q150,458 140,460 Q130,458 128,450 Q126,442 130,432 L140,446 Z' },
  { id:'left_heel', label:'Left Heel', d:'M44,450 Q38,460 36,472 Q36,482 40,488 Q46,494 56,494 Q68,492 76,484 Q80,476 78,466 L72,452 Q62,460 50,460 Q46,458 44,450 Z' },
  { id:'right_heel', label:'Right Heel', d:'M156,450 Q162,460 164,472 Q164,482 160,488 Q154,494 144,494 Q132,492 124,484 Q120,476 122,466 L128,452 Q138,460 150,460 Q154,458 156,450 Z' },
];

const REGION_STYLE = `
  .bm-region { cursor:pointer; transition:all .18s ease; }
  .bm-region path { fill:rgba(123,47,190,.1); stroke:rgba(123,47,190,.3); stroke-width:1; transition:all .18s ease; }
  .bm-region:hover path { fill:rgba(201,168,76,.18); stroke:#C9A84C; stroke-width:1.5; }
  .bm-region.selected path { fill:rgba(201,168,76,.3); stroke:#E8C96B; stroke-width:2; filter:drop-shadow(0 0 4px rgba(201,168,76,.4)); }
  .bm-region.has-mild path { fill:rgba(248,113,113,.25); stroke:#f87171; stroke-width:1.5; }
  .bm-region.has-severe path { fill:rgba(239,68,68,.4); stroke:#dc2626; stroke-width:2; filter:drop-shadow(0 0 5px rgba(239,68,68,.45)); }
`;

function HumanFigure({ regions, painData, selectedIds, onTap, view }) {
  const allRegions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;
  return (
    <svg viewBox="0 0 200 510" style={{ width:'100%', maxWidth:200 }}>
      <style>{REGION_STYLE}</style>
      {allRegions.map(r => {
        const pain = painData[r.id];
        const isSelected = selectedIds.includes(r.id);
        let cls = 'bm-region';
        if (isSelected) cls += ' selected';
        else if (pain) cls += pain.severity >= 7 ? ' has-severe' : ' has-mild';
        return (
          <g key={r.id} className={cls} onClick={() => onTap(r)}>
            <path d={r.d}/>
          </g>
        );
      })}
    </svg>
  );
}

export default function BodyMap({ data, upd }) {
  const bodyMap = data.bodyMap || [];
  const [view, setView] = useState('front');
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm] = useState({ severity:5, types:[], notes:'' });
  const [editOpen, setEditOpen] = useState(false);
  const [multiLabel, setMultiLabel] = useState('');

  const getEntry = id => bodyMap.find(e => e.id === id);

  const handleTap = useCallback((region) => {
    setSelectedIds(prev => {
      if (prev.includes(region.id)) return prev.filter(x => x !== region.id);
      return [...prev, region.id];
    });
  }, []);

  const openEdit = () => {
    if (!selectedIds.length) return;
    const first = getEntry(selectedIds[0]);
    setForm(first ? { severity: first.severity, types: first.types||[], notes: first.notes||'' } : { severity:5, types:[], notes:'' });
    setMultiLabel(selectedIds.length > 1 ? `${selectedIds.length} areas selected` : (view === 'front' ? FRONT_REGIONS : BACK_REGIONS).find(r => r.id === selectedIds[0])?.label || selectedIds[0]);
    setEditOpen(true);
  };

  const save = () => {
    const allRegions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;
    const entries = selectedIds.map(id => ({
      id,
      label: allRegions.find(r => r.id === id)?.label || id,
      severity: form.severity,
      types: form.types,
      notes: form.notes,
      date: todayStr(),
    }));
    const newMap = [...bodyMap.filter(e => !selectedIds.includes(e.id)), ...entries];
    upd('bodyMap', newMap);
    setEditOpen(false);
    setSelectedIds([]);
  };

  const clearSelected = () => {
    upd('bodyMap', bodyMap.filter(e => !selectedIds.includes(e.id)));
    setEditOpen(false);
    setSelectedIds([]);
  };

  const toggleType = t => setForm(f => ({
    ...f, types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t]
  }));

  const applyGroup = (groupName) => {
    const ids = PART_GROUPS[groupName];
    setSelectedIds(ids.filter(label => {
      const allR = [...FRONT_REGIONS, ...BACK_REGIONS];
      return allR.some(r => r.label === label || r.id === label);
    }));
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', marginBottom:4 }}>◎ Body Map</div>
          <div style={{ fontSize:14, color:'rgba(240,232,255,.4)' }}>Tap one or multiple areas — then log your pain together</div>
        </div>
        {selectedIds.length > 0 && (
          <button className="btn btn-gold" onClick={openEdit}>
            Log {selectedIds.length} area{selectedIds.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Quick multi-select shortcuts */}
      <div style={{ marginBottom:16, display:'flex', flexWrap:'wrap', gap:7 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.5)', letterSpacing:1.5, textTransform:'uppercase', width:'100%', marginBottom:4 }}>Quick select:</div>
        {Object.keys(PART_GROUPS).map(g => (
          <button key={g} onClick={() => applyGroup(g)} style={{ padding:'4px 12px', borderRadius:20, fontSize:11, border:'1px solid rgba(123,47,190,.25)', background:'rgba(255,255,255,.03)', color:'rgba(240,232,255,.45)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .14s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.color='#C9A84C'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(123,47,190,.25)'; e.currentTarget.style.color='rgba(240,232,255,.45)'; }}>
            {g}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }} className="two-col">
        {/* Figure */}
        <div className="glass-card-static" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center' }}>
          {/* Front/Back toggle */}
          <div style={{ display:'flex', gap:0, background:'rgba(255,255,255,.05)', borderRadius:10, padding:3, marginBottom:16, width:'fit-content' }}>
            {['front','back'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding:'6px 20px', borderRadius:8, fontSize:12, fontWeight:600, border:'none', background: view===v ? 'linear-gradient(135deg,#C9A84C,#E8C96B)' : 'transparent', color: view===v ? '#000' : 'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textTransform:'capitalize' }}>
                {v}
              </button>
            ))}
          </div>

          <HumanFigure
            regions={view === 'front' ? FRONT_REGIONS : BACK_REGIONS}
            painData={Object.fromEntries(bodyMap.map(e => [e.id, e]))}
            selectedIds={selectedIds}
            onTap={handleTap}
            view={view}
          />

          <div style={{ marginTop:14, fontSize:11, color:'rgba(240,232,255,.25)', textAlign:'center' }}>
            Tap to select · tap again to deselect · select multiple
          </div>
          <div style={{ display:'flex', gap:12, marginTop:10, flexWrap:'wrap', justifyContent:'center' }}>
            {[
              { label:'No pain', style:{ background:'rgba(123,47,190,.15)', border:'1px solid rgba(123,47,190,.4)' } },
              { label:'Mild', style:{ background:'rgba(248,113,113,.25)', border:'1px solid #f87171' } },
              { label:'Severe', style:{ background:'rgba(239,68,68,.4)', border:'2px solid #dc2626', boxShadow:'0 0 4px rgba(239,68,68,.4)' } },
            ].map(l => (
              <span key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'rgba(240,232,255,.35)' }}>
                <span style={{ width:10, height:10, borderRadius:2, ...l.style, display:'inline-block' }}/>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {editOpen && (
            <div className="glass-card-static" style={{ padding:22, border:'1px solid rgba(201,168,76,.2)', animation:'popIn .2s ease' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:14 }}>{multiLabel}</div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <label style={{ margin:0 }}>Pain severity</label>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:700, color:'#f87171' }}>{form.severity}/10</span>
              </div>
              <input type="range" min={1} max={10} value={form.severity} onChange={e => setForm(f => ({...f, severity:+e.target.value}))} style={{ width:'100%', accentColor:'#C9A84C', marginBottom:14 }}/>
              <div style={{ marginBottom:14 }}>
                <label>Pain type</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                  {PAIN_TYPES.map(t => (
                    <button key={t} onClick={() => toggleType(t)} style={{ padding:'4px 11px', borderRadius:20, fontSize:11, border:`1px solid ${form.types.includes(t)?'#C9A84C':'rgba(123,47,190,.25)'}`, background:form.types.includes(t)?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)', color:form.types.includes(t)?'#C9A84C':'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .14s' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label>Notes</label>
                <textarea className="field" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} placeholder="Describe the sensation…" style={{ resize:'vertical' }}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {bodyMap.some(e => selectedIds.includes(e.id)) && (
                  <button className="btn btn-danger" style={{ fontSize:12, padding:'8px 14px' }} onClick={clearSelected}>Clear</button>
                )}
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => { setEditOpen(false); setSelectedIds([]); }}>Cancel</button>
                <button className="btn btn-gold" style={{ fontSize:12, flex:1, justifyContent:'center' }} onClick={save}>Save</button>
              </div>
            </div>
          )}

          <div className="glass-card-static" style={{ padding:20 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:'#C9A84C', marginBottom:12 }}>Logged Pain</div>
            {bodyMap.length === 0
              ? <div style={{ fontSize:12, color:'rgba(240,232,255,.25)', fontStyle:'italic', lineHeight:1.7 }}>No pain logged yet.<br/>Tap a region on the figure to get started.</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[...bodyMap].sort((a,b) => b.severity - a.severity).map(e => {
                    const c = e.severity >= 7 ? '#ef4444' : '#f87171';
                    const bg = e.severity >= 7 ? 'rgba(239,68,68,.2)' : 'rgba(248,113,113,.12)';
                    return (
                      <div key={e.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 13px', background:'rgba(255,255,255,.03)', borderRadius:11, border:'1px solid rgba(123,47,190,.1)', cursor:'pointer' }}
                        onClick={() => { setSelectedIds([e.id]); const allR = view === 'front' ? FRONT_REGIONS : BACK_REGIONS; const r = allR.find(x => x.id === e.id); if (r) { setForm({ severity:e.severity, types:e.types||[], notes:e.notes||'' }); setMultiLabel(e.label); setEditOpen(true); } }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:bg, border:`2px solid ${c}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Cormorant Garamond',serif", fontSize:14, fontWeight:700, color:c, flexShrink:0 }}>{e.severity}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#F0E8FF' }}>{e.label}</div>
                          {e.types?.length > 0 && <div style={{ fontSize:11, color:'rgba(240,232,255,.35)' }}>{e.types.join(' · ')}</div>}
                        </div>
                        <span style={{ fontSize:16, color:'rgba(240,232,255,.2)' }}>›</span>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
