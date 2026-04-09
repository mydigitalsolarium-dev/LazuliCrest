import { useState } from 'react';

const DEFAULT_FRIDGE = [
  { id:'water',       label:'Water',         icon:'◇', color:'#93c5fd', ml:237  },
  { id:'matcha',      label:'Matcha',        icon:'◈', color:'#6ee7b7', ml:237  },
  { id:'coffee',      label:'Coffee',        icon:'◉', color:'#d97706', ml:237  },
  { id:'oj',          label:'Orange Juice',  icon:'◎', color:'#f97316', ml:180  },
  { id:'electrolyte', label:'Electrolytes',  icon:'⊕', color:'#C9A84C', ml:355  },
  { id:'tea',         label:'Herbal Tea',    icon:'◌', color:'#a78bfa', ml:237  },
];

// Serving size presets
const SIZES_ML = [
  { label:'4 fl oz',  ml:118  },
  { label:'8 fl oz',  ml:237  },
  { label:'12 fl oz', ml:355  },
  { label:'16 fl oz', ml:473  },
  { label:'20 fl oz', ml:591  },
  { label:'1 cup',    ml:237  },
  { label:'1.5 cups', ml:355  },
  { label:'2 cups',   ml:473  },
];

const UNITS = ['fl oz', 'cups', 'mL'];

function mlToUnit(ml, unit) {
  if (unit === 'fl oz') return (ml / 29.574).toFixed(1);
  if (unit === 'cups')  return (ml / 236.588).toFixed(2);
  return Math.round(ml);
}

function unitToMl(val, unit) {
  const n = parseFloat(val) || 0;
  if (unit === 'fl oz') return Math.round(n * 29.574);
  if (unit === 'cups')  return Math.round(n * 236.588);
  return Math.round(n);
}

const DAILY_GOAL_ML = 2400;

