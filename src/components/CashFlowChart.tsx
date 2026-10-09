'use client';

import React, { useMemo } from 'react';
import { Transaction } from '../lib/types';
import { PieChart, BarChart3, Wallet, CreditCard, Smartphone } from 'lucide-react';

interface CashFlowChartProps {
  transactions: Transaction[];
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ transactions }) => {
  // Aggregate payment methods breakdown
  const paymentBreakdown = useMemo(() => {
    const acc = { CASH: 0, BANK: 0, ONLINE: 0, CHEQUE: 0, OTHER: 0 };
    transactions.forEach((t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.amount;
    });
    const total = Object.values(acc).reduce((a, b) => a + b, 0) || 1;
    return {
      cash: Math.round((acc.CASH / total) * 100),
      bank: Math.round((acc.BANK / total) * 100),
      online: Math.round(((acc.ONLINE + acc.CHEQUE + acc.OTHER) / total) * 100),
      cashRaw: acc.CASH,
      bankRaw: acc.BANK,
      onlineRaw: acc.ONLINE + acc.CHEQUE + acc.OTHER,
    };
  }, [transactions]);

  // Aggregate top 4 categories
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, { in: number; out: number }> = {};
    transactions.forEach((t) => {
      if (!catMap[t.category]) {
        catMap[t.category] = { in: 0, out: 0 };
      }
      if (t.type === 'IN') catMap[t.category].in += t.amount;
      else catMap[t.category].out += t.amount;
    });

    return Object.entries(catMap)
      .map(([name, val]) => ({
        name,
        total: val.in + val.out,
        in: val.in,
        out: val.out,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions]);

  // Weekly/Monthly trend calculation (last 7 days)
  const last7DaysData = useMemo(() => {
    const days: { label: string; dateStr: string; in: number; out: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ label, dateStr, in: 0, out: 0 });
    }

    transactions.forEach((t) => {
      const tDate = t.date.split('T')[0];
      const match = days.find((d) => d.dateStr === tDate);
      if (match) {
        if (t.type === 'IN') match.in += t.amount;
        else match.out += t.amount;
      }
    });

    const maxVal = Math.max(...days.map((d) => Math.max(d.in, d.out)), 1000);
    return { days, maxVal };
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 7-Day Inflow vs Outflow Visual Bar Chart */}
      <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              7-Day Cash Flow Activity
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Cash In
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Cash Out
            </span>
          </div>
        </div>

        {/* Dynamic Bars */}
        <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2">
          {last7DaysData.days.map((day, idx) => {
            const inHeight = Math.max(8, Math.round((day.in / last7DaysData.maxVal) * 100));
            const outHeight = Math.max(8, Math.round((day.out / last7DaysData.maxVal) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  {/* Inflow bar */}
                  <div
                    style={{ height: `${day.in > 0 ? inHeight : 4}%` }}
                    className={`w-1/2 max-w-[18px] rounded-t-md transition-all duration-300 ${
                      day.in > 0 ? 'bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/30' : 'bg-slate-800'
                    }`}
                    title={`In: Rs. ${day.in.toLocaleString()}`}
                  />
                  {/* Outflow bar */}
                  <div
                    style={{ height: `${day.out > 0 ? outHeight : 4}%` }}
                    className={`w-1/2 max-w-[18px] rounded-t-md transition-all duration-300 ${
                      day.out > 0 ? 'bg-rose-500 hover:bg-rose-400 shadow-md shadow-rose-500/30' : 'bg-slate-800'
                    }`}
                    title={`Out: Rs. ${day.out.toLocaleString()}`}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 mt-2">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Channels & Key Categories Breakdown */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Payment Channels
              </h3>
            </div>
            <span className="text-xs text-slate-400">Distribution</span>
          </div>

          {/* Payment Mode Pills */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-amber-400" /> Cash in Hand
                </span>
                <span className="font-semibold text-white">
                  Rs. {paymentBreakdown.cashRaw.toLocaleString()} ({paymentBreakdown.cash}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.cash}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" /> Bank Transfer
                </span>
                <span className="font-semibold text-white">
                  Rs. {paymentBreakdown.bankRaw.toLocaleString()} ({paymentBreakdown.bank}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.bank}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-purple-400" /> Online / Wallet
                </span>
                <span className="font-semibold text-white">
                  Rs. {paymentBreakdown.onlineRaw.toLocaleString()} ({paymentBreakdown.online}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${paymentBreakdown.online}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Active Category */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2">
            Top Categories
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categoryBreakdown.map((cat, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/50 flex items-center gap-1"
              >
                <span>{cat.name}</span>
                <span className="text-emerald-400 font-medium">Rs. {cat.total.toLocaleString()}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
