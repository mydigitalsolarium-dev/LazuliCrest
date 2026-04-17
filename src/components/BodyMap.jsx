import { useState, useCallback } from "react";
import { todayStr } from "../utils";

// ─── Layer system ──────────────────────────────────────────────
const LAYERS = [
  { id:'skin',     label:'Skin',     icon:'🧬', color:'#C9A84C',  views:['front','back'] },
  { id:'muscle',   label:'Muscle',   icon:'💪', color:'#e85d4a',  views:['front','back'] },
  { id:'organ',    label:'Organs',   icon:'🫀', color:'#e8a020',  views:['front','back'] },
  { id:'nervous',  label:'Nerve',    icon:'⚡', color:'#4A90D9',  views:['front','back'] },
  { id:'skeleton', label:'Skeleton', icon:'🦴', color:'#d4cbb8',  views:['front','back','left','right'] },
];

// ─── Hotspot definitions (SVG coordinates, viewBox 200×510) ────

// Skeletal system hotspots
const SKELETAL_HOTSPOTS = [
  { id:'skull',      label:'Skull',          system:'skeleton', d:'M100,10 C78,10 60,26 60,48 C60,68 70,82 85,88 L100,92 L115,88 C130,82 140,68 140,48 C140,26 122,10 100,10 Z',                              color:'#d4cbb8' },
  { id:'cervical',   label:'Cervical Spine', system:'skeleton', d:'M90,92 L90,116 Q100,120 110,116 L110,92 Q100,89 90,92 Z',                                                                                   color:'#d4cbb8' },
  { id:'ribs',       label:'Ribcage',        system:'skeleton', d:'M65,116 Q100,111 135,116 L137,175 Q100,180 63,175 Z',                                                                                       color:'#d4cbb8' },
  { id:'pelvis',     label:'Pelvis',         system:'skeleton', d:'M63,220 Q100,226 137,220 L134,265 Q120,275 100,278 Q80,275 66,265 Z',                                                                       color:'#d4cbb8' },
  { id:'femur_l',    label:'Left Femur',     system:'skeleton', d:'M63,268 L68,345 Q72,356 64,356 Q56,356 52,345 L50,268 Z',                                                                                   color:'#d4cbb8' },
  { id:'femur_r',    label:'Right Femur',    system:'skeleton', d:'M137,268 L132,345 Q128,356 136,356 Q144,356 148,345 L150,268 Z',                                                                            color:'#d4cbb8' },
];

// Visceral / organ hotspots (front view only)
const ORGAN_HOTSPOTS = [
  { id:'lung_l',     label:'Left Lung',      system:'organ',    d:'M68,118 Q82,114 95,116 L94,172 Q80,176 65,170 Z',                                                                                           color:'#e87c40' },
  { id:'lung_r',     label:'Right Lung',     system:'organ',    d:'M106,116 Q119,114 133,118 L135,170 Q120,176 106,172 Z',                                                                                     color:'#e87c40' },
  { id:'heart',      label:'Heart',          system:'organ',    d:'M87,122 Q100,118 113,122 L116,152 Q100,162 84,152 Z',                                                                                       color:'#e85060' },
  { id:'liver',      label:'Liver',          system:'organ',    d:'M65,172 Q100,168 135,172 L133,200 Q100,205 67,200 Z',                                                                                       color:'#b85030' },
  { id:'stomach',    label:'Stomach',        system:'organ',    d:'M82,196 Q100,192 116,200 L114,225 Q100,229 86,225 Z',                                                                                       color:'#c86050' },
  { id:'intestines', label:'Intestines',     system:'organ',    d:'M65,222 Q100,226 135,222 L133,266 Q100,270 67,266 Z',                                                                                       color:'#c07040' },
];

// Nervous system hotspots
const NERVE_HOTSPOTS = [
  { id:'brain_ns',   label:'Brain',          system:'nervous',  d:'M100,10 C78,10 60,26 60,48 C60,68 70,82 85,88 L100,92 L115,88 C130,82 140,68 140,48 C140,26 122,10 100,10 Z',                              color:'#4A90D9' },
  { id:'spinal',     label:'Spinal Cord',    system:'nervous',  d:'M97,92 L97,268 Q100,270 103,268 L103,92 Q100,90 97,92 Z',                                                                                   color:'#60a0e8' },
];

// General surface / pain-tracking regions (apply to all layers)
const PAIN_TYPES = [
  'Aching','Sharp','Burning','Throbbing','Stabbing',
  'Cramping','Stiffness','Tingling','Numbness','Pressure','Shooting','Tenderness'
];

