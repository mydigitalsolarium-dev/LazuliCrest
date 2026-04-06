import { useState, useEffect } from 'react';

export function usePersistedTab(defaultTab) {
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('advy_last_tab') || defaultTab; } 
    catch { return defaultTab; }
  });
  useEffect(() => {
    try { localStorage.setItem('advy_last_tab', tab); } catch {}
  }, [tab]);
  return [tab, setTab];
}
