import { useState, lazy, Suspense } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { AppProvider, useApp } from './contexts/AppContext';
import { 
  NAV, 
  BLANK_DATA, 
  getDailyMessage, 
  todayStr, 
  fmtDate, 
  greet, 
  timeAwareGreeting 
} from './utils/helpers'; // This matches your uploaded file

// ── Lazy-load the high-fidelity components ──────────────────────
const HydrationTracker = lazy(() => import('./components/HydrationTracker'));
const InfusionHub      = lazy(() => import('./components/InfusionHub'));
const MetabolicLab     = lazy(() => import('./components/MetabolicLab'));
const MedicalVault     = lazy(() => import('./components/MedicalVault'));
const Advocate         = lazy(() => import('./components/Advocate'));

// ... (Keep the Splash, AuthScreen, and Sidebar from the previous message)

function Dashboard({ data, upd, user, setTab }) {
  const today = todayStr();
  const name = data.profile?.name || 'Imago';
  
  // Use your specific 'timeAwareGreeting' from helpers.js
  const welcome = timeAwareGreeting(name); 

  return (
    <div className="page-fade">
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, color: '#C9A84C' }}>
          {name} 💜
        </div>
        <div style={{ color: 'rgba(240,232,255,.3)', fontSize: 13 }}>{welcome}</div>
        <div className="glass-card" style={{ marginTop: 15, fontStyle: 'italic', color: 'rgba(192,132,252,.6)' }}>
          " {getDailyMessage()} "
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 15 }}>
        {/* Infusion Status - Pulling from your specific data shape */}
        <div className="glass-card" onClick={() => setTab('infusions')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 12, color: '#C9A84C', fontWeight: 600 }}>NEXT INFUSION</div>
          <div style={{ fontSize: 20, marginTop: 5 }}>
            {data.infusions?.length > 0 ? fmtDate(data.infusions[0].date) : 'No infusions scheduled'}
          </div>
        </div>

        {/* Hydration Goal - Pulling from your hydration.goal = 8 */}
        <div className="glass-card" onClick={() => setTab('hydration')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600 }}>HYDRATION</div>
          <div style={{ fontSize: 20, marginTop: 5 }}>
            {data.hydration?.today || 0} / {data.hydration?.goal || 8} Glasses
          </div>
        </div>
      </div>
    </div>
  );
}