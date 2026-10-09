import { AppUser, AuthSession, UserRole } from "./types";
import { getFirebaseInstance } from "./firebase";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const USERS_VAULT_KEY = "velora_users_vault";
const SESSION_KEY = "velora_auth_session";
const LOCK_STATE_KEY = "velora_lock_state";
const FAILED_ATTEMPTS_KEY = "velora_failed_attempts";

const SALT = "velora_secure_cashbook_salt_2026";

export const MASTER_CREDENTIALS = {
  username: "veloracashbook",
  password: "Peshawar@1",
  pin: "0092",
  name: "Velora CashBook",
  email: "veloracashbook@gmail.com",
};

// SHA-256 Hashing using browser Web Crypto API
export async function hashString(value: string, salt: string = SALT): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    let hash = 0;
    const combined = value + salt;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `h_${Math.abs(hash)}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(value + salt);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface StoredUserRecord {
  user: AppUser;
  passwordHash: string;
  pinHash?: string;
}

// Master user profile
export async function getMasterUserRecord(): Promise<StoredUserRecord> {
  const passwordHash = await hashString(MASTER_CREDENTIALS.password);
  const pinHash = await hashString(MASTER_CREDENTIALS.pin);

  return {
    user: {
      id: "usr-velora-owner",
      email: MASTER_CREDENTIALS.email,
      username: MASTER_CREDENTIALS.username,
      name: MASTER_CREDENTIALS.name,
      role: "OWNER",
      pin: MASTER_CREDENTIALS.pin,
      createdAt: 1741540000000,
    },
    passwordHash,
    pinHash,
  };
}

// Initialize Master User in local vault
async function ensureDefaultMasterUser(): Promise<StoredUserRecord[]> {
  if (typeof window === "undefined") return [];

  const master = await getMasterUserRecord();
  const existing = localStorage.getItem(USERS_VAULT_KEY);

  let users: StoredUserRecord[] = [];
  if (existing) {
    try {
      users = JSON.parse(existing);
    } catch {
      users = [];
    }
  }

  // Ensure veloracashbook is present and updated
  const existingIdx = users.findIndex(
    (u) => u.user.username.toLowerCase() === MASTER_CREDENTIALS.username.toLowerCase()
  );

  if (existingIdx >= 0) {
    users[existingIdx] = master;
  } else {
    users = [master];
  }

  localStorage.setItem(USERS_VAULT_KEY, JSON.stringify(users));
  return users;
}

export async function getStoredUsers(): Promise<StoredUserRecord[]> {
  return await ensureDefaultMasterUser();
}

// Failed attempts & brute-force lockout prevention
export function checkBruteForceLockout(): { locked: boolean; remainingSeconds: number } {
  if (typeof window === "undefined") return { locked: false, remainingSeconds: 0 };

  const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
  if (!raw) return { locked: false, remainingSeconds: 0 };

  try {
    const data = JSON.parse(raw);
    if (data.count >= 5) {
      const elapsed = (Date.now() - data.lastFailedTime) / 1000;
      const cooldown = 30; // 30 seconds cooldown
      if (elapsed < cooldown) {
        return { locked: true, remainingSeconds: Math.ceil(cooldown - elapsed) };
      } else {
        localStorage.removeItem(FAILED_ATTEMPTS_KEY);
      }
    }
  } catch {
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  }

  return { locked: false, remainingSeconds: 0 };
}

function recordFailedAttempt(): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
  let count = 1;
  if (raw) {
    try {
      const data = JSON.parse(raw);
      count = (data.count || 0) + 1;
    } catch {
      count = 1;
    }
  }
  localStorage.setItem(
    FAILED_ATTEMPTS_KEY,
    JSON.stringify({ count, lastFailedTime: Date.now() })
  );
}

function clearFailedAttempts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
}

// Current Session helper
export function getCurrentSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session: AuthSession = JSON.parse(raw);
    if (!session || !session.user || !session.expiresAt) return null;

    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    const isLocked = localStorage.getItem(LOCK_STATE_KEY) === "true";
    return { ...session, isLocked };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: AuthSession, rememberMe: boolean = true): void {
  if (typeof window === "undefined") return;
  const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  session.expiresAt = Date.now() + duration;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(LOCK_STATE_KEY);
  clearFailedAttempts();
}

// Login with Username/Email and Password (Connected with Firebase Auth + Local Vault)
export async function loginWithCredentials(
  identifier: string,
  password: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
  const lockout = checkBruteForceLockout();
  if (lockout.locked) {
    return {
      success: false,
      error: `Too many wrong attempts! Security cooldown active. Please wait ${lockout.remainingSeconds}s.`,
    };
  }

  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: "Please enter username and password." };
  }

  const isMasterUser =
    cleanId === MASTER_CREDENTIALS.username.toLowerCase() ||
    cleanId === MASTER_CREDENTIALS.email.toLowerCase();

  // 1. Try Firebase Authentication online if available
  let firebaseAuthSuccess = false;
  let firebaseToken: string | null = null;
  const targetEmail = cleanId.includes("@")
    ? cleanId
    : isMasterUser
    ? MASTER_CREDENTIALS.email
    : `${cleanId}@velora.com`;

  try {
    const { app, db } = getFirebaseInstance();
    if (app && typeof window !== "undefined" && navigator.onLine) {
      const auth = getAuth(app);
      try {
        const userCredential = await signInWithEmailAndPassword(auth, targetEmail, cleanPass);
        if (userCredential.user) {
          firebaseAuthSuccess = true;
          firebaseToken = await userCredential.user.getIdToken();

          // Sync user record to Firestore
          if (db) {
            try {
              const userDoc = doc(db, "users", userCredential.user.uid);
              await setDoc(
                userDoc,
                {
                  uid: userCredential.user.uid,
                  email: userCredential.user.email,
                  lastLogin: Date.now(),
                  role: isMasterUser ? "OWNER" : "ADMIN",
                },
                { merge: true }
              );
            } catch (fsErr) {
              console.warn("Firestore user sync info:", fsErr);
            }
          }
        }
      } catch (authErr: any) {
        // If master account does not exist yet in Firebase Auth, automatically create it
        if (
          (authErr.code === "auth/user-not-found" || authErr.code === "auth/invalid-credential") &&
          isMasterUser &&
          cleanPass === MASTER_CREDENTIALS.password
        ) {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, targetEmail, cleanPass);
            if (newCred.user) {
              firebaseAuthSuccess = true;
              firebaseToken = await newCred.user.getIdToken();
              if (db) {
                const userDoc = doc(db, "users", newCred.user.uid);
                await setDoc(
                  userDoc,
                  {
                    uid: newCred.user.uid,
                    email: newCred.user.email,
                    lastLogin: Date.now(),
                    role: "OWNER",
                  },
                  { merge: true }
                );
              }
            }
          } catch (createErr) {
            console.warn("Firebase Auth auto-creation info:", createErr);
          }
        } else {
          console.warn("Firebase Auth response:", authErr?.code || authErr?.message);
        }
      }
    }
  } catch (fbInitErr) {
    console.warn("Firebase Auth initialization info:", fbInitErr);
  }

  // 2. Master validation check (Succeeds via Firebase Auth or matching Master Credentials)
  if (isMasterUser && (cleanPass === MASTER_CREDENTIALS.password || firebaseAuthSuccess)) {
    const master = await getMasterUserRecord();
    const session: AuthSession = {
      token: firebaseToken || `token-master-${Date.now()}`,
      user: master.user,
      expiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
      isLocked: false,
    };
    saveSession(session, rememberMe);
    return { success: true, session };
  }

  // 3. Local vault verification for custom registered users
  const users = await getStoredUsers();
  const inputHash = await hashString(cleanPass);

  const matched = users.find(
    (u) =>
      u.user.username.toLowerCase() === cleanId ||
      u.user.email.toLowerCase() === cleanId
  );

  if (!matched && !firebaseAuthSuccess) {
    recordFailedAttempt();
    return { success: false, error: "Invalid username or password. Please check your credentials." };
  }

  if (matched && matched.passwordHash !== inputHash && !firebaseAuthSuccess) {
    recordFailedAttempt();
    return { success: false, error: "Incorrect password. Please try again." };
  }

  const userToUse: AppUser = matched
    ? matched.user
    : {
        id: `usr-${cleanId}`,
        email: targetEmail,
        username: cleanId,
        name: cleanId,
        role: "ADMIN",
        createdAt: Date.now(),
      };

  const session: AuthSession = {
    token: firebaseToken || `token-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    user: userToUse,
    expiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
    isLocked: false,
  };

  saveSession(session, rememberMe);
  return { success: true, session };
}

