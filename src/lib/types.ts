export type TransactionType = 'IN' | 'OUT';

export type PaymentMethod = 'CASH' | 'BANK' | 'ONLINE' | 'CHEQUE' | 'OTHER';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  partyName?: string;
  paymentMethod: PaymentMethod;
  description?: string;
  date: string; // ISO date string or YYYY-MM-DD
  createdAt: number;
  updatedAt?: number;
}

export interface Party {
  id: string;
  name: string;
  phone?: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER';
  totalGiven: number; // Cash Out to party
  totalReceived: number; // Cash In from party
  netBalance: number; // totalGiven - totalReceived or vice versa
}

export interface CashFlowSummary {
  totalIn: number;
  totalOut: number;
  netBalance: number;
  todayIn: number;
  todayOut: number;
  transactionCount: number;
}

export interface FirebaseConfigState {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
