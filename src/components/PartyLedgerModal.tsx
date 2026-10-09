'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Users, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  User, 
  Plus, 
  Phone
} from 'lucide-react';
import { Transaction, TransactionType } from '../lib/types';

interface PartyLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onQuickAdd: (partyName: string, type: TransactionType) => void;
}

interface PartySummary {
  name: string;
  totalIn: number;
  totalOut: number;
  net: number; // In - Out
  txCount: number;
}

export const PartyLedgerModal: React.FC<PartyLedgerModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onQuickAdd,
}) => {
  const [search, setSearch] = useState('');

  const parties = useMemo(() => {
    const map: Record<string, PartySummary> = {};

    transactions.forEach((tx) => {
      const name = (tx.partyName || '').trim();
      if (!name) return;

      if (!map[name]) {
        map[name] = {
          name,
          totalIn: 0,
          totalOut: 0,
          net: 0,
          txCount: 0,
        };
      }

      if (tx.type === 'IN') {
        map[name].totalIn += tx.amount;
      } else {
        map[name].totalOut += tx.amount;
      }
      map[name].net = map[name].totalIn - map[name].totalOut;
      map[name].txCount += 1;
    });

    return Object.values(map).sort((a, b) => b.txCount - a.txCount);
  }, [transactions]);

  const filteredParties = useMemo(() => {
    if (!search.trim()) return parties;
    return parties.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [parties, search]);

  const formatCurrency = (val: number) => 'Rs. ' + Math.abs(val).toLocaleString('en-PK');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Parties &amp; Khata Ledger (کھاتہ / لین دین)
              </h3>
              <p className="text-xs text-slate-400">
                Customer &amp; Supplier accounts, balances, and transaction history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search party by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Party Records */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {filteredParties.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Koi party record nahi mila. Jab aap transactions mein kisi ka naam likhenge, wo yahan show hoga.
            </div>
          ) : (
            filteredParties.map((party) => {
              const isReceivable = party.net > 0; // Customer paid more or customer owes? In CashBook: If net is positive, business has collected more from them.
              return (
                <div
                  key={party.name}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                      {party.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        {party.name}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {party.txCount} entries
                        </span>
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="text-emerald-400">
                          Wasool (In): Rs. {party.totalIn.toLocaleString()}
                        </span>
                        <span className="text-rose-400">
                          Ada (Out): Rs. {party.totalOut.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Balance */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/50">
                    <div className="text-right">
                      <div className="text-[11px] uppercase font-semibold text-slate-400">
                        Net Balance
                      </div>
                      <div
                        className={`text-sm font-black ${
                          party.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {party.net >= 0 ? '+' : '-'}{formatCurrency(party.net)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onQuickAdd(party.name, 'IN');
                          onClose();
                        }}
                        className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition cursor-pointer text-xs flex items-center gap-1"
                        title="Got Cash from this party"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>In</span>
                      </button>
                      <button
                        onClick={() => {
                          onQuickAdd(party.name, 'OUT');
                          onClose();
                        }}
                        className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white transition cursor-pointer text-xs flex items-center gap-1"
                        title="Paid Cash to this party"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
