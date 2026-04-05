import { useState, useCallback } from "react";
import { todayStr } from "../utils";

const PAIN_TYPES = ['Aching','Sharp','Burning','Throbbing','Stabbing','Cramping','Stiffness','Tingling','Numbness','Pressure','Shooting','Tenderness'];

const PART_GROUPS = {
  'Both Hands':     ['Left Hand','Right Hand'],
  'Both Feet':      ['Left Foot','Right Foot'],
  'Both Knees':     ['Left Knee','Right Knee'],
  'Both Shoulders': ['Left Shoulder','Right Shoulder'],
  'Both Hips':      ['Left Hip','Right Hip'],
  'Both Ankles':    ['Left Ankle','Right Ankle'],
  'Both Elbows':    ['Left Elbow','Right Elbow'],
  'Both Wrists':    ['Left Wrist','Right Wrist'],
  'Full Back':      ['Upper Back','Mid Back','Lower Back'],
};

// ── Front muscle regions — muscular anatomy style ─────────────
// Each region is a labelled muscle group matching the reference illustration
const FRONT_MUSCLES = [
  // Head
  { id:'head',            label:'Head',               d:'M120,8 C100,6 83,18 82,36 C81,50 88,62 100,68 C106,71 114,73 120,73 C126,73 134,71 140,68 C152,62 159,50 158,36 C157,18 140,6 120,8 Z' },
  // Neck / Sternocleidomastoid
  { id:'neck',            label:'Neck',               d:'M108,73 L108,92 Q120,96 132,92 L132,73 Q126,76 120,76 Q114,76 108,73 Z' },
  // Deltoids
  { id:'l_deltoid',       label:'Left Deltoid',       d:'M87,92 C75,90 61,96 54,108 C49,118 50,130 57,136 C63,141 73,140 80,134 L88,118 L88,95 Z' },
  { id:'r_deltoid',       label:'Right Deltoid',      d:'M153,92 C165,90 179,96 186,108 C191,118 190,130 183,136 C177,141 167,140 160,134 L152,118 L152,95 Z' },
  // Pectorals
  { id:'l_pec',           label:'Left Pectoral',      d:'M108,92 L88,95 L80,134 L96,140 Q108,136 114,128 L114,92 Z' },
  { id:'r_pec',           label:'Right Pectoral',     d:'M132,92 L152,95 L160,134 L144,140 Q132,136 126,128 L126,92 Z' },
  // Serratus / Obliques
  { id:'l_oblique',       label:'Left Oblique',       d:'M96,140 L80,134 L76,168 L86,176 Q98,172 104,162 L108,148 Z' },
  { id:'r_oblique',       label:'Right Oblique',      d:'M144,140 L160,134 L164,168 L154,176 Q142,172 136,162 L132,148 Z' },
  // Abs
  { id:'upper_abs',       label:'Upper Abs',          d:'M108,128 L114,128 Q120,130 126,128 L132,128 L132,148 Q124,152 116,152 L108,148 Z' },
  { id:'lower_abs',       label:'Lower Abs',          d:'M108,148 L116,152 Q120,153 124,152 L132,148 L132,170 Q124,175 116,175 L108,170 Z' },
  // Hip flexors
  { id:'l_hip_flexor',    label:'Left Hip',           d:'M86,176 L76,168 L74,192 L84,204 Q96,206 106,200 L108,186 L104,162 Z' },
  { id:'r_hip_flexor',    label:'Right Hip',          d:'M154,176 L164,168 L166,192 L156,204 Q144,206 134,200 L132,186 L136,162 Z' },
  // Groin
  { id:'groin',           label:'Groin',              d:'M108,170 L108,186 Q114,188 120,188 Q126,188 132,186 L132,170 Q124,175 116,175 Z' },
  // Biceps
  { id:'l_bicep',         label:'Left Bicep',         d:'M57,136 L50,140 L44,178 Q46,188 55,192 L62,188 L64,164 L80,134 Z' },
  { id:'r_bicep',         label:'Right Bicep',        d:'M183,136 L190,140 L196,178 Q194,188 185,192 L178,188 L176,164 L160,134 Z' },
  // Forearms
  { id:'l_forearm_front', label:'Left Forearm',       d:'M44,178 L38,200 L36,224 Q40,234 50,236 L56,232 L62,208 L62,188 L55,192 Z' },
  { id:'r_forearm_front', label:'Right Forearm',      d:'M196,178 L202,200 L204,224 Q200,234 190,236 L184,232 L178,208 L178,188 L185,192 Z' },
  // Wrists
  { id:'l_wrist_front',   label:'Left Wrist',         d:'M36,224 L34,238 Q38,246 46,246 L54,244 L56,232 L50,236 Z' },
  { id:'r_wrist_front',   label:'Right Wrist',        d:'M204,224 L206,238 Q202,246 194,246 L186,244 L184,232 L190,236 Z' },
  // Hands
  { id:'l_hand',          label:'Left Hand',          d:'M30,238 L28,256 Q30,270 40,278 Q50,284 58,278 Q64,268 64,256 L54,244 L46,246 Z' },
  { id:'r_hand',          label:'Right Hand',         d:'M210,238 L212,256 Q210,270 200,278 Q190,284 182,278 Q176,268 176,256 L186,244 L194,246 Z' },
  // Quads
  { id:'l_quad',          label:'Left Quad',          d:'M84,204 L74,192 L68,228 L66,268 L70,286 L84,290 Q96,288 100,278 L102,256 L106,220 L106,200 Z' },
  { id:'r_quad',          label:'Right Quad',         d:'M156,204 L166,192 L172,228 L174,268 L170,286 L156,290 Q144,288 140,278 L138,256 L134,220 L134,200 Z' },
  // Inner Thigh
  { id:'l_inner_thigh',   label:'Left Inner Thigh',   d:'M108,186 L106,200 L106,220 L102,256 Q108,262 114,262 L114,200 Q112,194 108,186 Z' },
  { id:'r_inner_thigh',   label:'Right Inner Thigh',  d:'M132,186 L134,200 L134,220 L138,256 Q132,262 126,262 L126,200 Q128,194 132,186 Z' },
  // Knees
  { id:'l_knee',          label:'Left Knee',          d:'M66,268 L70,286 L84,290 L96,288 L100,278 L102,256 L96,260 Q84,268 76,268 Z' },
  { id:'r_knee',          label:'Right Knee',         d:'M174,268 L170,286 L156,290 L144,288 L140,278 L138,256 L144,260 Q156,268 164,268 Z' },
  // Tibialis / Shins
  { id:'l_shin',          label:'Left Shin',          d:'M70,286 L68,314 L66,344 L72,358 L84,362 L88,350 L86,318 L84,290 Z' },
  { id:'r_shin',          label:'Right Shin',         d:'M170,286 L172,314 L174,344 L168,358 L156,362 L152,350 L154,318 L156,290 Z' },
  // Peroneals
  { id:'l_peroneal',      label:'Left Calf',          d:'M84,290 L86,318 L88,350 L84,362 Q82,374 80,382 L88,386 Q100,384 106,374 L104,354 L100,316 L96,288 Z' },
  { id:'r_peroneal',      label:'Right Calf',         d:'M156,290 L154,318 L152,350 L156,362 Q158,374 160,382 L152,386 Q140,384 134,374 L136,354 L140,316 L144,288 Z' },
  // Ankles
  { id:'l_ankle',         label:'Left Ankle',         d:'M66,344 L64,358 Q64,368 70,374 Q78,378 84,374 Q88,370 88,362 L84,362 L72,358 Z' },
  { id:'r_ankle',         label:'Right Ankle',        d:'M174,344 L176,358 Q176,368 170,374 Q162,378 156,374 Q152,370 152,362 L156,362 L168,358 Z' },
  // Feet
  { id:'l_foot',          label:'Left Foot',          d:'M60,370 L56,382 L52,396 Q52,408 60,414 Q70,420 82,416 Q92,410 96,398 Q98,386 94,376 L80,382 Q72,382 64,374 Z' },
  { id:'r_foot',          label:'Right Foot',         d:'M180,370 L184,382 L188,396 Q188,408 180,414 Q170,420 158,416 Q148,410 144,398 Q142,386 146,376 L160,382 Q168,382 176,374 Z' },
];

