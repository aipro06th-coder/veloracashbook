'use client';

import React from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Database,
  CheckCircle2,
  Users,
  Sparkles,
  Download
} from 'lucide-react';

interface NavbarProps {
  isFirebaseConnected: boolean;
  onOpenInModal: () => void;
  onOpenOutModal: () => void;
  onOpenFirebaseModal: () => void;
  onOpenPartyModal: () => void;
  onExportCSV: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isFirebaseConnected,
  onOpenInModal,
  onOpenOutModal,
  onOpenFirebaseModal,
  onOpenPartyModal,
  onExportCSV,
}) => {
  const todayFormatted = new Intl.DateTimeFormat('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold ring-2 ring-emerald-500/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  Velora CashBook <span className="text-emerald-400 font-black">Factroy</span>
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Business Flow
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Daily Hisab Kitab & Real-Time Cash Flow Ledger • {todayFormatted}
              </p>
            </div>
          </div>

          {/* Action buttons & Firebase status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Firebase Status Badge */}
            <button
              onClick={onOpenFirebaseModal}
              title="Firebase Configuration & Sync Status"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${isFirebaseConnected
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50 hover:border-emerald-400'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/50 hover:border-amber-400'
                }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {isFirebaseConnected ? 'Firebase: Syncing' : 'Connect Firebase'}
              </span>
              <span className="md:hidden">
                {isFirebaseConnected ? 'Live' : 'Offline'}
              </span>
              {isFirebaseConnected ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>

            {/* Parties / Khata Ledger */}
            <button
              onClick={onOpenPartyModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900 text-slate-200 border border-slate-750 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
              title="Customer & Supplier Ledger (Len Den)"
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Parties & Khata</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={onExportCSV}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
              title="Export Transactions to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {/* Cash In Button (آمدنی) */}
            <button
              onClick={onOpenInModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-lg shadow-emerald-600/25 transition-all duration-150 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Cash In</span>
            </button>

            {/* Cash Out Button (خرچہ) */}
            <button
              onClick={onOpenOutModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-lg shadow-rose-600/25 transition-all duration-150 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Cash Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
