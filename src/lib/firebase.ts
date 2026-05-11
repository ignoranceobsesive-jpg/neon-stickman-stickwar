// ====== NEON STICKMAN: FIREBASE CONFIG ======
// Firebase integration for auth, analytics, and cloud save sync

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, logEvent as firebaseLogEvent, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyD7qhVVSmi6wc9wFTG8_mpbE42OkOzGpPk",
  authDomain: "neon-stickman-stickwar.firebaseapp.com",
  projectId: "neon-stickman-stickwar",
  storageBucket: "neon-stickman-stickwar.firebasestorage.app",
  messagingSenderId: "551814219382",
  appId: "1:551814219382:web:a62a5cfe71571b90a74157",
  measurementId: "G-X9CGN5FDGL"
};

// Initialize Firebase (prevent re-initialization in dev mode)
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Initialize Analytics (only supported in browser)
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported — non-critical
  });
}

export function getAnalyticsInstance(): Analytics | null {
  return analyticsInstance;
}

// Log an analytics event (safe to call even if analytics is not initialized)
export function logAnalyticsEvent(eventName: string, params?: Record<string, unknown>): void {
  if (analyticsInstance) {
    try {
      firebaseLogEvent(analyticsInstance, eventName, params);
    } catch {
      // Analytics logging failure is non-critical
    }
  }
}

export { app };