// ── Back muscle regions ───────────────────────────────────────
const BACK_MUSCLES = [
  { id:'b_head',          label:'Back of Head',       d:'M120,8 C100,6 83,18 82,36 C81,50 88,62 100,68 C106,71 114,73 120,73 C126,73 134,71 140,68 C152,62 159,50 158,36 C157,18 140,6 120,8 Z' },
  { id:'b_neck',          label:'Back of Neck',       d:'M108,73 L108,92 Q120,96 132,92 L132,73 Q126,76 120,76 Q114,76 108,73 Z' },
  { id:'b_l_trap',        label:'Left Trapezius',     d:'M108,92 L87,92 L72,100 L66,114 L74,124 L88,118 L96,116 Z' },
  { id:'b_r_trap',        label:'Right Trapezius',    d:'M132,92 L153,92 L168,100 L174,114 L166,124 L152,118 L144,116 Z' },
  { id:'b_l_deltoid',     label:'Left Deltoid (back)',d:'M87,92 C75,90 61,96 54,108 C49,118 50,130 57,136 L62,130 L68,120 L80,108 L88,100 L88,92 Z' },
  { id:'b_r_deltoid',     label:'Right Deltoid (back)',d:'M153,92 C165,90 179,96 186,108 C191,118 190,130 183,136 L178,130 L172,120 L160,108 L152,100 L152,92 Z' },
  { id:'b_rhomboid',      label:'Rhomboids',          d:'M96,116 L88,118 L86,136 L96,140 L120,144 L144,140 L154,136 L152,118 L144,116 L120,120 Z' },
  { id:'b_l_lat',         label:'Left Lat',           d:'M86,136 L57,136 L54,160 L60,180 L72,190 L84,188 L90,174 L96,156 L96,140 Z' },
  { id:'b_r_lat',         label:'Right Lat',          d:'M154,136 L183,136 L186,160 L180,180 L168,190 L156,188 L150,174 L144,156 L144,140 Z' },
  { id:'b_l_erector',     label:'Left Erector',       d:'M114,120 L108,134 L106,164 L108,188 L114,192 L120,194 L120,120 Z' },
  { id:'b_r_erector',     label:'Right Erector',      d:'M126,120 L132,134 L134,164 L132,188 L126,192 L120,194 L120,120 Z' },
  { id:'b_l_bicep',       label:'Left Tricep',        d:'M57,136 L50,140 L44,178 Q46,188 55,192 L64,188 L68,168 L66,148 L60,140 Z' },
  { id:'b_r_bicep',       label:'Right Tricep',       d:'M183,136 L190,140 L196,178 Q194,188 185,192 L176,188 L172,168 L174,148 L180,140 Z' },
  { id:'b_l_forearm',     label:'Left Forearm (back)',d:'M55,192 L44,178 L38,200 L36,224 Q40,234 50,236 L56,232 L62,208 L64,188 Z' },
  { id:'b_r_forearm',     label:'Right Forearm (back)',d:'M185,192 L196,178 L202,200 L204,224 Q200,234 190,236 L184,232 L178,208 L176,188 Z' },
  { id:'b_l_glute',       label:'Left Glute',         d:'M84,188 L72,190 L66,208 L68,230 L80,244 Q94,250 106,244 L108,226 L108,208 L108,188 Z' },
  { id:'b_r_glute',       label:'Right Glute',        d:'M156,188 L168,190 L174,208 L172,230 L160,244 Q146,250 134,244 L132,226 L132,208 L132,188 Z' },
  { id:'b_l_hamstring',   label:'Left Hamstring',     d:'M68,230 L66,268 L72,292 L82,298 L94,294 L100,276 L106,252 L106,244 Q94,250 80,244 Z' },
  { id:'b_r_hamstring',   label:'Right Hamstring',    d:'M172,230 L174,268 L168,292 L158,298 L146,294 L140,276 L134,252 L134,244 Q146,250 160,244 Z' },
  { id:'b_l_knee',        label:'Left Knee (back)',   d:'M72,292 L70,308 L76,318 L86,320 L96,316 L100,302 L100,276 L94,294 Z' },
  { id:'b_r_knee',        label:'Right Knee (back)',  d:'M168,292 L170,308 L164,318 L154,320 L144,316 L140,302 L140,276 L146,294 Z' },
  { id:'b_l_calf',        label:'Left Calf (back)',   d:'M76,318 L72,344 L72,368 Q76,378 84,380 Q92,380 96,372 L96,348 L96,316 L86,320 Z' },
  { id:'b_r_calf',        label:'Right Calf (back)',  d:'M164,318 L168,344 L168,368 Q164,378 156,380 Q148,380 144,372 L144,348 L144,316 L154,320 Z' },
  { id:'b_l_ankle',       label:'Left Achilles',      d:'M72,368 L68,382 Q68,394 76,398 Q84,400 90,394 L96,380 L96,372 Q92,380 84,380 Z' },
  { id:'b_r_ankle',       label:'Right Achilles',     d:'M168,368 L172,382 Q172,394 164,398 Q156,400 150,394 L144,380 L144,372 Q148,380 156,380 Z' },
  { id:'b_l_foot',        label:'Left Heel',          d:'M60,390 L58,408 Q60,420 72,422 Q84,422 92,414 L90,398 Q84,400 76,398 Q68,394 68,382 Z' },
  { id:'b_r_foot',        label:'Right Heel',         d:'M180,390 L182,408 Q180,420 168,422 Q156,422 148,414 L150,398 Q156,400 164,398 Q172,394 172,382 Z' },
];

