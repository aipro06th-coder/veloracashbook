'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Wallet, 
  CreditCard, 
  Smartphone, 
  User, 
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import { Transaction, TransactionType, PaymentMethod } from '../lib/types';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [filterMethod, setFilterMethod] = useState<'ALL' | PaymentMethod>('ALL');
  const [filterDateRange, setFilterDateRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (filterType !== 'ALL' && tx.type !== filterType) return false;

      // Method filter
      if (filterMethod !== 'ALL' && tx.paymentMethod !== filterMethod) return false;

      // Date range filter
      if (filterDateRange !== 'ALL') {
        const txDate = new Date(tx.date);
        const now = new Date();
        if (filterDateRange === 'TODAY') {
          if (txDate.toDateString() !== now.toDateString()) return false;
        } else if (filterDateRange === 'WEEK') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          if (txDate < oneWeekAgo) return false;
        } else if (filterDateRange === 'MONTH') {
          if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      // Search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesCategory = tx.category.toLowerCase().includes(q);
        const matchesParty = tx.partyName?.toLowerCase().includes(q);
        const matchesDesc = tx.description?.toLowerCase().includes(q);
        const matchesAmount = tx.amount.toString().includes(q);
        if (!matchesCategory && !matchesParty && !matchesDesc && !matchesAmount) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, search, filterType, filterMethod, filterDateRange]);

  const filteredInflow = filteredTransactions
    .filter((t) => t.type === 'IN')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredOutflow = filteredTransactions
    .filter((t) => t.type === 'OUT')
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (val: number) => 'Rs. ' + val.toLocaleString('en-PK');

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Wallet className="w-3 h-3" /> Cash
          </span>
        );
      case 'BANK':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CreditCard className="w-3 h-3" /> Bank
          </span>
        );
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Smartphone className="w-3 h-3" /> Online
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by party name, category, remark, or amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === 'ALL' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('IN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === 'IN' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              Cash In
            </button>
            <button
              onClick={() => setFilterType('OUT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === 'OUT' ? 'bg-rose-600 text-white shadow' : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              Cash Out
            </button>
          </div>
        </div>

        {/* Sub-Filters: Date Range & Payment Method */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
            </span>

            {/* Date Range Dropdown */}
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">This Month</option>
            </select>

            {/* Payment Mode Dropdown */}
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank Transfer</option>
              <option value="ONLINE">Online / Wallet</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          {/* Filtered Subtotals */}
          <div className="flex items-center gap-3 font-semibold">
            <span className="text-emerald-400">In: {formatCurrency(filteredInflow)}</span>
            <span className="text-rose-400">Out: {formatCurrency(filteredOutflow)}</span>
          </div>
        </div>
      </div>

      {/* Transaction Records List */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h4 className="text-base font-bold text-slate-300">No Transactions Found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search filters or click &ldquo;Cash In&rdquo; / &ldquo;Cash Out&rdquo; above to record a new business entry.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (visible on < md screens) */}
          <div className="md:hidden divide-y divide-slate-800/60">
            {filteredTransactions.map((tx) => {
              const isPositive = tx.type === 'IN';
              const formattedDate = new Date(tx.date).toLocaleDateString('en-PK', {
                day: 'numeric',
                month: 'short',
              });

              return (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <h4 className="font-bold text-white text-sm truncate">
                        {tx.partyName || 'Counter Cash'}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                        {tx.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{formattedDate}</span>
                      <span>•</span>
                      {getMethodBadge(tx.paymentMethod)}
                    </div>

                    {tx.description && (
                      <p className="text-xs text-slate-500 truncate mt-1">
                        {tx.description}
                      </p>
                    )}
                  </div>

                  {/* Amount & Actions */}
                  <div className="text-right shrink-0">
                    <div className={`font-black text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-1.5">
                      <button
                        onClick={() => onEdit(tx)}
                        className="p-1 rounded text-slate-400 hover:text-white"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this cash entry?')) onDelete(tx.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (hidden on < md screens) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Details / Party</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransactions.map((tx) => {
                  const isPositive = tx.type === 'IN';
                  const formattedDate = new Date(tx.date).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/40 transition-colors duration-150 group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {tx.partyName ? (
                              <>
                                <User className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{tx.partyName}</span>
                              </>
                            ) : (
                              <span className="text-slate-300">Counter Transaction</span>
                            )}
                          </div>
                          {tx.description && (
                            <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                              {tx.description}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700/60">
                          {tx.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getMethodBadge(tx.paymentMethod)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className={`font-black text-sm flex items-center justify-end gap-1 ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isPositive ? (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-rose-400" />
                          )}
                          <span>{isPositive ? '+' : '-'}{formatCurrency(tx.amount)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Edit transaction"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this cash entry?')) {
                                onDelete(tx.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
