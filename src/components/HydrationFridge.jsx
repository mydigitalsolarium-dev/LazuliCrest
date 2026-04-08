const FRIDGE_ITEMS = [
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
  const fillH  = Math.round((pct / 100) * 160); // px inside pitcher

  const addDrink = item => {
    const entry = { id: Math.random().toString(36).slice(2), date: today, ...item, timestamp: Date.now() };
    upd('hydrationLogs', [...(data.hydrationLogs || []), entry]);
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
          <svg width="90" height="200" viewBox="0 0 90 200" style={{ filter:'drop-shadow(0 4px 20px rgba(147,197,253,.2))' }}>
            <defs>
              <clipPath id="pitcherClip">
                <path d="M14,20 L76,20 L82,180 Q82,192 70,192 L20,192 Q8,192 8,180 Z"/>
              </clipPath>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.7"/>
                <stop offset="100%" stopColor={color} stopOpacity="0.45"/>
              </linearGradient>
            </defs>
            {/* Pitcher body */}
            <path d="M14,20 L76,20 L82,180 Q82,192 70,192 L20,192 Q8,192 8,180 Z" fill="rgba(255,255,255,.06)" stroke="rgba(147,197,253,.4)" strokeWidth="1.5"/>
            {/* Water fill — animated */}
            <rect x="8" y={192 - fillH} width="74" height={fillH} fill="url(#waterGrad)" clipPath="url(#pitcherClip)" style={{ transition:'height .8s cubic-bezier(.4,0,.2,1), y .8s cubic-bezier(.4,0,.2,1)' }}/>
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
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(201,168,76,.45)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>🧊 My Fridge — Tap to log</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {FRIDGE_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => addDrink(item)}
              style={{ padding:'10px 8px', borderRadius:13, border:`1px solid ${item.color}22`, background:`${item.color}0d`, cursor:'pointer', textAlign:'center', transition:'all .16s', fontFamily:"'DM Sans',sans-serif" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=item.color+'66';e.currentTarget.style.background=item.color+'1a';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=item.color+'22';e.currentTarget.style.background=item.color+'0d';e.currentTarget.style.transform='none';}}
            >
              <div style={{ fontSize:20, marginBottom:3 }}>{item.icon}</div>
              <div style={{ fontSize:11, fontWeight:600, color:item.color, lineHeight:1.2 }}>{item.label}</div>
              <div style={{ fontSize:10, color:'rgba(240,232,255,.3)', marginTop:1 }}>{item.ml}ml</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