const SURFACE_REGIONS = [
  { id:'head',           label:'Head',              cx:100, cy:50,  d:'M100,10 C78,10 60,28 60,50 C60,68 70,82 85,88 L85,95 L115,95 L115,88 C130,82 140,68 140,50 C140,28 122,10 100,10 Z' },
  { id:'neck',           label:'Neck',              cx:100, cy:107, d:'M85,95 L85,115 Q100,120 115,115 L115,95 Q100,92 85,95 Z' },
  { id:'left_shoulder',  label:'Left Shoulder',     cx:42,  cy:136, d:'M72,115 C60,115 48,118 38,126 C30,133 26,142 28,152 C30,160 38,164 48,162 L65,148 L72,130 Z' },
  { id:'right_shoulder', label:'Right Shoulder',    cx:158, cy:136, d:'M128,115 C140,115 152,118 162,126 C170,133 174,142 172,152 C170,160 162,164 152,162 L135,148 L128,130 Z' },
  { id:'chest',          label:'Chest',             cx:100, cy:145, d:'M72,115 Q100,110 128,115 L132,170 Q100,175 68,170 Z' },
  { id:'abdomen',        label:'Abdomen',           cx:100, cy:198, d:'M68,170 Q100,175 132,170 L134,220 Q100,226 66,220 Z' },
  { id:'left_hip',       label:'Left Hip',          cx:78,  cy:240, d:'M66,220 Q100,226 134,220 L130,265 Q115,272 100,272 L80,268 Z' },
  { id:'right_hip',      label:'Right Hip',         cx:122, cy:248, d:'M100,272 Q115,272 130,265 L126,280 Q113,285 100,283 Z' },
  { id:'left_upper_arm', label:'Left Upper Arm',    cx:36,  cy:197, d:'M48,162 L28,165 L18,220 Q22,232 34,234 L50,210 L65,180 Z' },
  { id:'right_upper_arm',label:'Right Upper Arm',   cx:164, cy:197, d:'M152,162 L172,165 L182,220 Q178,232 166,234 L150,210 L135,180 Z' },
  { id:'left_forearm',   label:'Left Forearm',      cx:25,  cy:266, d:'M16,240 Q12,258 14,276 Q16,288 22,294 L34,292 Q38,280 36,262 Q36,252 38,238 Q28,248 16,240 Z' },
  { id:'right_forearm',  label:'Right Forearm',     cx:175, cy:266, d:'M184,240 Q188,258 186,276 Q184,288 178,294 L166,292 Q162,280 164,262 Q164,252 162,238 Q172,248 184,240 Z' },
  { id:'left_hand',      label:'Left Hand',         cx:22,  cy:318, d:'M10,294 Q6,308 8,320 Q10,332 18,338 Q26,342 34,338 Q40,330 40,318 L36,300 Q28,302 18,300 Q14,298 10,294 Z' },
  { id:'right_hand',     label:'Right Hand',        cx:178, cy:318, d:'M190,294 Q194,308 192,320 Q190,332 182,338 Q174,342 166,338 Q160,330 160,318 L164,300 Q172,302 182,300 Q186,298 190,294 Z' },
  { id:'left_thigh',     label:'Left Thigh',        cx:66,  cy:278, d:'M66,220 L80,248 Q84,268 82,300 Q80,318 78,336 L58,334 Q54,314 54,294 Q52,270 54,248 Z' },
  { id:'right_thigh',    label:'Right Thigh',       cx:134, cy:278, d:'M134,220 L120,248 Q116,268 118,300 Q120,318 122,336 L142,334 Q146,314 146,294 Q148,270 146,248 Z' },
  { id:'left_knee',      label:'Left Knee',         cx:62,  cy:355, d:'M56,334 Q50,344 50,356 Q52,366 60,370 Q68,372 74,366 Q78,356 76,344 L78,336 L58,334 Z' },
  { id:'right_knee',     label:'Right Knee',        cx:138, cy:355, d:'M144,334 Q150,344 150,356 Q148,366 140,370 Q132,372 126,366 Q122,356 124,344 L122,336 L142,334 Z' },
  { id:'left_shin',      label:'Left Shin',         cx:58,  cy:403, d:'M50,356 Q46,380 46,408 Q48,428 54,442 L68,440 Q72,424 72,404 Q72,382 70,366 Q64,370 60,370 Q54,366 50,356 Z' },
  { id:'right_shin',     label:'Right Shin',        cx:142, cy:403, d:'M150,356 Q154,380 154,408 Q152,428 146,442 L132,440 Q128,424 128,404 Q128,382 130,366 Q136,370 140,370 Q146,366 150,356 Z' },
  { id:'left_foot',      label:'Left Foot',         cx:57,  cy:472, d:'M44,450 Q38,460 36,472 Q36,482 40,488 Q46,494 56,494 Q68,492 76,484 Q80,476 78,466 L72,452 Q62,460 50,460 Q46,458 44,450 Z' },
  { id:'right_foot',     label:'Right Foot',        cx:143, cy:472, d:'M156,450 Q162,460 164,472 Q164,482 160,488 Q154,494 144,494 Q132,492 124,484 Q120,476 122,466 L128,452 Q138,460 150,460 Q154,458 156,450 Z' },
];

// Drill-down layer order (outermost first)
const DRILL_ORDER = ['skin','muscle','organ','nervous','skeleton'];