// ── Color palette per muscle group type ───────────────────────
function getBaseColor(id) {
  if (id.includes('head') || id.includes('neck')) return { fill:'rgba(180,140,120,.15)', stroke:'rgba(180,140,120,.45)' };
  if (id.includes('trap') || id.includes('deltoid')) return { fill:'rgba(123,47,190,.12)', stroke:'rgba(150,80,210,.4)' };
  if (id.includes('pec') || id.includes('rhomboid')) return { fill:'rgba(100,60,180,.12)', stroke:'rgba(120,80,200,.38)' };
  if (id.includes('lat') || id.includes('erector')) return { fill:'rgba(80,50,160,.14)', stroke:'rgba(100,70,190,.42)' };
  if (id.includes('abs') || id.includes('oblique')) return { fill:'rgba(90,55,170,.13)', stroke:'rgba(110,70,195,.4)' };
  if (id.includes('bicep') || id.includes('tricep')) return { fill:'rgba(110,65,185,.13)', stroke:'rgba(130,80,200,.42)' };
  if (id.includes('forearm')) return { fill:'rgba(100,60,175,.12)', stroke:'rgba(120,75,195,.4)' };
  if (id.includes('wrist') || id.includes('hand')) return { fill:'rgba(130,90,160,.12)', stroke:'rgba(150,100,180,.38)' };
  if (id.includes('glute') || id.includes('hip')) return { fill:'rgba(140,60,180,.13)', stroke:'rgba(155,75,195,.42)' };
  if (id.includes('quad') || id.includes('hamstring') || id.includes('inner')) return { fill:'rgba(90,50,175,.14)', stroke:'rgba(110,65,195,.44)' };
  if (id.includes('knee')) return { fill:'rgba(160,100,180,.12)', stroke:'rgba(175,115,195,.4)' };
  if (id.includes('shin') || id.includes('calf') || id.includes('peroneal')) return { fill:'rgba(80,45,165,.13)', stroke:'rgba(100,60,185,.42)' };
  if (id.includes('ankle')) return { fill:'rgba(150,95,175,.12)', stroke:'rgba(165,110,190,.4)' };
  if (id.includes('foot') || id.includes('heel')) return { fill:'rgba(120,75,165,.12)', stroke:'rgba(140,90,185,.38)' };
  return { fill:'rgba(100,60,170,.12)', stroke:'rgba(120,75,190,.38)' };
}

