import { AppUser, AuthSession, UserRole } from "./types";
import { getFirebaseInstance } from "./firebase";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const USERS_VAULT_KEY = "velora_users_vault";
const SESSION_KEY = "velora_auth_session";
const LOCK_STATE_KEY = "velora_lock_state";
const FAILED_ATTEMPTS_KEY = "velora_failed_attempts";

const SALT = "velora_secure_cashbook_salt_2026";

// SHA-256 Hashing using browser Web Crypto API
export async function hashString(value: string, salt: string = SALT): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    // Basic fallback for environments without subtle crypto
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

// Initialize Master Admin in local vault if not exists
async function ensureDefaultMasterUser(): Promise<StoredUserRecord[]> {
  if (typeof window === "undefined") return [];

  const existing = localStorage.getItem(USERS_VAULT_KEY);
  if (existing) {
    try {
      const users: StoredUserRecord[] = JSON.parse(existing);
      if (Array.isArray(users) && users.length > 0) {
        return users;
      }
    } catch {
      // re-seed
    }
  }

  // Seed default master owner
  const defaultPasswordHash = await hashString("admin");
  const defaultPinHash = await hashString("1234");

  const defaultUserRecord: StoredUserRecord = {
    user: {
      id: "usr-master-001",
      email: "admin@velora.com",
      username: "admin",
      name: "Owner (Velora)",
      role: "OWNER",
      pin: "1234",
      createdAt: Date.now(),
    },
    passwordHash: defaultPasswordHash,
    pinHash: defaultPinHash,
  };

  const initialList = [defaultUserRecord];
  localStorage.setItem(USERS_VAULT_KEY, JSON.stringify(initialList));
  return initialList;
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
        // Cooldown passed, reset
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

    // Check if app was locked
    const isLocked = localStorage.getItem(LOCK_STATE_KEY) === "true";
    return { ...session, isLocked };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: AuthSession, rememberMe: boolean = true): void {
  if (typeof window === "undefined") return;
  const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000; // 30 days vs 8 hours
  session.expiresAt = Date.now() + duration;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(LOCK_STATE_KEY);
  clearFailedAttempts();
}

// Login with Username/Email and Password
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
    return { success: false, error: "Please enter username/email and password." };
  }

  // Try Online Firebase Auth if available and configured
  let firebaseAuthSuccess = false;
  try {
    const { app } = getFirebaseInstance();
    if (app && navigator.onLine && cleanId.includes("@")) {
      const auth = getAuth(app);
      const userCredential = await signInWithEmailAndPassword(auth, cleanId, cleanPass);
      if (userCredential.user) {
        firebaseAuthSuccess = true;
      }
    }
  } catch (fbErr: any) {
    // If Firebase Auth throws user-not-found or invalid credential, we continue to check local vault
    console.warn("Firebase Auth bypassed or returned:", fbErr?.code || fbErr?.message);
  }

  const users = await getStoredUsers();
  const inputHash = await hashString(cleanPass);

  const matched = users.find(
    (u) =>
      u.user.username.toLowerCase() === cleanId ||
      u.user.email.toLowerCase() === cleanId
  );

  if (!matched) {
    recordFailedAttempt();
    return { success: false, error: "Invalid username or email. Please check your credentials." };
  }

  if (matched.passwordHash !== inputHash && !firebaseAuthSuccess) {
    recordFailedAttempt();
    return { success: false, error: "Incorrect password. Please try again." };
  }

  const session: AuthSession = {
    token: `token-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    user: matched.user,
    expiresAt: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
    isLocked: false,
  };

  saveSession(session, rememberMe);
  return { success: true, session };
}

// Fast Quick PIN Login (e.g. 1234)
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
  const currentSession = getCurrentSession();
  if (!currentSession) {
    return { success: false, error: "No active session. Please log in again." };
  }

  const cleanCred = credential.trim();
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

// Register / Create New Account
export async function registerUser(details: {
  username: string;
  name: string;
  email: string;
  password: string;
  pin?: string;
  role?: UserRole;
}): Promise<{ success: boolean; error?: string; user?: AppUser }> {
  const users = await getStoredUsers();
  const cleanUsername = details.username.trim().toLowerCase();
  const cleanEmail = details.email.trim().toLowerCase();

  if (users.some((u) => u.user.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: "This username is already registered." };
  }
  if (users.some((u) => u.user.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: "This email address is already registered." };
  }

  const passwordHash = await hashString(details.password.trim());
  const pinHash = details.pin ? await hashString(details.pin.trim()) : undefined;

  const newUser: AppUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: details.username.trim(),
    name: details.name.trim() || details.username.trim(),
    email: cleanEmail,
    role: details.role || "ADMIN",
    pin: details.pin?.trim(),
    createdAt: Date.now(),
  };

  const newRecord: StoredUserRecord = {
    user: newUser,
    passwordHash,
    pinHash,
  };

  users.push(newRecord);
  localStorage.setItem(USERS_VAULT_KEY, JSON.stringify(users));

  return { success: true, user: newUser };
}

// Update Password
export async function updatePassword(
  userId: string,
  oldPass: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getStoredUsers();
  const index = users.findIndex((u) => u.user.id === userId);
  if (index === -1) return { success: false, error: "User not found." };

  const oldHash = await hashString(oldPass.trim());
  if (users[index].passwordHash !== oldHash) {
    return { success: false, error: "Current password does not match." };
  }

  users[index].passwordHash = await hashString(newPass.trim());
  localStorage.setItem(USERS_VAULT_KEY, JSON.stringify(users));
  return { success: true };
}

// Update PIN
export async function updatePin(
  userId: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getStoredUsers();
  const index = users.findIndex((u) => u.user.id === userId);
  if (index === -1) return { success: false, error: "User not found." };

  users[index].pinHash = await hashString(newPin.trim());
  users[index].user.pin = newPin.trim();
  localStorage.setItem(USERS_VAULT_KEY, JSON.stringify(users));

  // Update current session user info as well
  const session = getCurrentSession();
  if (session && session.user.id === userId) {
    session.user.pin = newPin.trim();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  return { success: true };
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
