import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  Download,
  Edit3,
  History,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { AuditHistoryModal } from '../components/AuditHistoryModal';

interface TransactionsPageProps {
  onSelectCustomer: (customerId: string) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({ onSelectCustomer }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GIVEN' | 'RECEIVED'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [viewingAuditTxId, setViewingAuditTxId] = useState<string | null>(null);

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const res = await api.getTransactions({
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
      });
      setTransactions(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, typeFilter, startDate, endDate]);

  const handleExportCSV = () => {
    window.location.href = api.exportCsvUrl('transactions');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">All Financial Transactions</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Complete transaction ledger with running balance and audit log trail
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Transactions CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, phone, notes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">All Types (Given & Received)</option>
              <option value="GIVEN">Given Only (Disbursements)</option>
              <option value="RECEIVED">Received Only (Repayments)</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {(search || typeFilter !== 'ALL' || startDate || endDate) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 px-4 bg-slate-50/70 border-b border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Found {transactions.length} transactions</span>
          <span className="font-mono">Chronological Audit Mode</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Previous Balance</th>
                <th className="py-3 px-4">Updated Balance</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans text-xs">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans text-xs">
                    No transactions found matching your filters.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isGiven = t.type === 'GIVEN';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isGiven
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isGiven ? 'Given' : 'Received'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans whitespace-nowrap">
                        <button
                          onClick={() => onSelectCustomer(t.customer_id)}
                          className="text-left group"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600">
                            {t.customer_name}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {t.customer_id}
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-4 font-bold whitespace-nowrap">
                        <span className={isGiven ? 'text-slate-900' : 'text-emerald-700'}>
                          {isGiven ? '-' : '+'}{formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatCurrency(t.previous_balance)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(t.updated_balance)}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600 truncate max-w-xs">
                        {t.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.audit_count && t.audit_count > 0 ? (
                            <button
                              onClick={() => setViewingAuditTxId(t.id)}
                              className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-1 font-medium"
                              title="View audit modifications"
                            >
                              <History className="w-3 h-3" />
                              <span>Edited</span>
                            </button>
                          ) : null}
                          <button
                            onClick={() => setEditingTx(t)}
                            className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <EditTransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onTransactionUpdated={loadTransactions}
      />

      <AuditHistoryModal
        isOpen={Boolean(viewingAuditTxId)}
        onClose={() => setViewingAuditTxId(null)}
        transactionId={viewingAuditTxId}
      />
    </div>
  );
};

