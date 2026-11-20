import React, { useState, useEffect } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Scale,
  PlusCircle,
  ArrowDownCircle,
  Printer,
  Download,
  Search,
  Edit3,
  Phone,
  History,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { DailyReport, Transaction } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';
import { AddLoanModal } from '../components/AddLoanModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { AuditHistoryModal } from '../components/AuditHistoryModal';

interface DailyPageProps {
  onSelectCustomer: (customerId: string) => void;
}

export const DailyPage: React.FC<DailyPageProps> = ({ onSelectCustomer }) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [viewingAuditTxId, setViewingAuditTxId] = useState<string | null>(null);

  const loadDailyReport = async (date: string) => {
    try {
      setIsLoading(true);
      const res = await api.getDailyReport(date);
      setReport(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDailyReport(selectedDate);
  }, [selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;
    const rows = [
      ['Section', 'Daily Financial Report'],
      ['Date', report.date],
      ['Total Given (₹)', report.summary.total_given],
      ['Total Received (₹)', report.summary.total_received],
      ['Net Cash Flow (₹)', report.summary.net_cash_flow],
      [],
      ['--- MONEY GIVEN ---'],
      ['Tx ID', 'Customer ID', 'Customer Name', 'Phone', 'Amount (₹)', 'Notes'],
      ...report.money_given.map((t) => [
        t.id,
        t.customer_id,
        `"${t.customer_name}"`,
        t.customer_phone,
        t.amount,
        `"${t.notes || ''}"`,
      ]),
      [],
      ['--- MONEY RECEIVED ---'],
      ['Tx ID', 'Customer ID', 'Customer Name', 'Phone', 'Amount (₹)', 'Notes'],
      ...report.money_received.map((t) => [
        t.id,
        t.customer_id,
        `"${t.customer_name}"`,
        t.customer_phone,
        t.amount,
        `"${t.notes || ''}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daily_report_${report.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterList = (list: Transaction[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (t) =>
        t.customer_id.toLowerCase().includes(q) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
        (t.customer_phone && t.customer_phone.includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
    );
  };

  const filteredGiven = filterList(report?.money_given || []);
  const filteredReceived = filterList(report?.money_received || []);

  const isToday = selectedDate === getTodayDateString();

  return (
    <div className="space-y-6">
      {/* Header and Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Record</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Money given, repayments received, and net cash flow for selected date
          </p>
        </div>

        {/* Date Selector & Print/Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-300 rounded-lg shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
            />
          </div>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(getTodayDateString())}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Today
            </button>
          )}

          <button
            onClick={handlePrint}
            title="Print daily sheet"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            title="Export daily CSV"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Total Money Given Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Money Given</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {isLoading ? '...' : formatCurrency(report?.summary.total_given)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{report?.summary.given_count || 0} disbursements</span>
            <button
              onClick={() => setIsAddLoanOpen(true)}
              className="text-blue-600 hover:underline font-semibold"
            >
              + Add Given
            </button>
          </div>
        </div>

        {/* 2. Total Money Received Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Money Received</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {isLoading ? '...' : formatCurrency(report?.summary.total_received)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{report?.summary.received_count || 0} collections</span>
            <button
              onClick={() => setIsRecordPaymentOpen(true)}
              className="text-emerald-600 hover:underline font-semibold"
            >
              + Add Received
            </button>
          </div>
        </div>

        {/* 3. Net Cash Flow Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Cash Flow Today</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono ${
            (report?.summary.net_cash_flow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {isLoading ? '...' : formatCurrency(report?.summary.net_cash_flow)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Money Received - Money Given
          </div>
        </div>
      </div>

      {/* Search within Date */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entries for this date by customer ID, name, or phone..."
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Two Separate Lists: Money Given & Money Received */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Money Given List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-blue-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Money Given ({filteredGiven.length})</h3>
            </div>
            <button
              onClick={() => setIsAddLoanOpen(true)}
              className="text-xs bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-blue-700 font-semibold shadow-2xs flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredGiven.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans text-xs">
                      No money given on {formatDate(selectedDate)}.
                    </td>
                  </tr>
                ) : (
                  filteredGiven.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-sans">
                        <button
                          onClick={() => onSelectCustomer(t.customer_id)}
                          className="text-left font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1.5"
                        >
                          <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                            {t.customer_id}
                          </span>
                          <span>{t.customer_name}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {t.customer_phone}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 truncate max-w-[120px]">
                        {t.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {t.audit_count && t.audit_count > 0 ? (
                            <button
                              onClick={() => setViewingAuditTxId(t.id)}
                              title="Audit history"
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => setEditingTx(t)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Money Received List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-emerald-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Money Received ({filteredReceived.length})</h3>
            </div>
            <button
              onClick={() => setIsRecordPaymentOpen(true)}
              className="text-xs bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-emerald-700 font-semibold shadow-2xs flex items-center gap-1"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredReceived.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans text-xs">
                      No money received on {formatDate(selectedDate)}.
                    </td>
                  </tr>
                ) : (
                  filteredReceived.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-sans">
                        <button
                          onClick={() => onSelectCustomer(t.customer_id)}
                          className="text-left font-semibold text-slate-900 hover:text-blue-600 flex items-center gap-1.5"
                        >
                          <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                            {t.customer_id}
                          </span>
                          <span>{t.customer_name}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {t.customer_phone}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700 whitespace-nowrap">
                        +{formatCurrency(t.amount)}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-500 truncate max-w-[120px]">
                        {t.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {t.audit_count && t.audit_count > 0 ? (
                            <button
                              onClick={() => setViewingAuditTxId(t.id)}
                              title="Audit history"
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => setEditingTx(t)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddLoanModal
        isOpen={isAddLoanOpen}
        onClose={() => setIsAddLoanOpen(false)}
        onLoanCreated={() => loadDailyReport(selectedDate)}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onPaymentRecorded={() => loadDailyReport(selectedDate)}
      />

      <EditTransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onTransactionUpdated={() => loadDailyReport(selectedDate)}
      />

      <AuditHistoryModal
        isOpen={Boolean(viewingAuditTxId)}
        onClose={() => setViewingAuditTxId(null)}
        transactionId={viewingAuditTxId}
      />
    </div>
  );
};

