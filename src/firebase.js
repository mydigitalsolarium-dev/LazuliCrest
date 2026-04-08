// ─────────────────────────────────────────────────────────────
// ADVY HEALTH — Firebase Configuration
// ─────────────────────────────────────────────────────────────
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyDRXb7UHovji6VMuYBV5tzW7GqeQq0pQ40",
  authDomain:        "advyhealth.firebaseapp.com",
  projectId:         "advyhealth",
  storageBucket:     "advyhealth.firebasestorage.app",
  messagingSenderId: "218711543226",
  appId:             "1:218711543226:web:82cf919bb3b0b4503ae183"
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
