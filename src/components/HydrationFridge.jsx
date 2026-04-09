import { useState } from 'react';

const DEFAULT_FRIDGE = [
  { id:'water',      label:'Water',       icon:'💧', color:'#93c5fd', ml:250  },
  { id:'matcha',     label:'Matcha',      icon:'🍵', color:'#6ee7b7', ml:240  },
  { id:'coffee',     label:'Coffee',      icon:'☕', color:'#d97706', ml:240  },
  { id:'oj',         label:'Orange Juice',icon:'🍊', color:'#f97316', ml:180  },
  { id:'electrolyte',label:'Electrolytes',icon:'⚡', color:'#C9A84C', ml:355  },
  { id:'tea',        label:'Herbal Tea',  icon:'🫖', color:'#a78bfa', ml:240  },
];

const DAILY_GOAL = 2400; // ml

export default function HydrationFridge({ data, upd }) {
  const today  = new Date().toISOString().split('T')[0];
  const logs   = (data.hydrationLogs || []).filter(l => l.date === today);
  const total  = logs.reduce((s, l) => s + (l.ml || 0), 0);
  const pct    = Math.min(100, Math.round((total / DAILY_GOAL) * 100));
  const fillH  = Math.round((pct / 100) * 160);

  // Custom amount state per fridge item
  const [amounts, setAmounts] = useState({});
  // Custom drink adder
  const [showCustom, setShowCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ label:'', icon:'🥤', ml:200, color:'#a78bfa' });

  const fridgeItems = data.customDrinks
    ? [...DEFAULT_FRIDGE, ...data.customDrinks]
    : DEFAULT_FRIDGE;

  const addDrink = item => {
    const ml = amounts[item.id] ? parseInt(amounts[item.id], 10) : item.ml;
    const entry = { id: Math.random().toString(36).slice(2), date: today, ...item, ml, timestamp: Date.now() };
    upd('hydrationLogs', [...(data.hydrationLogs || []), entry]);
  };

  const saveCustomDrink = () => {
    if (!customForm.label) return;
    const drink = { ...customForm, id: 'custom_' + Date.now(), ml: parseInt(customForm.ml,10)||200 };
    upd('customDrinks', [...(data.customDrinks||[]), drink]);
    setCustomForm({ label:'', icon:'🥤', ml:200, color:'#a78bfa' });
    setShowCustom(false);
  };

  const undo = () => {
    const all = data.hydrationLogs || [];
    const todayLogs = all.filter(l => l.date === today);
    if (!todayLogs.length) return;
    const last = todayLogs[todayLogs.length - 1];
    upd('hydrationLogs', all.filter(l => l.id !== last.id));
  };

  const color = pct >= 80 ? '#6ee7b7' : pct >= 50 ? '#93c5fd' : pct >= 25 ? '#C9A84C' : '#f87171';

  return (
    <div className="glass-card-static" style={{ padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'#C9A84C' }}>💧 Hydration</div>
        <div style={{ fontSize:12, color:'rgba(240,232,255,.38)' }}>{Math.round(total/1000*10)/10}L of {DAILY_GOAL/1000}L goal</div>
      </div>

      <div style={{ display:'flex', gap:24, alignItems:'flex-end', marginBottom:20 }} className="two-col">
        {/* Glass pitcher SVG */}
        <div style={{ flexShrink:0, position:'relative' }}>
          <svg width="90" height="200" viewBox="0 0 90 200" style={{ filter:`drop-shadow(0 4px 20px ${color}44) drop-shadow(0 0 ${pct > 50 ? '16px' : '4px'} ${color}${pct > 50 ? '66' : '22'})` }}>
            <defs>
              <clipPath id="pitcherClip">
                <path d="M14,20 L76,20 L82,180 Q82,192 70,192 L20,192 Q8,192 8,180 Z"/>
              </clipPath>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.85"/>
                <stop offset="60%" stopColor={color} stopOpacity="0.65"/>
                <stop offset="100%" stopColor={color} stopOpacity="0.5"/>
              </linearGradient>
              <filter id="waterGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {/* Pitcher body */}
            <path d="M14,20 L76,20 L82,180 Q82,192 70,192 L20,192 Q8,192 8,180 Z" fill="rgba(255,255,255,.06)" stroke="rgba(147,197,253,.4)" strokeWidth="1.5"/>
            {/* Water fill — animated */}
            <rect x="8" y={192 - fillH} width="74" height={fillH} fill="url(#waterGrad)" clipPath="url(#pitcherClip)" filter="url(#waterGlow)" style={{ transition:'height .8s cubic-bezier(.4,0,.2,1), y .8s cubic-bezier(.4,0,.2,1)' }}/>
            {/* Water surface ripple */}
            {pct > 5 && <path d={`M8,${192-fillH} Q26,${192-fillH-4} 45,${192-fillH} Q64,${192-fillH+4} 82,${192-fillH}`} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" style={{ animation:'fogDrift 3s ease-in-out infinite' }}/>}
            {/* Handle */}
            <path d="M76,50 Q100,50 100,80 Q100,110 76,110" fill="none" stroke="rgba(147,197,253,.4)" strokeWidth="2"/>
            {/* Spout */}
            <path d="M14,30 Q0,30 0,50 Q0,65 14,65" fill="none" stroke="rgba(147,197,253,.4)" strokeWidth="2"/>
            {/* % label */}
            <text x="45" y={192-fillH/2+5} textAnchor="middle" fontSize="16" fontWeight="700" fill="rgba(255,255,255,.85)" fontFamily="'Cormorant Garamond',serif">{pct}%</text>
            {/* Frosted ADVY logo hint */}
            <text x="45" y="14" textAnchor="middle" fontSize="7" fill="rgba(201,168,76,.4)" fontFamily="'DM Sans',sans-serif" letterSpacing="2">ADVY</text>
          </svg>
        </div>

        {/* Progress + status */}
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color, lineHeight:1, marginBottom:4 }}>{total}<span style={{ fontSize:14, fontWeight:400, color:'rgba(240,232,255,.4)', marginLeft:4 }}>ml</span></div>
          <div style={{ fontSize:12, color:'rgba(240,232,255,.38)', marginBottom:10 }}>
            {pct >= 100 ? '🎉 Daily goal reached! Amazing.' : pct >= 75 ? '💪 Almost there, keep going!' : pct >= 50 ? '✨ Halfway there!' : pct >= 25 ? '💧 Good start, keep sipping.' : '🌊 Start your hydration journey today.'}
          </div>
          <div style={{ background:'rgba(255,255,255,.06)', borderRadius:6, height:6, overflow:'hidden', marginBottom:12 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, #7B2FBE, ${color})`, borderRadius:6, transition:'width .8s ease' }}/>
          </div>
          {logs.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
              {logs.slice(-8).map((l,i) => (
                <span key={i} style={{ fontSize:14 }} title={`${l.label} — ${l.ml}ml`}>{l.icon}</span>
              ))}
            </div>
          )}
          {logs.length > 0 && <button onClick={undo} style={{ fontSize:11, color:'rgba(240,232,255,.3)', background:'transparent', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>↩ Undo last</button>}
        </div>
      </div>

      {/* Mini fridge shelf */}
      <div style={{ borderTop:'1px solid rgba(123,47,190,.1)', paddingTop:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.45)', textTransform:'uppercase', letterSpacing:1.5 }}>🧊 My Fridge — Tap to log</div>
          <button onClick={()=>setShowCustom(s=>!s)} style={{ fontSize:10, color:'rgba(201,168,76,.6)', background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:20, padding:'3px 10px', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>+ Custom drink</button>
        </div>

        {showCustom && (
          <div style={{ background:'rgba(255,255,255,.04)', borderRadius:12, padding:'12px 14px', marginBottom:12, border:'1px solid rgba(201,168,76,.15)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto', gap:8, marginBottom:8, alignItems:'center' }}>
              <input className="field" placeholder="Drink name (e.g. Coconut Water)" value={customForm.label} onChange={e=>setCustomForm(f=>({...f,label:e.target.value}))} style={{ margin:0, fontSize:12 }}/>
              <input className="field" placeholder="Icon" value={customForm.icon} onChange={e=>setCustomForm(f=>({...f,icon:e.target.value}))} style={{ margin:0, width:60, fontSize:12, textAlign:'center' }}/>
              <input className="field" type="number" placeholder="ml" value={customForm.ml} onChange={e=>setCustomForm(f=>({...f,ml:e.target.value}))} style={{ margin:0, width:70, fontSize:12 }}/>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-gold" style={{ fontSize:11 }} onClick={saveCustomDrink}>Add to fridge</button>
              <button className="btn btn-ghost" style={{ fontSize:11 }} onClick={()=>setShowCustom(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {fridgeItems.map(item => (
            <div key={item.id} style={{ borderRadius:13, border:`1px solid ${item.color}22`, background:`${item.color}0d`, textAlign:'center', overflow:'hidden' }}>
              <button
                onClick={() => addDrink(item)}
                style={{ width:'100%', padding:'10px 8px 4px', background:'transparent', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}
                onMouseEnter={e=>{e.currentTarget.parentElement.style.borderColor=item.color+'66';e.currentTarget.parentElement.style.background=item.color+'1a';e.currentTarget.parentElement.style.transform='translateY(-2px)';}}
                onMouseLeave={e=>{e.currentTarget.parentElement.style.borderColor=item.color+'22';e.currentTarget.parentElement.style.background=item.color+'0d';e.currentTarget.parentElement.style.transform='none';}}
              >
                <div style={{ fontSize:20, marginBottom:3 }}>{item.icon}</div>
                <div style={{ fontSize:11, fontWeight:600, color:item.color, lineHeight:1.2 }}>{item.label}</div>
              </button>
              <div style={{ padding:'4px 8px 8px', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                <input
                  type="number"
                  value={amounts[item.id] !== undefined ? amounts[item.id] : item.ml}
                  onChange={e=>setAmounts(a=>({...a,[item.id]:e.target.value}))}
                  onClick={e=>e.stopPropagation()}
                  style={{ width:52, padding:'2px 4px', borderRadius:6, border:'1px solid rgba(255,255,255,.1)', background:'rgba(0,0,0,.3)', color:'rgba(240,232,255,.6)', fontSize:10, textAlign:'center', fontFamily:"'DM Sans',sans-serif" }}
                />
                <span style={{ fontSize:9, color:'rgba(240,232,255,.3)' }}>ml</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
