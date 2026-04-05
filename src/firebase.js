import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY            || "AIzaSyDRXb7UHovji6VMuYBV5tzW7GqeQq0pQ40",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN        || "advyhealth.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID         || "advyhealth",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET     || "advyhealth.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID|| "218711543226",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID             || "1:218711543226:web:82cf919bb3b0b4503ae183",
};

const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;