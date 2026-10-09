'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { StatCards } from '../components/StatCards';
import { CashFlowChart } from '../components/CashFlowChart';
import { TransactionList } from '../components/TransactionList';
import { TransactionModal } from '../components/TransactionModal';
import { FirebaseModal } from '../components/FirebaseModal';
import { PartyLedgerModal } from '../components/PartyLedgerModal';
import { 
  Transaction, 
  TransactionType, 
  CashFlowSummary 
} from '../lib/types';
import { 
  subscribeToTransactions, 
  addTransaction, 
  updateTransaction, 
  deleteTransaction 
} from '../lib/storage';
import { getStoredFirebaseConfig } from '../lib/firebase';
import { ArrowDownLeft, ArrowUpRight, Plus, Cloud, Database } from 'lucide-react';

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('IN');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check Firebase connection status
  const checkFirebaseStatus = useCallback(() => {
    const config = getStoredFirebaseConfig();
    setIsFirebaseConnected(Boolean(config && config.apiKey && config.projectId));
  }, []);

  // Subscribe to transactions
  useEffect(() => {
    checkFirebaseStatus();
    const unsubscribe = subscribeToTransactions(
      (txs, fromFirebase) => {
        setTransactions(txs);
        setIsFirebaseConnected(fromFirebase);
        setIsLoading(false);
      },
      (error) => {
        console.warn("Storage subscription notice:", error);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [checkFirebaseStatus]);

  // Compute Cash Flow summary metrics
  const summary: CashFlowSummary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let todayIn = 0;
    let todayOut = 0;
    const todayStr = new Date().toDateString();

    transactions.forEach((tx) => {
      const isToday = new Date(tx.date).toDateString() === todayStr;
      if (tx.type === 'IN') {
        totalIn += tx.amount;
        if (isToday) todayIn += tx.amount;
      } else {
        totalOut += tx.amount;
        if (isToday) todayOut += tx.amount;
      }
    });

    return {
      totalIn,
      totalOut,
      netBalance: totalIn - totalOut,
      todayIn,
      todayOut,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  // Modal Handlers
  const handleOpenInModal = () => {
    setEditingTx(null);
    setTxModalType('IN');
    setIsTxModalOpen(true);
  };

  const handleOpenOutModal = () => {
    setEditingTx(null);
    setTxModalType('OUT');
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setTxModalType(tx.type);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTx) {
      await updateTransaction(editingTx.id, data);
    } else {
      await addTransaction(data);
    }
  };

  const handleDeleteTx = async (id: string) => {
    await deleteTransaction(id);
  };

  const handleQuickAddForParty = (partyName: string, type: TransactionType) => {
    setEditingTx({
      id: '',
      type,
      amount: 0,
      category: type === 'IN' ? 'Customer Recovery' : 'Supplier Payment',
      partyName,
      paymentMethod: 'CASH',
      date: new Date().toISOString(),
      createdAt: Date.now(),
    });
    setTxModalType(type);
    setIsTxModalOpen(true);
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['ID', 'Date', 'Type', 'Amount (PKR)', 'Category', 'Party Name', 'Payment Mode', 'Notes'];
    const rows = transactions.map((t) => [
      t.id,
      new Date(t.date).toLocaleDateString('en-PK'),
      t.type === 'IN' ? 'Cash In (آمدنی)' : 'Cash Out (خرچہ)',
      t.amount,
      `"${t.category || ''}"`,
      `"${t.partyName || ''}"`,
      t.paymentMethod,
      `"${(t.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CashBook_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        isFirebaseConnected={isFirebaseConnected}
        onOpenInModal={handleOpenInModal}
        onOpenOutModal={handleOpenOutModal}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onOpenPartyModal={() => setIsPartyModalOpen(true)}
        onExportCSV={handleExportCSV}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-24 md:pb-8">
        {/* Firebase Cloud Sync Banner if not connected */}
        {!isFirebaseConnected && (
          <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-300">
                  Firebase Cloud Sync Setup Karein
                </h4>
                <p className="text-xs text-slate-400">
                  Apne business ka data Google Cloud Firestore par realtime mehfooz karein taake mobile aur computer har jagah sync rahe.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition self-start sm:self-auto cursor-pointer"
            >
              Connect Firebase Now
            </button>
          </div>
        )}

        {/* 1. Summary Cards */}
        <StatCards summary={summary} />

        {/* 2. Visual Charts & Trends */}
        <CashFlowChart transactions={transactions} />

        {/* 3. Transaction Ledger & Filter Table */}
        <TransactionList
          transactions={transactions}
          onEdit={handleEditTx}
          onDelete={handleDeleteTx}
        />
      </main>

      {/* Native App-Style Mobile Bottom Navigation Bar (visible on mobile screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2 flex items-center justify-between gap-2 shadow-2xl">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-400 hover:text-white transition"
        >
          <Database className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] font-semibold mt-0.5">Flow</span>
        </button>

        <button
          onClick={() => setIsPartyModalOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-400 hover:text-white transition"
        >
          <span className="text-[10px] font-semibold">Khata</span>
        </button>

        {/* Big Action: Cash In (+ آمدنی) */}
        <button
          onClick={handleOpenInModal}
          className="flex-[1.4] flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-emerald-600 active:scale-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>+ In</span>
        </button>

        {/* Big Action: Cash Out (- خرچہ) */}
        <button
          onClick={handleOpenOutModal}
          className="flex-[1.4] flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-rose-600 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>- Out</span>
        </button>

        <button
          onClick={() => setIsFirebaseModalOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-1 text-slate-400 hover:text-white transition"
        >
          <span className={`w-2 h-2 rounded-full mb-1 ${isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-[10px] font-semibold">Cloud</span>
        </button>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSubmit={handleSaveTransaction}
        initialType={txModalType}
        editingTransaction={editingTx}
      />

      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onConfigUpdated={checkFirebaseStatus}
      />

      <PartyLedgerModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        transactions={transactions}
        onQuickAdd={handleQuickAddForParty}
      />
    </div>
  );
}
