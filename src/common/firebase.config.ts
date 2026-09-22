import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCJW-1fYRSz9UQNbnVotgohi4KK97fFLto",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "banco-de-imagenes-eaffd.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "banco-de-imagenes-eaffd",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "banco-de-imagenes-eaffd.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1068177317636",
  appId: process.env.FIREBASE_APP_ID || "1:1068177317636:web:e82c50bbb8fe45b0f4fa51",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-P3PYSE0F81",
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