// Blueprint corner brackets
function Corners({ w=200, h=510, len=16, pad=4, color='rgba(201,168,76,.4)' }) {
  const x1=pad,y1=pad,x2=w-pad,y2=h-pad;
  return (
    <>
      {[[x1,y1+len,x1,y1,x1+len,y1],[x2-len,y1,x2,y1,x2,y1+len],
        [x1,y2-len,x1,y2,x1+len,y2],[x2-len,y2,x2,y2,x2,y2-len]].map((p,i)=>(
        <polyline key={i} points={`${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}`}
          fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="square"/>
      ))}
    </>
  );
}

// ─── Main anatomical viewer ────────────────────────────────────
function AnatomyViewer({ activeLayer, activeView, painData, selectedIds, onTap, zoomedId, onZoomChange, drillRegion, onDrillClose }) {
  const layer = LAYERS.find(l => l.id === activeLayer);

  // Pick which hotspot set to show depending on layer
  const specialHotspots =
    activeLayer === 'skeleton' ? SKELETAL_HOTSPOTS :
    activeLayer === 'organ'    ? ORGAN_HOTSPOTS    :
    activeLayer === 'nervous'  ? NERVE_HOTSPOTS    : [];

  const zoomedRegion = SURFACE_REGIONS.find(r => r.id === zoomedId);
  const svgScale  = zoomedRegion ? 2.8 : 1;
  const svgOrigin = zoomedRegion
    ? `${(zoomedRegion.cx/200)*100}% ${(zoomedRegion.cy/510)*100}%`
    : '50% 50%';

  const HOTSPOT_CSS = `
    @keyframes bmpulse   { 0%,100%{opacity:.45} 50%{opacity:1} }
    @keyframes bmflow    { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-36} }
    @keyframes silkBloom { 0%{opacity:0;filter:blur(3px)} 100%{opacity:1;filter:blur(0)} }

    /* ── Anatomical Silk surface regions ── */
    .bm-surface { cursor:pointer; }
    .bm-surface path {
      fill: rgba(255,255,255,.0);
      stroke: rgba(201,168,76,.0);
      stroke-width: 0;
      transition: fill .55s cubic-bezier(.22,1,.36,1),
                  stroke .55s cubic-bezier(.22,1,.36,1),
                  stroke-width .55s,
                  filter .55s;
    }
    .bm-surface:hover path {
      fill: rgba(42,92,173,.14);
      stroke: url(#silk-grad-blue);
      stroke-width: 1.5;
      filter: blur(.5px) drop-shadow(0 0 5px rgba(42,92,173,.45));
    }
    .bm-surface.sel path {
      fill: rgba(42,92,173,.22);
      stroke: url(#silk-grad-blue);
      stroke-width: 1.5;
      filter: drop-shadow(0 0 8px rgba(42,92,173,.55));
      animation: silkBloom .45s cubic-bezier(.22,1,.36,1) forwards;
    }
    .bm-surface.mild path {
      fill: rgba(201,168,76,.18);
      stroke: url(#silk-grad-gold);
      stroke-width: 1.5;
      filter: drop-shadow(0 0 5px rgba(201,168,76,.35));
    }
    .bm-surface.severe path {
      fill: rgba(220,38,38,.22);
      stroke: url(#silk-grad-red);
      stroke-width: 1.5;
      filter: drop-shadow(0 0 8px rgba(220,38,38,.45));
    }

    /* ── Specialised skeleton / organ / nerve hotspots ── */
    .bm-special { cursor:pointer; }
    .bm-special path {
      fill: rgba(255,255,255,.0);
      stroke: rgba(255,255,255,.0);
      stroke-width: 0;
      transition: fill .45s cubic-bezier(.22,1,.36,1),
                  stroke-width .45s,
                  filter .45s;
    }
    .bm-special:hover path {
      fill: rgba(255,255,255,.10);
      stroke: rgba(255,255,255,.65);
      stroke-width: 1.4;
      filter: blur(.4px) drop-shadow(0 0 6px rgba(255,255,255,.25));
    }
    .bm-special.active path {
      fill: rgba(255,255,255,.14);
      stroke: rgba(255,255,255,.9);
      stroke-width: 1.8;
      filter: drop-shadow(0 0 10px currentColor);
      animation: silkBloom .4s cubic-bezier(.22,1,.36,1) forwards;
    }
  `;

  return (
    <div style={{ position:'relative', overflow:'hidden', borderRadius:8, background:'#000', lineHeight:0 }}>
      <svg
        viewBox="0 0 200 510"
        style={{
          width:'100%', maxWidth:220, display:'block',
          transform:`scale(${svgScale})`,
          transformOrigin: svgOrigin,
          transition:'transform .5s cubic-bezier(.22,1,.36,1)',
          cursor: zoomedRegion ? 'zoom-out' : 'default',
        }}
        onClick={e => { if (e.currentTarget === e.target) { onZoomChange(null); onDrillClose(); } }}
      >
        <defs>
          <filter id="bmg"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="bmng"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>

          {/* ── Silk glint-edge gradients — one bright side fades to transparent ── */}
          <linearGradient id="silk-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#4A90D9" stopOpacity="0.9"/>
            <stop offset="55%"  stopColor="#2A5CAD" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#2A5CAD" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="silk-grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#F0C855" stopOpacity="0.9"/>
            <stop offset="55%"  stopColor="#C9A84C" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="silk-grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#f87171" stopOpacity="0.9"/>
            <stop offset="55%"  stopColor="#DC2626" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <style>{HOTSPOT_CSS}</style>

        {/* Deep transparent base — let the viewer container bg show */}
        <rect x="0" y="0" width="200" height="510" fill="rgba(0,0,0,.82)"/>

        {/* ── Pure SVG human body diagram (replaces PNGs) ── */}
        {/* Body silhouette outline */}
        <path
          d="M100,5 C82,5 64,18 62,36 C58,58 66,78 80,88 L85,93 L88,98 Q80,100 74,106 Q58,112 44,122 Q28,134 20,148 L12,190 L6,246 L4,298 Q4,314 8,320 Q16,326 24,324 Q36,322 40,308 L44,260 L52,200 L62,158 L68,130 Q68,145 68,190 L68,228 L66,268 L60,286 L48,340 L42,400 L36,456 L34,492 Q34,504 40,508 L58,510 Q72,510 76,500 L78,462 L74,450 L68,392 L70,340 L78,282 Q84,272 100,270 Q116,272 122,282 L130,340 L132,392 L126,450 L122,462 L124,500 Q128,510 142,510 L160,508 Q166,504 166,492 L164,456 L158,400 L152,340 L134,286 L134,268 L132,228 L132,190 Q132,145 138,130 L144,158 L148,200 L156,260 L160,308 Q164,322 176,324 Q184,326 192,320 Q196,314 196,298 L194,246 L188,190 L180,148 Q172,134 156,122 Q142,112 126,106 Q120,100 112,98 L115,93 L120,88 C134,78 142,58 138,36 C136,18 118,5 100,5 Z"
          fill="rgba(15,20,35,0.6)"
          stroke="rgba(201,168,76,0.35)"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        {/* Structural anatomy lines */}
        {/* Spine */}
        <line x1="100" y1="115" x2="100" y2="270" stroke="rgba(201,168,76,0.18)" strokeWidth="0.7" strokeDasharray="3,4"/>
        {/* Clavicles */}
        <path d="M88,112 Q64,116 44,122" fill="none" stroke="rgba(201,168,76,0.2)" strokeWidth="0.7"/>
        <path d="M112,112 Q136,116 156,122" fill="none" stroke="rgba(201,168,76,0.2)" strokeWidth="0.7"/>
        {/* Ribcage outline */}
        <path d="M60,130 Q100,126 140,130 L138,185 Q100,190 62,185 Z" fill="none" stroke="rgba(201,168,76,0.13)" strokeWidth="0.7" strokeDasharray="2,3"/>
        {/* Pelvis line */}
        <path d="M62,222 Q100,230 138,222" fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="0.7"/>
        {/* Region underlay — all surface regions faintly drawn for alignment */}
        <g opacity="0.4">
          {SURFACE_REGIONS.map(r => (
            <path key={r.id+'-bg'} d={r.d}
              fill="rgba(201,168,76,0.03)"
              stroke="rgba(201,168,76,0.2)"
              strokeWidth="0.5"
              strokeLinejoin="round"/>
          ))}
        </g>
        {/* Layer-specific structural diagram */}
        {activeLayer === 'skeleton' && (
          <g opacity="0.55">
            {SKELETAL_HOTSPOTS.map(h => (
              <path key={h.id+'-sk'} d={h.d} fill="rgba(212,203,184,0.06)" stroke="rgba(212,203,184,0.35)" strokeWidth="0.6" strokeLinejoin="round"/>
            ))}
          </g>
        )}
        {activeLayer === 'organ' && (
          <g opacity="0.45">
            {ORGAN_HOTSPOTS.map(h => (
              <path key={h.id+'-og'} d={h.d} fill="rgba(232,160,32,0.06)" stroke="rgba(232,160,32,0.3)" strokeWidth="0.6" strokeLinejoin="round"/>
            ))}
          </g>
        )}
        {activeLayer === 'nervous' && (
          <g opacity="0.5">
            {NERVE_HOTSPOTS.map(h => (
              <path key={h.id+'-nv'} d={h.d} fill="rgba(74,144,217,0.06)" stroke="rgba(74,144,217,0.35)" strokeWidth="0.6" strokeLinejoin="round"/>
            ))}
          </g>
        )}

        {/* Lapis vascular/neural flows */}
        {(activeLayer === 'nervous' || activeLayer === 'skin') && (
          <>
            <line x1="100" y1="116" x2="100" y2="268" stroke="rgba(42,92,173,.4)" strokeWidth="1.1" strokeDasharray="4,4" style={{ animation:'bmflow 3s linear infinite' }}/>
            <path d="M65,148 Q44,180 22,238 Q16,265 15,292" fill="none" stroke="rgba(42,92,173,.25)" strokeWidth=".8" strokeDasharray="3,5" style={{ animation:'bmflow 4s linear infinite' }}/>
            <path d="M135,148 Q156,180 178,238 Q185,265 185,292" fill="none" stroke="rgba(42,92,173,.25)" strokeWidth=".8" strokeDasharray="3,5" style={{ animation:'bmflow 4s 1s linear infinite' }}/>
          </>
        )}

        {/* Surface pain-tracking regions */}
        {(activeLayer === 'skin' || activeLayer === 'muscle') && SURFACE_REGIONS.map(r => {
          const pain = painData[r.id];
          const isSel = selectedIds.includes(r.id);
          const isZoomed = zoomedId === r.id;
          let cls = 'bm-surface';
          if (isSel) cls += ' sel';
          else if (pain) cls += pain.severity >= 7 ? ' severe' : ' mild';
          return (
            <g key={r.id} className={cls}
              onClick={e => { e.stopPropagation(); onTap(r); onZoomChange(isZoomed ? null : r.id); }}>
              <path d={r.d}/>
            </g>
          );
        })}

        {/* Specialised hotspots (skeletal / organ / nervous) — Anatomical Silk */}
        {specialHotspots.map(h => {
          const isActive = selectedIds.includes(h.id);
          return (
            <g key={h.id}
              className={`bm-special${isActive ? ' active' : ''}`}
              style={{ color: h.color }}
              onClick={e => { e.stopPropagation(); onTap({ id:h.id, label:h.label, cx:100, cy:200 }); }}>
              <path d={h.d} style={{ stroke: h.color }}/>
              <title>{h.label}</title>
            </g>
          );
        })}

        {/* Joint sparkle nodes (front/back views) */}
        {activeView !== 'left' && activeView !== 'right' && [
          {x:100,y:18,r:2.2},{x:38,y:130,r:2.8},{x:162,y:130,r:2.8},
          {x:20,y:238,r:2.2},{x:180,y:238,r:2.2},{x:15,y:290,r:1.8},{x:185,y:290,r:1.8},
          {x:66,y:224,r:2.5},{x:134,y:224,r:2.5},{x:62,y:352,r:2.5},{x:138,y:352,r:2.5},
          {x:57,y:448,r:2.0},{x:143,y:448,r:2.0},
        ].map((n,i) => (
          <g key={i} filter="url(#bmng)">
            <circle cx={n.x} cy={n.y} r={n.r} fill={layer?.color || 'rgba(201,168,76,.75)'}
              opacity="0.7" style={{ animation:`bmpulse ${2.2+(i%3)*.7}s ${(i%4)*.3}s ease-in-out infinite` }}/>
            <line x1={n.x-n.r*2} y1={n.y} x2={n.x+n.r*2} y2={n.y} stroke={layer?.color || 'rgba(201,168,76,.4)'} strokeWidth="0.5" opacity="0.4"/>
            <line x1={n.x} y1={n.y-n.r*2} x2={n.x} y2={n.y+n.r*2} stroke={layer?.color || 'rgba(201,168,76,.4)'} strokeWidth="0.5" opacity="0.4"/>
          </g>
        ))}

        {/* Blueprint corners */}
        <Corners/>

        {/* Layer + view label */}
        <text x="196" y="252" textAnchor="end" fontSize="5.5" fill="rgba(201,168,76,.28)" fontFamily="'DM Sans',sans-serif">
          {layer?.label.toUpperCase()} · {activeView.toUpperCase()}
        </text>
      </svg>

      {/* Zoom-out button */}
      {zoomedRegion && (
        <button onClick={() => onZoomChange(null)}
          style={{ position:'absolute', top:8, right:8, zIndex:10, background:'rgba(0,0,0,.8)', border:'1px solid rgba(201,168,76,.4)', borderRadius:7, padding:'3px 9px', fontSize:10, color:'rgba(201,168,76,.85)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
          ← Zoom out
        </button>
      )}
    </div>
  );
}

// ─── Directional pad ──────────────────────────────────────────
function DPad({ view, onView, canSideView }) {
  const btn = (id, label, disabled) => (
    <button key={id} onClick={() => !disabled && onView(id)} disabled={disabled}
      style={{
        padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600,
        border:`1px solid ${view===id ? 'rgba(201,168,76,.7)' : disabled ? 'rgba(255,255,255,.08)' : 'rgba(42,92,173,.3)'}`,
        background: view===id ? 'rgba(201,168,76,.15)' : disabled ? 'rgba(255,255,255,.03)' : 'rgba(42,92,173,.06)',
        color: view===id ? '#C9A84C' : disabled ? 'rgba(168,196,240,.2)' : 'rgba(168,196,240,.55)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily:"'DM Sans',sans-serif",
        transition:'all .14s',
        minWidth: 54,
      }}>
      {label}
    </button>
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      {btn('front','↑ Front',false)}
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        {btn('left','◁ Left', !canSideView)}
        <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'rgba(201,168,76,.4)' }}>◎</div>
        {btn('right','Right ▷', !canSideView)}
      </div>
      {btn('back','↓ Back', false)}
      {!canSideView && (
        <div style={{ fontSize:10, color:'rgba(168,196,240,.25)', textAlign:'center', marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>
          Left/Right: Skeleton only
        </div>
      )}
    </div>
  );
}

// ─── System toggle ────────────────────────────────────────────
function SystemToggle({ activeLayer, onLayer }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
      {LAYERS.map(l => (
        <button key={l.id} onClick={() => onLayer(l.id)}
          style={{
            padding:'6px 13px', borderRadius:20, fontSize:12, fontWeight:600,
            border:`1.5px solid ${activeLayer===l.id ? l.color : 'rgba(255,255,255,.1)'}`,
            background: activeLayer===l.id ? `${l.color}18` : 'rgba(255,255,255,.03)',
            color: activeLayer===l.id ? l.color : 'rgba(168,196,240,.4)',
            cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
            transition:'all .16s',
            boxShadow: activeLayer===l.id ? `0 0 10px ${l.color}30` : 'none',
          }}>
          {l.icon} {l.label}
        </button>
      ))}
    </div>
  );
}

// ─── Drill-down picker ────────────────────────────────────────
function DrillPicker({ region, onSelect, onClose }) {
  if (!region) return null;
  return (
    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:20, background:'rgba(4,8,28,.97)', border:'1px solid rgba(201,168,76,.35)', borderRadius:14, padding:'18px 20px', minWidth:200, boxShadow:'0 8px 40px rgba(0,0,0,.8)' }}>
      <div style={{ fontFamily:"'Cinzel',serif", fontSize:13, color:'#C9A84C', marginBottom:12, letterSpacing:.3 }}>
        {region.label} — View Layer
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {DRILL_ORDER.map(lid => {
          const l = LAYERS.find(x => x.id === lid);
          return (
            <button key={lid} onClick={() => onSelect(lid)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, border:`1px solid ${l.color}40`, background:`${l.color}0d`, color:l.color, cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif", transition:'all .14s' }}
              onMouseEnter={e => { e.currentTarget.style.background=`${l.color}22`; }}
              onMouseLeave={e => { e.currentTarget.style.background=`${l.color}0d`; }}>
              <span style={{ fontSize:18 }}>{l.icon}</span>
              <span style={{ fontWeight:600 }}>{l.label}</span>
            </button>
          );
        })}
      </div>
      <button onClick={onClose} style={{ marginTop:10, width:'100%', padding:'7px', borderRadius:8, border:'1px solid rgba(168,196,240,.12)', background:'rgba(255,255,255,.03)', color:'rgba(168,196,240,.4)', cursor:'pointer', fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────
export default function BodyMap({ data, upd }) {
  const bodyMap = data.bodyMap || [];
  const [activeLayer, setActiveLayer] = useState('skin');
  const [activeView,  setActiveView]  = useState('front');
  const [selectedIds, setSelectedIds] = useState([]);
  const [zoomedId,    setZoomedId]    = useState(null);
  const [drillRegion, setDrillRegion] = useState(null);
  const [editOpen,    setEditOpen]    = useState(false);
  const [form,        setForm]        = useState({ severity:5, types:[], notes:'' });
  const [multiLabel,  setMultiLabel]  = useState('');

  const canSideView = activeLayer === 'skeleton';

  // Perspective lock: when switching to non-skeleton layer, snap to front/back
  const handleLayerChange = useCallback((lid) => {
    setActiveLayer(lid);
    const layer = LAYERS.find(l => l.id === lid);
    if (!layer.views.includes(activeView)) {
      setActiveView(activeView === 'right' ? 'front' : activeView === 'left' ? 'front' : activeView);
    }
    setZoomedId(null);
  }, [activeView]);

  const handleViewChange = useCallback((v) => {
    const layer = LAYERS.find(l => l.id === activeLayer);
    if (!layer.views.includes(v)) return;
    setActiveView(v);
    setZoomedId(null);
  }, [activeLayer]);

  const handleTap = useCallback((region) => {
    setSelectedIds(prev =>
      prev.includes(region.id) ? prev.filter(x => x !== region.id) : [...prev, region.id]
    );
  }, []);

  const handleDrillSelect = (lid) => {
    setActiveLayer(lid);
    const layer = LAYERS.find(l => l.id === lid);
    if (!layer.views.includes(activeView)) setActiveView('front');
    setDrillRegion(null);
    setZoomedId(null);
  };

  const openEdit = () => {
    if (!selectedIds.length) return;
    const first = bodyMap.find(e => e.id === selectedIds[0]);
    setForm(first ? { severity:first.severity, types:first.types||[], notes:first.notes||'' } : { severity:5, types:[], notes:'' });
    const reg = SURFACE_REGIONS.find(r => r.id === selectedIds[0]);
    setMultiLabel(selectedIds.length > 1 ? `${selectedIds.length} areas` : reg?.label || selectedIds[0]);
    setEditOpen(true);
  };

  const save = () => {
    const entries = selectedIds.map(id => ({
      id, label: SURFACE_REGIONS.find(r => r.id === id)?.label || id,
      severity: form.severity, types: form.types, notes: form.notes, date: todayStr(),
    }));
    upd('bodyMap', [...bodyMap.filter(e => !selectedIds.includes(e.id)), ...entries]);
    setEditOpen(false); setSelectedIds([]); setZoomedId(null);
  };

  const clearSelected = () => {
    upd('bodyMap', bodyMap.filter(e => !selectedIds.includes(e.id)));
    setEditOpen(false); setSelectedIds([]); setZoomedId(null);
  };

  const toggleType = t => setForm(f => ({
    ...f, types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t]
  }));

  const activeLayerDef = LAYERS.find(l => l.id === activeLayer);

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:22, fontWeight:700, color:'#C9A84C', marginBottom:4, letterSpacing:.5 }}>◎ Body Map</div>
          <div style={{ fontSize:13, color:'rgba(74,144,217,.55)', fontFamily:"'DM Sans',sans-serif" }}>
            Select a system layer · rotate the view · tap regions to log pain
          </div>
        </div>
        {selectedIds.length > 0 && (
          <button className="btn btn-gold" onClick={openEdit}>
            Log {selectedIds.length} area{selectedIds.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* System toggle */}
      <div style={{ marginBottom:16 }}>
        <SystemToggle activeLayer={activeLayer} onLayer={handleLayerChange}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:20, alignItems:'start' }} className="two-col">

        {/* ── Left: figure + controls ── */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          {/* Viewer — Anatomical Silk container */}
          <div style={{ position:'relative', width:'100%', maxWidth:230, background:'rgba(2,4,14,.92)', borderRadius:12, border:`1px solid ${activeLayerDef?.color || '#C9A84C'}18`, boxShadow:`0 0 50px ${activeLayerDef?.color || '#4A90D9'}18, inset 0 0 30px rgba(0,0,0,.4)`, overflow:'hidden', backdropFilter:'blur(4px)' }}>
            <AnatomyViewer
              activeLayer={activeLayer}
              activeView={activeView}
              painData={Object.fromEntries(bodyMap.map(e => [e.id, e]))}
              selectedIds={selectedIds}
              onTap={handleTap}
              zoomedId={zoomedId}
              onZoomChange={setZoomedId}
              drillRegion={drillRegion}
              onDrillClose={() => setDrillRegion(null)}
            />
            {/* Drill picker overlay */}
            {drillRegion && (
              <DrillPicker
                region={drillRegion}
                onSelect={handleDrillSelect}
                onClose={() => setDrillRegion(null)}
              />
            )}
          </div>

          {/* D-Pad */}
          <DPad view={activeView} onView={handleViewChange} canSideView={canSideView}/>

          {/* Legend */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center', maxWidth:230 }}>
            {[
              { label:'Normal',   fill:'transparent',          stroke:'rgba(201,168,76,.2)' },
              { label:'Mild',     fill:'rgba(201,168,76,.18)', stroke:'rgba(201,168,76,.8)' },
              { label:'Severe',   fill:'rgba(220,38,38,.25)',  stroke:'#f87171',  glow:'0 0 5px rgba(220,38,38,.4)' },
              { label:'Selected', fill:'rgba(42,92,173,.22)',  stroke:'#4A90D9',  glow:'0 0 5px rgba(42,92,173,.4)' },
            ].map(l => (
              <span key={l.label} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'rgba(168,196,240,.3)', fontFamily:"'DM Sans',sans-serif" }}>
                <span style={{ width:10, height:10, borderRadius:2, background:l.fill, border:`1px solid ${l.stroke}`, boxShadow:l.glow, display:'inline-block' }}/>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Right: panel ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Layer info card */}
          <div className="glass-card-static" style={{ padding:18, border:`1px solid ${activeLayerDef?.color || '#C9A84C'}25` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ fontSize:24 }}>{activeLayerDef?.icon}</span>
              <div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, fontWeight:600, color: activeLayerDef?.color || '#C9A84C', letterSpacing:.3 }}>{activeLayerDef?.label} System</div>
                <div style={{ fontSize:11, color:'rgba(168,196,240,.35)', fontFamily:"'DM Sans',sans-serif", marginTop:2 }}>
                  {activeLayerDef?.views.length} view{activeLayerDef?.views.length > 1 ? 's' : ''} available
                  {activeLayer !== 'skeleton' && ' · side views disabled'}
                </div>
              </div>
            </div>
            <div style={{ fontSize:12, color:'rgba(168,196,240,.5)', lineHeight:1.65, fontFamily:"'DM Sans',sans-serif" }}>
              {activeLayer === 'skin'     && 'Surface anatomy — tap regions to log pain, rashes, or tenderness across the skin layer.'}
              {activeLayer === 'muscle'   && 'Muscular system — identify specific muscle groups affected by pain, spasm, or weakness.'}
              {activeLayer === 'organ'    && 'Internal organs — log visceral pain and track organ-specific symptoms like pressure or cramping.'}
              {activeLayer === 'nervous'  && 'Nervous system — map neurological symptoms including tingling, numbness, and nerve pain pathways.'}
              {activeLayer === 'skeleton' && 'Skeletal system — full 4-view rotation available. Map bone, joint, and skeletal pain precisely.'}
            </div>
            {activeLayer === 'skeleton' && (
              <div style={{ marginTop:10, fontSize:11, color:'rgba(201,168,76,.4)', fontFamily:"'DM Sans',sans-serif", display:'flex', gap:6, flexWrap:'wrap' }}>
                {['skull','cervical','ribs','pelvis','femur_l','femur_r'].map(id => {
                  const h = SKELETAL_HOTSPOTS.find(x => x.id === id);
                  return h ? <span key={id} style={{ padding:'2px 8px', borderRadius:20, border:'1px solid rgba(201,168,76,.2)', background:'rgba(201,168,76,.06)' }}>{h.label}</span> : null;
                })}
              </div>
            )}
            {activeLayer === 'organ' && (
              <div style={{ marginTop:10, fontSize:11, color:'rgba(232,122,64,.5)', fontFamily:"'DM Sans',sans-serif", display:'flex', gap:6, flexWrap:'wrap' }}>
                {ORGAN_HOTSPOTS.map(h => (
                  <span key={h.id} style={{ padding:'2px 8px', borderRadius:20, border:'1px solid rgba(232,122,64,.2)', background:'rgba(232,122,64,.06)' }}>{h.label}</span>
                ))}
              </div>
            )}
          </div>

          {/* Edit form */}
          {editOpen && (
            <div className="glass-card-static" style={{ padding:20, border:'1px solid rgba(74,144,217,.2)', animation:'popIn .2s ease' }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:'#C9A84C', marginBottom:14 }}>{multiLabel}</div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <label style={{ margin:0, fontSize:12 }}>Pain severity</label>
                <span style={{ fontSize:15, fontWeight:700, color:'#f87171', fontFamily:"'DM Sans',sans-serif" }}>{form.severity}/10</span>
              </div>
              <input type="range" min={1} max={10} value={form.severity}
                onChange={e => setForm(f => ({...f,severity:+e.target.value}))}
                style={{ width:'100%', accentColor:'#4A90D9', marginBottom:12 }}/>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12 }}>Pain type</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:6 }}>
                  {PAIN_TYPES.map(t => (
                    <button key={t} onClick={() => toggleType(t)}
                      style={{ padding:'3px 9px', borderRadius:20, fontSize:11, border:`1px solid ${form.types.includes(t)?'#4A90D9':'rgba(74,144,217,.18)'}`, background:form.types.includes(t)?'rgba(42,92,173,.14)':'rgba(255,255,255,.02)', color:form.types.includes(t)?'#4A90D9':'rgba(168,196,240,.38)', cursor:'pointer', fontFamily:"'DM Sans',sans-serif', transition:'all .12s" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12 }}>Notes</label>
                <textarea className="field" rows={2} value={form.notes}
                  onChange={e => setForm(f => ({...f,notes:e.target.value}))}
                  placeholder="Describe the sensation…" style={{ resize:'vertical', marginTop:6 }}/>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {bodyMap.some(e => selectedIds.includes(e.id)) && (
                  <button className="btn btn-danger" style={{ fontSize:12, padding:'7px 12px' }} onClick={clearSelected}>Clear</button>
                )}
                <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={() => { setEditOpen(false); setSelectedIds([]); }}>Cancel</button>
                <button className="btn btn-gold"  style={{ fontSize:12, flex:1, justifyContent:'center' }} onClick={save}>Save</button>
              </div>
            </div>
          )}

          {/* Logged pain */}
          <div className="glass-card-static" style={{ padding:18, border:'1px solid rgba(42,92,173,.1)' }}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, fontWeight:600, color:'rgba(201,168,76,.55)', marginBottom:12, letterSpacing:1, textTransform:'uppercase' }}>Logged Pain</div>
            {bodyMap.length === 0
              ? <div style={{ fontSize:12, color:'rgba(168,196,240,.22)', lineHeight:1.7 }}>No pain logged yet.<br/>Select a system and tap a region.</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                  {[...bodyMap].sort((a,b) => b.severity - a.severity).map(e => {
                    const c  = e.severity >= 7 ? '#f87171' : 'rgba(201,168,76,.9)';
                    const bg = e.severity >= 7 ? 'rgba(239,68,68,.12)' : 'rgba(201,168,76,.07)';
                    return (
                      <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'rgba(42,92,173,.04)', borderRadius:9, border:'1px solid rgba(42,92,173,.1)', cursor:'pointer' }}
                        onClick={() => { setSelectedIds([e.id]); const r = SURFACE_REGIONS.find(x=>x.id===e.id); if(r){ setForm({severity:e.severity,types:e.types||[],notes:e.notes||''}); setMultiLabel(e.label); setEditOpen(true); } }}>
                        <div style={{ width:30, height:30, borderRadius:'50%', background:bg, border:`1.5px solid ${c}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:c, flexShrink:0 }}>{e.severity}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'rgba(220,232,255,.85)' }}>{e.label}</div>
                          {e.types?.length > 0 && <div style={{ fontSize:11, color:'rgba(168,196,240,.32)' }}>{e.types.join(' · ')}</div>}
                        </div>
                        <span style={{ fontSize:13, color:'rgba(74,144,217,.38)' }}>›</span>
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