// Fast Quick PIN Login (0092)
export async function loginWithPin(
  pin: string,
  rememberMe: boolean = true
): Promise<{ success: boolean; error?: string; session?: AuthSession }> {
  const lockout = checkBruteForceLockout();
  if (lockout.locked) {
    return {
      success: false,
      error: `Security lock active! Please wait ${lockout.remainingSeconds}s.`,
    };
  }

  const cleanPin = pin.trim();
  if (!cleanPin) {
    return { success: false, error: "Please enter your Security PIN." };
  }

  // Direct Master PIN Check (0092)
  if (cleanPin === MASTER_CREDENTIALS.pin) {
    const master = await getMasterUserRecord();
    const session: AuthSession = {
      token: `pin-master-${Date.now()}`,
      user: master.user,
      expiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
      isLocked: false,
    };
    saveSession(session, rememberMe);

    // Sync online session ping to Firestore if online
    try {
      const { db } = getFirebaseInstance();
      if (db && typeof window !== "undefined" && navigator.onLine) {
        const userDoc = doc(db, "users", master.user.id);
        setDoc(userDoc, { ...master.user, lastPinLogin: Date.now() }, { merge: true }).catch(() => {});
      }
    } catch {}

    return { success: true, session };
  }

  const users = await getStoredUsers();
  const pinHash = await hashString(cleanPin);
  const matched = users.find((u) => u.pinHash === pinHash || u.user.pin === cleanPin);

  if (!matched) {
    recordFailedAttempt();
    return { success: false, error: "Incorrect Security PIN. Please try again." };
  }

  const session: AuthSession = {
    token: `pin-token-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    user: matched.user,
    expiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
    isLocked: false,
  };

  saveSession(session, rememberMe);
  return { success: true, session };
}

// Lock & Unlock Screen
export function lockApp(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCK_STATE_KEY, "true");
}

export async function unlockApp(credential: string): Promise<{ success: boolean; error?: string }> {
  const cleanCred = credential.trim();

  // Master check for quick unlock
  if (cleanCred === MASTER_CREDENTIALS.pin || cleanCred === MASTER_CREDENTIALS.password) {
    localStorage.removeItem(LOCK_STATE_KEY);
    return { success: true };
  }

  const currentSession = getCurrentSession();
  if (!currentSession) {
    return { success: false, error: "No active session. Please log in again." };
  }

  const users = await getStoredUsers();
  const matched = users.find((u) => u.user.id === currentSession.user.id);

  if (!matched) {
    return { success: false, error: "User profile not found in secure vault." };
  }

  const testHash = await hashString(cleanCred);
  if (testHash === matched.passwordHash || testHash === matched.pinHash || cleanCred === matched.user.pin) {
    localStorage.removeItem(LOCK_STATE_KEY);
    return { success: true };
  }

  return { success: false, error: "Incorrect password or PIN." };
}

// Logout
export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LOCK_STATE_KEY);

  try {
    const { app } = getFirebaseInstance();
    if (app) {
      const auth = getAuth(app);
      signOut(auth).catch(() => {});
    }
  } catch {}
}
