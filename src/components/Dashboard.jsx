import React from 'react';

export default function Dashboard({ data, setTab, user }) {
  const name = data.profile?.name || user?.displayName || 'Friend';

  return (
    <div className="page-fade">
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: '#fff' }}>
          Welcome, <span style={{ color: '#C9A84C' }}>{name}</span>
        </h1>
      </header>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="stat-card" onClick={() => setTab('symptoms')} style={{ cursor: 'pointer', padding: '20px', border: '1px solid rgba(123,47,190,0.3)', borderRadius: '12px' }}>
          <label style={{ fontSize: '11px', color: '#C9A84C' }}>SYMPTOMS</label>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{data.symptoms?.length || 0}</div>
        </div>
        <div className="stat-card" onClick={() => setTab('medications')} style={{ cursor: 'pointer', padding: '20px', border: '1px solid rgba(123,47,190,0.3)', borderRadius: '12px' }}>
          <label style={{ fontSize: '11px', color: '#C9A84C' }}>MEDICATIONS</label>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{data.medications?.length || 0}</div>
        </div>
      </div>
    </div>
  );
}