// ── Body figure SVG ───────────────────────────────────────────
function AnatomyFigure({ regions, painData, selectedIds, onTap }) {
  return (
    <svg viewBox="0 0 240 430" style={{ width:'100%', maxWidth:220, display:'block', margin:'0 auto' }}>
      <defs>
        <filter id="muscleShadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,.4)" floodOpacity="0.4"/>
        </filter>
        <filter id="painGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Subtle body silhouette base */}
      <path d="M120,8 C88,8 70,28 70,50 C70,68 80,80 95,88 L88,100 C70,102 50,110 40,128 C30,144 32,164 40,178 L28,186 L18,230 Q18,244 28,248 L36,244 L36,280 Q32,292 34,310 L30,360 Q28,378 32,396 L44,406 L60,408 L72,400 L72,368 L68,340 L72,296 L86,294 L86,340 L82,368 L82,400 L94,408 L106,412 L118,412 L122,412 L134,412 L146,408 L158,400 L158,368 L154,340 L154,294 L168,296 L172,340 L168,368 L168,400 L180,408 L196,406 L208,396 Q212,378 210,360 L206,310 Q208,292 204,280 L204,244 L212,248 Q222,244 222,230 L212,186 L200,178 C208,164 210,144 200,128 C190,110 170,102 152,100 L145,88 C160,80 170,68 170,50 C170,28 152,8 120,8 Z"
        fill="rgba(8,2,22,.7)" stroke="rgba(123,47,190,.18)" strokeWidth="1"/>

      {/* Muscle regions */}
      {regions.map(r => {
        const pain = painData[r.id];
        const isSel = selectedIds.includes(r.id);
        const base = getBaseColor(r.id);
        let fill, stroke, strokeW, extraFilter;

        if (isSel) {
          fill = 'rgba(201,168,76,.3)'; stroke = '#E8C96B'; strokeW = 2; extraFilter = 'url(#muscleShadow)';
        } else if (pain) {
          if (pain.severity >= 7) {
            fill = 'rgba(239,68,68,.42)'; stroke = '#dc2626'; strokeW = 2; extraFilter = 'url(#painGlow)';
          } else {
            fill = 'rgba(248,113,113,.3)'; stroke = '#f87171'; strokeW = 1.5; extraFilter = '';
          }
        } else {
          fill = base.fill; stroke = base.stroke; strokeW = 1; extraFilter = '';
        }

        return (
          <g key={r.id} onClick={() => onTap(r)} style={{ cursor:'pointer' }}>
            <path
              d={r.d}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeW}
              strokeLinejoin="round"
              filter={extraFilter || undefined}
              style={{ transition:'all .18s ease' }}
            />
          </g>
        );
      })}

      {/* Muscle division lines — give depth/realism */}
      <g stroke="rgba(123,47,190,.08)" strokeWidth="0.5" fill="none">
        {/* Sternal line */}
        <line x1="120" y1="88" x2="120" y2="200"/>
        {/* Ab segments */}
        <line x1="108" y1="134" x2="132" y2="134"/>
        <line x1="108" y1="148" x2="132" y2="148"/>
        <line x1="108" y1="162" x2="132" y2="162"/>
        {/* Quad division */}
        <line x1="90" y1="210" x2="106" y2="286"/>
        <line x1="150" y1="210" x2="134" y2="286"/>
      </g>
    </svg>
  );
}

