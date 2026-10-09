'use client';

import React from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Lock,
  LogOut,
  UserCheck
} from 'lucide-react';
import { AppUser } from '../lib/types';

interface NavbarProps {
  isFirebaseConnected: boolean;
  currentUser?: AppUser | null;
  onLock?: () => void;
  onLogout?: () => void;
  onOpenInModal: () => void;
  onOpenOutModal: () => void;
  onOpenFirebaseModal: () => void;
  onOpenPartyModal: () => void;
  onExportCSV: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isFirebaseConnected,
  currentUser,
  onLock,
  onLogout,
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
                  Velora CashBook <span className="text-emerald-400 font-black">Factory</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Daily Hisab Kitab & Real-Time Cash Flow Ledger • {todayFormatted}
              </p>
            </div>
          </div>

          {/* Action buttons & Firebase status */}
          <div className="flex items-center gap-2 sm:gap-3">



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

            {/* User Profile & Security Actions */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
                <div
                  title={`Logged in as ${currentUser.name} (${currentUser.role})`}
                  className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="max-w-[100px] truncate">{currentUser.name}</span>
                </div>

                {onLock && (
                  <button
                    onClick={onLock}
                    title="Lock CashBook Screen"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 transition cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                )}

                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Sign Out / Logout"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
