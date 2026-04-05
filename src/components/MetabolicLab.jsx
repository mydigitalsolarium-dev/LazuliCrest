import React, { useState } from 'react';
import { uid, todayStr } from '../utils/helpers';

export default function MetabolicLab({ data, upd }) {
  const [val, setVal] = useState('');

  const addGlucose = () => {
    if (!val) return;
    const entry = { id: uid(), date: todayStr(), value: val, time: new Date().toLocaleTimeString() };
    upd('glucose', [entry, ...(data.glucose || [])]);
    setVal('');
  };

  return (
    <div className="page-fade">
      <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 32, color: '#C9A84C', marginBottom: 20 }}>Metabolic Lab</h2>
      
      <div className="glass-card" style={{ maxWidth: 500, marginBottom: 20 }}>
        <label style={{ fontSize: 12, opacity: 0.6 }}>Log Blood Glucose (mg/dL)</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <input className="field" type="number" value={val} onChange={e => setVal(e.target.value)} placeholder="e.g. 95" />
          <button className="btn-gold" onClick={addGlucose}>Log</button>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ fontSize: 14, marginBottom: 15 }}>History</h3>
        {data.glucose?.map(g => (
          <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontWeight: 700 }}>{g.value} mg/dL</span>
            <span style={{ opacity: 0.4, fontSize: 12 }}>{g.date} @ {g.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}