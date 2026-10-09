import { Transaction } from "./types";
import { getFirebaseInstance } from "./firebase";
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  writeBatch
} from "firebase/firestore";

const LOCAL_TX_KEY = "cashbook_transactions_local";

export function getLocalTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_TX_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed: Transaction[] = JSON.parse(stored);
    // Filter out previous sample dummy records
    const realOnly = parsed.filter((t) => !t.id.match(/^tx-[1-9]$/));
    if (realOnly.length !== parsed.length) {
      localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(realOnly));
    }
    return realOnly;
  } catch (e) {
    console.error("Failed to parse local transactions:", e);
    return [];
  }
}

export function saveLocalTransactions(txs: Transaction[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(txs));
}

export function subscribeToTransactions(
  onUpdate: (txs: Transaction[], isFirebase: boolean) => void,
  onError?: (err: Error) => void
): () => void {
  const { db } = getFirebaseInstance();

  if (db) {
    try {
      const q = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Transaction[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              type: data.type,
              amount: Number(data.amount) || 0,
              category: data.category || "General",
              partyName: data.partyName || "",
              paymentMethod: data.paymentMethod || "CASH",
              description: data.description || "",
              date: data.date || new Date().toISOString(),
              createdAt: data.createdAt || Date.now(),
              updatedAt: data.updatedAt,
            });
          });
          // Update local cache as well
          saveLocalTransactions(list);
          onUpdate(list, true);
        },
        (error) => {
          console.warn("Firestore listener error, falling back to local:", error);
          if (onError) onError(error);
          onUpdate(getLocalTransactions(), false);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn("Error setting up Firestore listener:", err);
      onUpdate(getLocalTransactions(), false);
      return () => {};
    }
  }

  // Fallback to local storage
  const localList = getLocalTransactions();
  onUpdate(localList, false);

  // Storage event listener for multi-tab support
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === LOCAL_TX_KEY) {
      onUpdate(getLocalTransactions(), false);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageChange);
    }
  };
}

export async function addTransaction(data: Omit<Transaction, "id" | "createdAt">): Promise<Transaction> {
  const newTx: Transaction = {
    ...data,
    id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    createdAt: Date.now(),
  };

  const { db } = getFirebaseInstance();

  if (db) {
    try {
      const docRef = await addDoc(collection(db, "transactions"), {
        type: newTx.type,
        amount: newTx.amount,
        category: newTx.category,
        partyName: newTx.partyName || "",
        paymentMethod: newTx.paymentMethod,
        description: newTx.description || "",
        date: newTx.date,
        createdAt: newTx.createdAt,
      });
      newTx.id = docRef.id;
    } catch (err) {
      console.error("Firestore add error, falling back to local save:", err);
    }
  }

  // Always update local storage
  const current = getLocalTransactions();
  const updated = [newTx, ...current.filter((t) => t.id !== newTx.id)];
  saveLocalTransactions(updated);

  return newTx;
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  const { db } = getFirebaseInstance();

  if (db) {
    try {
      const docRef = doc(db, "transactions", id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error("Firestore update error:", err);
    }
  }

  const current = getLocalTransactions();
  const updated = current.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t));
  saveLocalTransactions(updated);
}

export async function deleteTransaction(id: string): Promise<void> {
  const { db } = getFirebaseInstance();

  if (db) {
    try {
      const docRef = doc(db, "transactions", id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Firestore delete error:", err);
    }
  }

  const current = getLocalTransactions();
  const updated = current.filter((t) => t.id !== id);
  saveLocalTransactions(updated);
}

export async function syncLocalToFirebase(): Promise<{ success: boolean; count: number; error?: string }> {
  const { db } = getFirebaseInstance();
  if (!db) {
    return { success: false, count: 0, error: "Firebase is not connected yet." };
  }

  const localTxs = getLocalTransactions();
  if (localTxs.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const tx of localTxs) {
      const docRef = doc(collection(db, "transactions"));
      batch.set(docRef, {
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        partyName: tx.partyName || "",
        paymentMethod: tx.paymentMethod,
        description: tx.description || "",
        date: tx.date,
        createdAt: tx.createdAt || Date.now(),
      });
      count++;
    }

    await batch.commit();
    return { success: true, count };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, count: 0, error: err?.message || "Sync failed" };
  }
}