export default function HydrationFridge({ data, upd }) {
  const today = new Date().toISOString().split('T')[0];
  const logs  = (data.hydrationLogs || []).filter(l => l.date === today);
  const total = logs.reduce((s, l) => s + (l.ml || 0), 0);
  const pct   = Math.min(100, Math.round((total / DAILY_GOAL_ML) * 100));

  const [unit, setUnit]           = useState('fl oz');
  const [amounts, setAmounts]     = useState({});
  const [showCustom, setShowCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ label:'', icon:'◇', ml:237, color:'#a78bfa' });
  const [sizePickerId, setSizePickerId] = useState(null);

  const fridgeItems = data.customDrinks
    ? [...DEFAULT_FRIDGE, ...data.customDrinks]
    : DEFAULT_FRIDGE;

  const addDrink = item => {
    const ml = amounts[item.id] !== undefined ? unitToMl(amounts[item.id], unit) : item.ml;
    const entry = { id: Math.random().toString(36).slice(2), date: today, ...item, ml, timestamp: Date.now() };
    upd('hydrationLogs', [...(data.hydrationLogs || []), entry]);
  };

  const pickSize = (itemId, ml) => {
    setAmounts(a => ({ ...a, [itemId]: mlToUnit(ml, unit) }));
    setSizePickerId(null);
  };

  const saveCustomDrink = () => {
    if (!customForm.label) return;
    const drink = { ...customForm, id: 'custom_' + Date.now(), ml: unitToMl(customForm.ml, unit) };
    upd('customDrinks', [...(data.customDrinks||[]), drink]);
    setCustomForm({ label:'', icon:'◇', ml:237, color:'#a78bfa' });
    setShowCustom(false);
  };

  const undo = () => {
    const all = data.hydrationLogs || [];
    const todayLogs = all.filter(l => l.date === today);
    if (!todayLogs.length) return;
    const last = todayLogs[todayLogs.length - 1];
    upd('hydrationLogs', all.filter(l => l.id !== last.id));
  };

  const waterColor = pct >= 80 ? '#6ee7b7' : pct >= 50 ? '#93c5fd' : pct >= 25 ? '#C9A84C' : '#f87171';

  // Pitcher fill geometry — realistic glass pitcher
  // Pitcher body: 100px wide at rim, 88px at base, 220px tall
  const PITCH_H = 200;
  const fillH = Math.round((pct / 100) * (PITCH_H - 20)); // 20px for base curve
  const waterY = PITCH_H - 8 - fillH; // from top of SVG coords

  const totalDisplay = mlToUnit(total, unit);
  const goalDisplay  = mlToUnit(DAILY_GOAL_ML, unit);
  const unitLabel    = unit === 'cups' ? 'cups' : unit === 'fl oz' ? 'fl oz' : 'mL';

  return (
    <div className="glass-card-static" style={{ padding:24 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:'#C9A84C' }}>Hydration Station</div>
        {/* Unit selector */}
        <div style={{ display:'flex', gap:4, background:'rgba(0,0,0,.3)', borderRadius:20, padding:3, border:'1px solid rgba(42,92,173,.2)' }}>
          {UNITS.map(u => (
            <button key={u} onClick={()=>setUnit(u)} style={{ padding:'5px 12px', borderRadius:16, fontSize:13, border:'none', background:unit===u?'linear-gradient(135deg,#2A5CAD,#1E3A8A)':'transparent', color:unit===u?'#E0EFFF':'rgba(240,232,255,.38)', cursor:'pointer', fontWeight:unit===u?700:400, transition:'all .15s', fontFamily:"'DM Sans',sans-serif" }}>{u}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', gap:28, alignItems:'flex-end', marginBottom:22 }} className="two-col">
        {/* ── Realistic Glass Pitcher SVG ── */}
        <div style={{ flexShrink:0, position:'relative' }}>
          <svg width="110" height="230" viewBox="0 0 110 230"
            style={{ filter:`drop-shadow(0 8px 30px ${waterColor}33) drop-shadow(0 0 ${pct>50?'20px':'8px'} ${waterColor}${pct>50?'55':'22'})`, overflow:'visible' }}>
            <defs>
              {/* Water gradient — deeper at bottom */}
              <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={waterColor} stopOpacity="0.7"/>
                <stop offset="50%" stopColor={waterColor} stopOpacity="0.55"/>
                <stop offset="100%" stopColor={waterColor} stopOpacity="0.9"/>
              </linearGradient>
              {/* Glass body gradient — frosted */}
              <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="rgba(255,255,255,.18)"/>
                <stop offset="18%"  stopColor="rgba(255,255,255,.06)"/>
                <stop offset="80%"  stopColor="rgba(255,255,255,.04)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,.12)"/>
              </linearGradient>
              {/* Inner highlight — left side reflection */}
              <linearGradient id="hiGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,.22)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </linearGradient>
              {/* Water clip */}
              <clipPath id="pitchClip">
                <path d="M13,18 C13,18 10,18 10,21 L10,205 Q10,218 20,218 L76,218 Q86,218 86,205 L86,21 C86,18 83,18 83,18 Z"/>
              </clipPath>
              <filter id="wglow">
                <feGaussianBlur stdDeviation="2" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* ── HANDLE (D-shape right side) ── */}
            <path d="M84,55 Q108,55 108,90 Q108,130 84,130"
              fill="none" stroke="rgba(200,220,255,.3)" strokeWidth="7"
              strokeLinecap="round"/>
            {/* handle inner highlight */}
            <path d="M84,62 Q102,62 102,90 Q102,122 84,122"
              fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3"
              strokeLinecap="round"/>

            {/* ── SPOUT (upper left) ── */}
            <path d="M13,40 Q2,40 2,52 Q2,65 14,68"
              fill="none" stroke="rgba(200,220,255,.3)" strokeWidth="6"
              strokeLinecap="round"/>
            <path d="M13,46 Q7,46 7,52 Q7,62 14,64"
              fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="2"
              strokeLinecap="round"/>

            {/* ── PITCHER BODY (main glass) ── */}
            <path d="M13,20 C13,20 10,20 10,23 L10,205 Q10,218 20,218 L76,218 Q86,218 86,205 L86,23 C86,20 83,20 83,20 Z"
              fill="url(#glassGrad)" stroke="rgba(168,196,240,.25)" strokeWidth="1"/>

            {/* ── WATER FILL ── */}
            {pct > 0 && (
              <rect
                x="10" y={waterY} width="76" height={fillH + 13}
                fill="url(#wg)"
                clipPath="url(#pitchClip)"
                filter="url(#wglow)"
                style={{ transition:'y 1s cubic-bezier(.4,0,.2,1), height 1s cubic-bezier(.4,0,.2,1)' }}
              />
            )}

            {/* ── WATER SURFACE RIPPLE ── */}
            {pct > 2 && (
              <path
                d={`M11,${waterY} Q28,${waterY-5} 48,${waterY} Q68,${waterY+5} 85,${waterY}`}
                fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5"
                clipPath="url(#pitchClip)"
                style={{ animation:'fogDrift 4s ease-in-out infinite' }}
              />
            )}

            {/* ── MEASUREMENT TICK MARKS ── */}
            {[0.25, 0.5, 0.75].map((frac, i) => {
              const tickY = 218 - 8 - frac * (PITCH_H - 20);
              return (
                <g key={i}>
                  <line x1="80" y1={tickY} x2="86" y2={tickY}
                    stroke="rgba(168,196,240,.3)" strokeWidth="1"/>
                  <text x="77" y={tickY+4} textAnchor="end" fontSize="8"
                    fill="rgba(168,196,240,.3)" fontFamily="'DM Sans',sans-serif">
                    {Math.round(frac*100)}%
                  </text>
                </g>
              );
            })}

            {/* ── GLASS RIM (top edge) ── */}
            <ellipse cx="48" cy="20" rx="36" ry="5"
              fill="rgba(255,255,255,.06)" stroke="rgba(168,196,240,.4)" strokeWidth="1.5"/>

            {/* ── LEFT SIDE REFLECTION ── */}
            <path d="M14,25 L14,200 Q14,210 18,212"
              fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2.5"
              strokeLinecap="round"/>
            {/* thin inner highlight strip */}
            <path d="M20,28 L20,195"
              fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1"
              strokeLinecap="round"/>

            {/* ── BASE ── */}
            <ellipse cx="48" cy="213" rx="38" ry="6"
              fill="rgba(255,255,255,.04)" stroke="rgba(168,196,240,.2)" strokeWidth="1"/>

            {/* ── PERCENTAGE LABEL ── */}
            <text x="48" y={Math.max(waterY - 8, 45)}
              textAnchor="middle" fontSize="15" fontWeight="700"
              fill="rgba(255,255,255,.85)"
              fontFamily="'Cormorant Garamond',serif"
              style={{ transition:'y 1s ease' }}>
              {pct > 5 ? `${pct}%` : ''}
            </text>

            {/* ── LAZULI CREST FROSTED MARK ── */}
            <text x="48" y="14" textAnchor="middle" fontSize="6"
              fill="rgba(201,168,76,.35)" fontFamily="'DM Sans',sans-serif"
              letterSpacing="2">LAZULI CREST</text>
          </svg>
        </div>

        {/* Progress + status */}
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, color:waterColor, lineHeight:1, marginBottom:4 }}>
            {totalDisplay}
            <span style={{ fontSize:16, fontWeight:400, color:'rgba(240,232,255,.4)', marginLeft:6 }}>{unitLabel}</span>
          </div>
          <div style={{ fontSize:16, color:'rgba(240,232,255,.42)', marginBottom:8 }}>
            of {goalDisplay} {unitLabel} daily goal
          </div>
          <div style={{ background:'rgba(255,255,255,.06)', borderRadius:6, height:6, overflow:'hidden', marginBottom:12 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,#1E3A8A,${waterColor})`, borderRadius:6, transition:'width 1s ease' }}/>
          </div>
          <div style={{ fontSize:16, color:'rgba(240,232,255,.38)', marginBottom:12 }}>
            {pct>=100?'🎉 Goal reached! Outstanding.'
              :pct>=75?'Almost there — keep going!'
              :pct>=50?'Halfway — great progress!'
              :pct>=25?'Good start. Keep sipping.'
              :'Start your hydration journey.'}
          </div>
          {logs.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
              {logs.slice(-10).map((l,i) => (
                <span key={i}
                  title={`${l.label} — ${mlToUnit(l.ml,unit)} ${unitLabel}`}
                  style={{ fontSize:13, padding:'2px 9px', borderRadius:20, background:`${l.color||'#93c5fd'}18`, border:`1px solid ${l.color||'#93c5fd'}33`, color:l.color||'#93c5fd', fontFamily:"'DM Sans',sans-serif" }}>
                  {mlToUnit(l.ml,unit)}{unit==='mL'?'mL':unit==='cups'?'c':'oz'}
                </span>
              ))}
            </div>
          )}
          {logs.length > 0 && (
            <button onClick={undo} style={{ fontSize:14, color:'rgba(240,232,255,.35)', background:'transparent', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>↩ Undo last</button>
          )}
        </div>
      </div>

      {/* ── Fridge shelf ── */}
      <div style={{ borderTop:'1px solid rgba(42,92,173,.15)', paddingTop:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(201,168,76,.5)', textTransform:'uppercase', letterSpacing:1.5 }}>My Fridge — Tap to log</div>
          <button onClick={()=>setShowCustom(s=>!s)} style={{ fontSize:13, color:'rgba(201,168,76,.65)', background:'rgba(201,168,76,.07)', border:'1px solid rgba(201,168,76,.22)', borderRadius:20, padding:'4px 12px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>+ Custom drink</button>
        </div>

        {showCustom && (
          <div style={{ background:'rgba(255,255,255,.04)', borderRadius:14, padding:'14px 16px', marginBottom:14, border:'1px solid rgba(201,168,76,.15)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:9, marginBottom:10, alignItems:'center' }}>
              <input className="field" placeholder="Drink name (e.g. Coconut Water)" value={customForm.label} onChange={e=>setCustomForm(f=>({...f,label:e.target.value}))} style={{ margin:0, fontSize:15 }}/>
              <input className="field" placeholder="Icon" value={customForm.icon} onChange={e=>setCustomForm(f=>({...f,icon:e.target.value}))} style={{ margin:0, width:60, fontSize:15, textAlign:'center' }}/>
              <input className="field" type="number" placeholder={unit==='mL'?'mL':unit==='fl oz'?'fl oz':'cups'} value={customForm.ml} onChange={e=>setCustomForm(f=>({...f,ml:e.target.value}))} style={{ margin:0, width:80, fontSize:15 }}/>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-gold" style={{ fontSize:14 }} onClick={saveCustomDrink}>Add to fridge</button>
              <button className="btn btn-ghost" style={{ fontSize:14 }} onClick={()=>setShowCustom(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {fridgeItems.map(item => {
            const displayAmt = amounts[item.id] !== undefined ? amounts[item.id] : mlToUnit(item.ml, unit);
            return (
              <div key={item.id} style={{ borderRadius:14, border:`1.5px solid ${item.color}22`, background:`${item.color}0a`, textAlign:'center', overflow:'visible', position:'relative', transition:'all .18s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=item.color+'55';e.currentTarget.style.background=item.color+'14';e.currentTarget.style.transform='translateY(-3px)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=item.color+'22';e.currentTarget.style.background=item.color+'0a';e.currentTarget.style.transform='none';}}>
                <button onClick={()=>addDrink(item)} style={{ width:'100%', padding:'12px 8px 6px', background:'transparent', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  <div style={{ fontSize:22, marginBottom:4, color:item.color }}>{item.icon}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:item.color, lineHeight:1.2 }}>{item.label}</div>
                </button>
                {/* Amount + size picker */}
                <div style={{ padding:'4px 8px 10px', display:'flex', alignItems:'center', justifyContent:'center', gap:5, flexWrap:'wrap' }}>
                  <input
                    type="number"
                    value={displayAmt}
                    onChange={e=>setAmounts(a=>({...a,[item.id]:e.target.value}))}
                    onClick={e=>e.stopPropagation()}
                    style={{ width:54, padding:'3px 5px', borderRadius:7, border:'1px solid rgba(255,255,255,.1)', background:'rgba(0,0,0,.35)', color:'rgba(240,232,255,.7)', fontSize:13, textAlign:'center', fontFamily:"'DM Sans',sans-serif" }}
                  />
                  <span style={{ fontSize:12, color:'rgba(240,232,255,.3)' }}>{unit==='mL'?'mL':unit==='fl oz'?'oz':'c'}</span>
                  <button onClick={e=>{e.stopPropagation();setSizePickerId(sizePickerId===item.id?null:item.id);}} style={{ fontSize:11, color:'rgba(201,168,76,.5)', background:'transparent', border:'1px solid rgba(201,168,76,.2)', borderRadius:6, padding:'2px 6px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>▾</button>
                </div>
                {/* Size preset dropdown */}
                {sizePickerId===item.id && (
                  <div style={{ position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)', background:'rgba(4,14,52,.97)', border:'1.5px solid rgba(42,92,173,.4)', borderRadius:12, padding:'8px 6px', zIndex:100, minWidth:130, boxShadow:'0 8px 32px rgba(0,0,0,.7)', marginBottom:4 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'rgba(201,168,76,.5)', textTransform:'uppercase', letterSpacing:1.2, padding:'2px 6px 6px', textAlign:'center' }}>Quick sizes</div>
                    {SIZES_ML.map(sz=>(
                      <button key={sz.label} onClick={e=>{e.stopPropagation();pickSize(item.id, sz.ml);}} style={{ display:'block', width:'100%', padding:'6px 10px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontSize:14, color:'rgba(240,232,255,.7)', fontFamily:"'DM Sans',sans-serif", borderRadius:7, transition:'all .12s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(42,92,173,.2)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        {sz.label} <span style={{ fontSize:12, color:'rgba(240,232,255,.3)', float:'right' }}>{mlToUnit(sz.ml,unit)}{unit==='mL'?'mL':unit==='fl oz'?'oz':'c'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
