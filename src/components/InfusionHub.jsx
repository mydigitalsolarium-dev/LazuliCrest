import React from 'react';
import { INFUSION_PREP, fmtDate } from '../utils/helpers';

export default function InfusionHub({ data, upd }) {
  const nextInfusion = data.infusions?.[0] || null;

  return (
    <div className="page-fade">
      <header style={{ marginBottom: 25 }}>
        <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 32, color: '#C9A84C' }}>Infusion Companion</h2>
        <p style={{ opacity: 0.5, fontSize: 13 }}>48-hour proactive prep and real-time logging</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: 14, color: '#C9A84C', marginBottom: 20 }}>PREP CHECKLIST</h3>
          {INFUSION_PREP.map(item => (
            <div key={item.id} style={{ display: 'flex', gap: '15px', padding: '12px 0', borderBottom: '1px solid rgba(123,47,190,0.1)' }}>
              <input 
                type="checkbox" 
                checked={nextInfusion?.prep?.includes(item.id)} 
                onChange={() => {
                  // Logic to toggle prep item in the first infusion object
                  const updatedInfusions = [...data.infusions];
                  const currentPrep = updatedInfusions[0].prep || [];
                  updatedInfusions[0].prep = currentPrep.includes(item.id) 
                    ? currentPrep.filter(id => id !== item.id) 
                    : [...currentPrep, item.id];
                  upd('infusions', updatedInfusions);
                }}
              />
              <span style={{ fontSize: 13, opacity: 0.8 }}>{item.text}</span>
            </div>
          ))}
        </div>

        <div className="glass-card" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid #C9A84C' }}>
          <h3 style={{ fontSize: 12, letterSpacing: 1 }}>NEXT APPOINTMENT</h3>
          <div style={{ fontSize: 24, margin: '15px 0', fontWeight: 700 }}>
            {nextInfusion ? fmtDate(nextInfusion.date) : 'None Scheduled'}
          </div>
          <button className="btn-gold" style={{ width: '100%' }}>Request Nurse Call</button>
        </div>
      </div>
    </div>
  );
}