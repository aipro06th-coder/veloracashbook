'use client';

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft,
  Scale
} from 'lucide-react';
import { CashFlowSummary } from '../lib/types';

interface StatCardsProps {
  summary: CashFlowSummary;
}

export const StatCards: React.FC<StatCardsProps> = ({ summary }) => {
  const formatCurrency = (amount: number) => {
    return 'Rs. ' + amount.toLocaleString('en-PK');
  };

  const isNetPositive = summary.netBalance >= 0;
  const todayNet = summary.todayIn - summary.todayOut;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Net Balance (Cash in Hand / Bank) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl transition-all duration-200 hover:border-slate-700">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Net Cash Balance
          </span>
          <div className={`p-2 rounded-xl ${isNetPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <Scale className="w-5 h-5" />
          </div>
        </div>
        <div className={`text-2xl sm:text-3xl font-black tracking-tight ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCurrency(summary.netBalance)}
        </div>
        <div className="mt-2 flex items-center text-xs text-slate-400 gap-1.5">
          <span className={`font-semibold ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isNetPositive ? 'Profitable' : 'Deficit'}
          </span>
          <span>• Overall business surplus</span>
        </div>
      </div>

      {/* 2. Total Cash In (آمدنی) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl transition-all duration-200 hover:border-emerald-900/50">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Total Cash In (آمدنی)
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {formatCurrency(summary.totalIn)}
        </div>
        <div className="mt-2 flex items-center text-xs text-emerald-400/90 gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>All revenue & collections</span>
        </div>
      </div>

      {/* 3. Total Cash Out (خرچہ) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl transition-all duration-200 hover:border-rose-900/50">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
            Total Cash Out (خرچہ)
          </span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          {formatCurrency(summary.totalOut)}
        </div>
        <div className="mt-2 flex items-center text-xs text-rose-400/90 gap-1">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Expenses, salaries & bills</span>
        </div>
      </div>

      {/* 4. Today's Activity */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl transition-all duration-200 hover:border-slate-700">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            Today&apos;s Net Flow
          </span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <div className={`text-2xl sm:text-3xl font-black tracking-tight ${todayNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {todayNet >= 0 ? '+' : ''}{formatCurrency(todayNet)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span className="text-emerald-400 font-medium">In: {formatCurrency(summary.todayIn)}</span>
          <span className="text-rose-400 font-medium">Out: {formatCurrency(summary.todayOut)}</span>
        </div>
      </div>
    </div>
  );
};
