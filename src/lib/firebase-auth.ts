// ====== NEON STICKMAN: FIREBASE AUTH ======
// Anonymous + Google sign-in for cloud save sync
// Auto anonymous sign-in on app load
// Mobile-friendly: uses signInWithRedirect on mobile devices

import {
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

// Detect mobile for sign-in method selection
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.matchMedia('(hover: none) and (pointer: coarse)').matches);
}

export type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAnonymous: boolean;
};

// Listener management
type AuthListener = (state: AuthState) => void;
const listeners = new Set<AuthListener>();
let currentState: AuthState = {
  user: null,
  loading: true,
  error: null,
  isAnonymous: false,
};

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  currentState = {
    user,
    loading: false,
    error: null,
    isAnonymous: user?.isAnonymous ?? false,
  };
  listeners.forEach(fn => fn(currentState));
});

export function onAuthChange(listener: AuthListener): () => void {
  listeners.add(listener);
  // Immediately call with current state
  listener(currentState);
  return () => listeners.delete(listener);
}

export function getCurrentAuthState(): AuthState {
  return currentState;
}

// Auto anonymous sign-in — called on app load
let autoSignInAttempted = false;

export async function autoSignIn(): Promise<User | null> {
  if (autoSignInAttempted) return currentState.user;
  autoSignInAttempted = true;

  // If already signed in, skip
  if (auth.currentUser) return auth.currentUser;

  try {
    const result = await signInAnonymously(auth);
    // Log analytics event for sign-in
    try {
      const { logAnalyticsEvent } = await import('./firebase');
      logAnalyticsEvent('sign_in', { method: 'anonymous' });
    } catch {
      // Analytics failure is non-critical
    }
    return result.user;
  } catch (err: any) {
    console.error('Auto anonymous sign-in failed:', err);
    autoSignInAttempted = false; // Allow retry
    return null;
  }
}

export async function signInAnon(): Promise<User | null> {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (err: any) {
    console.error('Anonymous sign-in failed:', err);
    return null;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    if (isMobileDevice()) {
      // Use redirect on mobile for better UX
      await signInWithRedirect(auth, googleProvider);
      // The result will be handled by handleRedirectResult on next page load
      return null; // Will resolve after redirect
    } else {
      // Use popup on desktop
      const result = await signInWithPopup(auth, googleProvider);
      // Log analytics event for Google sign-in
      try {
        const { logAnalyticsEvent } = await import('./firebase');
        logAnalyticsEvent('sign_in', { method: 'google' });
      } catch {
        // Analytics failure is non-critical
      }
      return result.user;
    }
  } catch (err: any) {
    // Handle common errors
    if (err.code === 'auth/popup-closed-by-user') {
      console.log('Google sign-in popup closed by user');
      return null;
    }
    if (err.code === 'auth/unauthorized-domain') {
      console.error('Google sign-in unauthorized domain. Add this domain to Firebase Auth settings.');
    }
    console.error('Google sign-in failed:', err);
    return null;
  }
}

// Handle redirect result — should be called on app load to catch
// the result of a mobile redirect sign-in
export async function handleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (err: any) {
    console.error('Redirect sign-in failed:', err);
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign out failed:', err);
  }
}

// Get user ID token for API calls
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

// Get user display info
export function getUserInfo(): { uid: string; displayName: string; email: string | null; photoURL: string | null; isAnonymous: boolean } | null {
  const user = auth.currentUser;
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName || 'NeonWarrior',
    email: user.email,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}
