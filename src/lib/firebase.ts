import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getFirestore, 
  Firestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  limit
} from "firebase/firestore";
import { FirebaseConfigState, Transaction } from "./types";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

const STORAGE_KEY = "cashbook_firebase_config";

const DEFAULT_CONFIG: FirebaseConfigState = {
  apiKey: "AIzaSyBKUP7GHm2dwtYAPq2GGMLh6PwSxFJOzdY",
  authDomain: "cashflow-76ae1.firebaseapp.com",
  projectId: "cashflow-76ae1",
  storageBucket: "cashflow-76ae1.firebasestorage.app",
  messagingSenderId: "808751019031",
  appId: "1:808751019031:web:87d0fe4c4568da0672d852",
};

export function getStoredFirebaseConfig(): FirebaseConfigState | null {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  
  // First check localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch {
      // ignore JSON error
    }
  }

  // Fallback to Next.js environment variables if present
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_CONFIG.authDomain,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_CONFIG.storageBucket,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_CONFIG.messagingSenderId,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || DEFAULT_CONFIG.appId,
    };
  }

  return DEFAULT_CONFIG;
}

export function saveFirebaseConfig(config: FirebaseConfigState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // Reset cached instances to re-initialize
  app = null;
  db = null;
}

export function clearFirebaseConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  app = null;
  db = null;
}

export function getFirebaseInstance(): { app: FirebaseApp | null; db: Firestore | null } {
  if (db && app) return { app, db };

  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, db: null };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    return { app, db };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return { app: null, db: null };
  }
}

export async function testFirebaseConnection(config: FirebaseConfigState): Promise<{ success: boolean; message: string }> {
  try {
    const tempAppName = `test-${Date.now()}`;
    const testApp = initializeApp(config, tempAppName);
    const testDb = getFirestore(testApp);
    
    // Quick test query
    const q = query(collection(testDb, "transactions"), limit(1));
    await getDocs(q);
    
    return { success: true, message: "Firebase connection successful! Firestore is active." };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, message: err?.message || "Failed to connect to Firebase. Check your project ID & API Key." };
  }
}
