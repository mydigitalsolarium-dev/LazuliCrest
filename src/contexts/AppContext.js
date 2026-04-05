import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { BLANK_DATA, isPermanentlyDeleted } from '../utils/helpers';

const AppContext = createContext(null);

const LS_KEY     = 'advy_data_v3';
const LS_TAB_KEY = 'advy_tab_v3';

// Hydrate from localStorage first so page refresh restores exact position
function loadFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveToLS(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export function AppProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData]         = useState(() => loadFromLS() || BLANK_DATA);
  const [saving, setSaving]     = useState(false);
  const [tab, setTabState]      = useState(() => localStorage.getItem(LS_TAB_KEY) || 'dashboard');
  const saveTimer               = useRef(null);
  const unsubRef                = useRef(null);

  // Persist active tab
  const setTab = useCallback(t => {
    setTabState(t);
    try { localStorage.setItem(LS_TAB_KEY, t); } catch {}
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true); });
    return () => unsub();
  }, []);

  // Firestore real-time sync
  useEffect(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (!user) { setData(BLANK_DATA); return; }
    const ref = doc(db, 'users', user.uid);
    unsubRef.current = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const fresh = { ...BLANK_DATA, ...snap.data() };
        setData(fresh);
        saveToLS(fresh);
      } else {
        const init = { ...BLANK_DATA, profile: { name: '', conditions: '', goal: '', accountType: 'self', careeName: '' } };
        setDoc(ref, init);
        setData(init);
        saveToLS(init);
      }
    }, err => console.warn('Firestore snapshot error:', err));
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [user]);

  // Debounced save (800ms) — also purges permanently deleted items
  const upd = useCallback((key, val) => {
    setData(d => {
      const next = { ...d, [key]: val };
      saveToLS(next);
      if (user) {
        clearTimeout(saveTimer.current);
        setSaving(true);
        // Purge permanently deleted items before saving
        const clean = { ...next };
        ['symptoms','medications','appointments','diary','documents','labs','vitals','glucose'].forEach(k => {
          if (Array.isArray(clean[k])) clean[k] = clean[k].filter(i => !isPermanentlyDeleted(i));
        });
        saveTimer.current = setTimeout(() => {
          setDoc(doc(db, 'users', user.uid), clean, { merge: true })
            .then(() => setSaving(false))
            .catch(() => setSaving(false));
        }, 800);
      }
      return next;
    });
  }, [user]);

  // Page-visibility restore — when user returns from another app
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        const saved = loadFromLS();
        if (saved) setData(d => ({ ...d, ...saved }));
        const savedTab = localStorage.getItem(LS_TAB_KEY);
        if (savedTab) setTabState(savedTab);
      }
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, []);

  return (
    <AppContext.Provider value={{ user, authReady, data, upd, saving, tab, setTab }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}