export default function BodyMap({ data, upd }) {
  const bodyMap = data.bodyMap || [];
  const [view, setView]         = useState('front');
  const [selectedIds, setSelectedIds] = useState([]);
  const [form, setForm]         = useState({ severity:5, types:[], notes:'' });
  const [editOpen, setEditOpen] = useState(false);
  const [multiLabel, setMultiLabel] = useState('');

  const regions = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;
  const painLookup = Object.fromEntries(bodyMap.map(e => [e.id, e]));

  const handleTap = useCallback(region => {
    setSelectedIds(prev =>
      prev.includes(region.id) ? prev.filter(x => x !== region.id) : [...prev, region.id]
    );
  }, []);

  const openEdit = () => {
    if (!selectedIds.length) return;
    const first = bodyMap.find(e => e.id === selectedIds[0]);
    setForm(first ? { severity:first.severity, types:first.types||[], notes:first.notes||'' } : { severity:5, types:[], notes:'' });
    setMultiLabel(selectedIds.length > 1 ? `${selectedIds.length} regions selected` : regions.find(r => r.id === selectedIds[0])?.label || selectedIds[0]);
    setEditOpen(true);
  };

  const save = () => {
    const entries = selectedIds.map(id => ({
      id, label: regions.find(r => r.id === id)?.label || id,
      severity:form.severity, types:form.types, notes:form.notes, date:todayStr(),
    }));
    upd('bodyMap', [...bodyMap.filter(e => !selectedIds.includes(e.id)), ...entries]);
    setEditOpen(false); setSelectedIds([]);
  };

  const clearSelected = () => {
    upd('bodyMap', bodyMap.filter(e => !selectedIds.includes(e.id)));
    setEditOpen(false); setSelectedIds([]);
  };

  const applyGroup = name => {
    const labels = PART_GROUPS[name] || [];
    const all = [...FRONT_MUSCLES, ...BACK_MUSCLES];
    const ids = labels.map(lbl => all.find(r => r.label === lbl || r.label.startsWith(lbl.replace('Left ','').replace('Right ','')))?.id).filter(Boolean);
    setSelectedIds(ids.length ? ids : []);
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:'#C9A84C', marginBottom:4 }}>◎ Body Map</div>
          <div style={{ fontSize:13, color:'rgba(240,232,255,.4)' }}>Tap muscle groups to log pain — select multiple at once</div>
        </div>
        {selectedIds.length > 0 && (
          <button className="btn btn-gold" onClick={openEdit}>
            Log {selectedIds.length} region{selectedIds.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Quick multi-select */}
      <div style={{ marginBottom:16, display:'flex', flexWrap:'wrap', gap:7, alignItems:'center' }}>
        <span style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.5)', letterSpacing:1.5, textTransform:'uppercase', flexShrink:0 }}>Quick select:</span>
        {Object.keys(PART_GROUPS).map(g => (
          <button key={g} onClick={() => applyGroup(g)}
            style={{ padding:'4px 12px', borderRadius:20, fontSize:11, border:'1px solid rgba(123,47,190,.25)', background:'rgba(255,255,255,.03)', color:'rgba(240,232,255,.45)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .14s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A84C'; e.currentTarget.style.color='#C9A84C'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(123,47,190,.25)'; e.currentTarget.style.color='rgba(240,232,255,.45)'; }}>
            {g}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:20, alignItems:'start' }} className="two-col">
        {/* Figure */}
        <div className="glass-card-static" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', minWidth:220 }}>
          {/* Front/Back toggle */}
          <div style={{ display:'flex', gap:0, background:'rgba(255,255,255,.05)', borderRadius:10, padding:3, marginBottom:16, width:'fit-content' }}>
            {['front','back'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding:'6px 20px', borderRadius:8, fontSize:12, fontWeight:600, border:'none', background:view===v?'linear-gradient(135deg,#C9A84C,#E8C96B)':'transparent', color:view===v?'#000':'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textTransform:'capitalize', transition:'all .15s' }}>
                {v}
              </button>
            ))}
          </div>

          <AnatomyFigure
            regions={regions}
            painData={painLookup}
            selectedIds={selectedIds}
            onTap={handleTap}
          />

          <div style={{ marginTop:12, fontSize:11, color:'rgba(240,232,255,.22)', textAlign:'center', lineHeight:1.5 }}>
            Tap to select · tap again to deselect<br/>Select multiple regions at once
          </div>
          <div style={{ display:'flex', gap:14, marginTop:12, flexWrap:'wrap', justifyContent:'center' }}>
            {[
              { label:'No pain', bg:'rgba(123,47,190,.15)', border:'rgba(123,47,190,.45)' },
              { label:'Mild',    bg:'rgba(248,113,113,.3)', border:'#f87171' },
              { label:'Severe',  bg:'rgba(239,68,68,.42)',  border:'#dc2626', glow:true },
            ].map(l => (
              <span key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'rgba(240,232,255,.35)' }}>
                <span style={{ width:10, height:10, borderRadius:2, background:l.bg, border:`1px solid ${l.border}`, display:'inline-block', boxShadow:l.glow?`0 0 4px ${l.border}`:undefined }}/>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {editOpen && (
            <div className="glass-card-static" style={{ padding:22, border:'1px solid rgba(201,168,76,.2)', animation:'popIn .2s ease' }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'#C9A84C', marginBottom:14 }}>{multiLabel}</div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <label style={{ margin:0 }}>Pain severity</label>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:700, color:'#f87171' }}>{form.severity}/10</span>
              </div>
              <input type="range" min={1} max={10} value={form.severity} onChange={e => setForm(f=>({...f,severity:+e.target.value}))} style={{ width:'100%', accentColor:'#C9A84C', marginBottom:14 }}/>
              <div style={{ marginBottom:14 }}>
                <label>Pain type</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                  {PAIN_TYPES.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, types:f.types.includes(t)?f.types.filter(x=>x!==t):[...f.types,t] }))}
                      style={{ padding:'4px 11px', borderRadius:20, fontSize:11, border:`1px solid ${form.types.includes(t)?'#C9A84C':'rgba(123,47,190,.25)'}`, background:form.types.includes(t)?'rgba(201,168,76,.1)':'rgba(255,255,255,.03)', color:form.types.includes(t)?'#C9A84C':'rgba(240,232,255,.4)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all .14s' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label>Notes</label>
                <textarea className="field" rows={2} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Describe the sensation…" style={{ resize:'vertical' }}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {bodyMap.some(e => selectedIds.includes(e.id)) && <button className="btn btn-danger" style={{ fontSize:12, padding:'8px 14px' }} onClick={clearSelected}>Clear</button>}
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => { setEditOpen(false); setSelectedIds([]); }}>Cancel</button>
                <button className="btn btn-gold" style={{ fontSize:12, flex:1, justifyContent:'center' }} onClick={save}>Save</button>
              </div>
            </div>
          )}

          <div className="glass-card-static" style={{ padding:20 }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:'#C9A84C', marginBottom:12 }}>Logged Pain Points</div>
            {bodyMap.length === 0
              ? <div style={{ fontSize:12, color:'rgba(240,232,255,.25)', fontStyle:'italic', lineHeight:1.7 }}>No pain logged yet.<br/>Tap a muscle group on the figure.</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[...bodyMap].sort((a,b) => b.severity - a.severity).map(e => {
                    const c = e.severity >= 7 ? '#ef4444' : '#f87171';
                    const bg = e.severity >= 7 ? 'rgba(239,68,68,.18)' : 'rgba(248,113,113,.1)';
                    return (
                      <div key={e.id} style={{ display:'flex', alignItems:'center', gap:11, padding:'10px 13px', background:'rgba(255,255,255,.03)', borderRadius:11, border:'1px solid rgba(123,47,190,.1)', cursor:'pointer' }}
                        onClick={() => { setSelectedIds([e.id]); setForm({severity:e.severity,types:e.types||[],notes:e.notes||''}); setMultiLabel(e.label); setEditOpen(true); }}>
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
