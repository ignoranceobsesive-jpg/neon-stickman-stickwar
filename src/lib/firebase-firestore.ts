// ====== NEON STICKMAN: FIRESTORE SERVICE ======
// Cloud save sync using Firestore
//
// IMPORTANT: Firestore Security Rules must be set to test mode for development:
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /gameSaves/{userId} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//     }
//   }
// For production, restrict to authenticated users only (rule above).
// During development, you can temporarily use: allow read, write: if true;

import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { type SaveData } from './game-types';

const SAVES_COLLECTION = 'gameSaves';

// Upload local save data to Firestore
export async function uploadSaveToCloud(saveData: SaveData): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const saveRef = doc(db, SAVES_COLLECTION, user.uid);
    // Check if this is a first-time upload (no existing document)
    let isNewDoc = false;
    try {
      const existingSnap = await getDoc(saveRef);
      isNewDoc = !existingSnap.exists();
    } catch {
      // If we can't check, assume it exists (safer default)
    }
    await setDoc(saveRef, {
      ...saveData,
      userId: user.uid,
      ...(isNewDoc ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to upload save to cloud:', err);
    return false;
  }
}

// Download save data from Firestore
export async function downloadSaveFromCloud(): Promise<SaveData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const saveRef = doc(db, SAVES_COLLECTION, user.uid);
    const snapshot = await getDoc(saveRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      // Remove Firestore-specific fields
      const { userId, updatedAt, createdAt, ...saveData } = data as any;
      return saveData as SaveData;
    }
    return null;
  } catch (err) {
    console.error('Failed to download save from cloud:', err);
    return null;
  }
}

// Listen for real-time save changes (useful for multi-device sync)
export function onCloudSaveChange(callback: (saveData: SaveData | null) => void): () => void {
  const user = auth.currentUser;
  if (!user) {
    callback(null);
    return () => {};
  }

  const saveRef = doc(db, SAVES_COLLECTION, user.uid);
  const unsubscribe = onSnapshot(saveRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const { userId, updatedAt, createdAt, ...saveData } = data as any;
      callback(saveData as SaveData);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Cloud save listener error:', err);
    callback(null);
  });

  return unsubscribe;
}

// Merge local and cloud saves (take the one with higher progress)
export function mergeSaves(localSave: SaveData, cloudSave: SaveData): SaveData {
  // Strategy: Keep the save with more progress
  const localScore = localSave.totalScore;
  const cloudScore = cloudSave.totalScore;
  const localLevel = localSave.highestLevel;
  const cloudLevel = cloudSave.highestLevel;

  // If cloud has more progress, use cloud
  if (cloudLevel > localLevel || (cloudLevel === localLevel && cloudScore > localScore)) {
    return {
      ...cloudSave,
      // Keep local coins if they're higher
      totalCoins: Math.max(localSave.totalCoins, cloudSave.totalCoins),
    };
  }

  // Otherwise keep local
  return localSave;
}
