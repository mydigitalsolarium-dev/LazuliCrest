import { useState } from 'react';
import { FRIDGE_ITEMS } from '../utils/helpers';

export default function HydrationTracker({ data, upd }) {
  const current = data.hydration?.today || 0;
  const goal    = data.hydration?.goal  || 8;
  const pct     = Math.min(Math.round((current / goal) * 100), 100);

  const addDrink = item => {
    const newTotal = current + item.hydration;
    const newLog   = [...(data.hydration?.log || []), { id: Date.now(), type: item.label, amount: item.hydration, time: new Date().toISOString() }];
    upd('hydration', { ...data.hydration, today: newTotal, log: newLog });
  };

  return (
    <div className="glass-card-static" style={{ padding: 18, marginBottom: 18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
        <div style={{ fontWeight:600, fontSize:14, color:'#F0E8FF' }}>?? Hydration</div>
        <div style={{ fontSize:14, fontWeight:700, color:'#60a5fa', fontFamily:"'Cormorant Garamond',serif" }}>{current.toFixed(1)} / {goal}</div>
      </div>
      <div style={{ background:'rgba(255,255,255,.06)', borderRadius:5, height:6, overflow:'hidden', marginBottom:12 }}>
        <div style={{ height:'100%', width:${pct}%, background:'linear-gradient(90deg,#60a5fa,#a78bfa)', borderRadius:5, transition:'width .4s ease' }}/>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
        {FRIDGE_ITEMS.map(item => (
          <button key={item.id} onClick={() => addDrink(item)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 11px', borderRadius:20, border:'1px solid rgba(123,47,190,.22)', background:'rgba(255,255,255,.03)', color:'rgba(240,232,255,.7)', cursor:'pointer', fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
            <span>{item.emoji}</span> {item.label}
          </button>
        ))}
        <button onClick={() => upd('hydration', { ...data.hydration, today: 0, log: [] })} style={{ padding:'6px 11px', borderRadius:20, border:'1px solid rgba(255,80,80,.2)', background:'transparent', color:'rgba(255,128,128,.6)', cursor:'pointer', fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>Reset</button>
      </div>
    </div>
  );
}
