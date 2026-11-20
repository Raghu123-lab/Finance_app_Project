import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Phone,
  Home,
  Calendar,
  FileText,
  PlusCircle,
  ArrowDownCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  ChevronDown,
  ChevronUp,
  Receipt,
  Scale,
  Edit3,
  Printer,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerProfile, Transaction } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClasses } from '../utils/formatters';
import { AddLoanModal } from '../components/AddLoanModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { EditTransactionModal } from '../components/EditTransactionModal';
import { AuditHistoryModal } from '../components/AuditHistoryModal';

interface CustomerDetailPageProps {
  customerId: string;
  onBack: () => void;
}

export const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ customerId, onBack }) => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded loan schedules
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

  // Modals
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [viewingAuditTxId, setViewingAuditTxId] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.getCustomerProfile(customerId);
      setProfile(res.data);
      if (res.data.loans.length > 0 && !expandedLoanId) {
        setExpandedLoanId(res.data.loans[0].id);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load customer profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [customerId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportStatementCSV = () => {
    if (!profile) return;
    const rows = [
      ['Customer Account Statement'],
      ['Customer ID', profile.id],
      ['Customer Name', `"${profile.name}"`],
      ['Phone Number', profile.phone],
      ['Address', `"${profile.address}"`],
      ['Total Given (₹)', profile.financial_summary.total_given],
      ['Total Interest (₹)', profile.financial_summary.total_interest],
      ['Total Payable (₹)', profile.financial_summary.total_payable],
      ['Total Received (₹)', profile.financial_summary.total_received],
      ['Remaining Balance (₹)', profile.financial_summary.remaining_balance],
      ['Account Status', profile.financial_summary.payment_status],
      [],
      ['--- TRANSACTION HISTORY ---'],
      ['Date', 'Type', 'Amount (₹)', 'Previous Balance (₹)', 'Updated Balance (₹)', 'Notes'],
      ...profile.transactions.map((t) => [
        t.date,
        t.type,
        t.amount,
        t.previous_balance,
        t.updated_balance,
        `"${t.notes || ''}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `statement_${profile.id}_${profile.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm">Loading complete customer record for {customerId}...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-slate-800">Customer Not Found</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">{error || `No customer found with ID ${customerId}`}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const s = profile.financial_summary;

  return (
    <div className="space-y-6">
      {/* Back button and Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md font-mono font-bold text-sm bg-blue-100 text-blue-700 border border-blue-200">
                {profile.id}
              </span>
              <h2 className="text-2xl font-bold text-slate-900">{profile.name}</h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getStatusBadgeClasses(s.payment_status)}`}>
                {s.payment_status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered on {formatDate(profile.created_at)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePrint}
            title="Print Account Statement"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportStatementCSV}
            title="Download Statement CSV"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAddLoanOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>Disburse New Loan</span>
          </button>
          <button
            onClick={() => setIsRecordPaymentOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Customer Info and Contact Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Customer Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2.5">
            <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500 font-medium">Mobile Number</div>
              <div className="font-mono font-semibold text-slate-800">{profile.phone}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 sm:col-span-2">
            <Home className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs text-slate-500 font-medium">Residential Address</div>
              <div className="text-slate-800">{profile.address}</div>
            </div>
          </div>

          {profile.notes && (
            <div className="flex items-start gap-2.5 sm:col-span-3 pt-2 border-t border-slate-100 text-xs">
              <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium text-slate-500">Notes / Reference: </span>
                <span className="text-slate-700 italic">{profile.notes}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Financial Account Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500">Total Principal Given</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono mt-1">
              {formatCurrency(s.total_given)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500">Total Interest Calculated</span>
            <div className="text-lg sm:text-xl font-bold text-blue-700 font-mono mt-1">
              +{formatCurrency(s.total_interest)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500">Total Amount Payable</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono mt-1">
              {formatCurrency(s.total_payable)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500">Total Amount Received</span>
            <div className="text-lg sm:text-xl font-bold text-emerald-700 font-mono mt-1">
              {formatCurrency(s.total_received)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500">Remaining Balance</span>
            <div className={`text-lg sm:text-xl font-bold font-mono mt-1 ${s.remaining_balance > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
              {formatCurrency(s.remaining_balance)}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500">Completed Installments</span>
            <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono mt-1">
              {s.installments_paid} <span className="text-xs text-slate-400 font-normal">/ {s.total_installments}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs sm:col-span-2">
            <span className="text-xs text-slate-500">Next Payment Due Date</span>
            <div className="text-lg sm:text-xl font-bold font-mono mt-1 text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{s.next_payment_date ? formatDate(s.next_payment_date) : 'No pending payments'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loans & Installment Schedules */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Loan Agreements & Installment Schedules ({profile.loans.length})
        </h3>

        {profile.loans.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-sm text-slate-500">
            No loans have been recorded for this customer yet. Click "Disburse New Loan" above.
          </div>
        ) : (
          profile.loans.map((loan) => {
            const isExpanded = expandedLoanId === loan.id;
            return (
              <div key={loan.id} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div
                  onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                  className="p-4 sm:px-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                      {loan.id}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        Principal: {formatCurrency(loan.principal_amount)} • Rate: {loan.interest_rate}% ({loan.rate_period.replace('_', ' ')})
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Duration: {loan.duration} {loan.duration_unit} ({loan.repayment_frequency} repayments) • Disbursed: {formatDate(loan.date_given)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-xs text-slate-400">Balance</div>
                      <div className="font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(loan.remaining_balance)}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Installments Schedule Table */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-4 sm:p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Installment Breakdown ({loan.installments.length} installments)</span>
                      <span className="text-slate-500 font-normal">
                        Received: {formatCurrency(loan.amount_received)} / {formatCurrency(loan.total_amount_payable)}
                      </span>
                    </div>

                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Due Date</th>
                            <th className="py-2.5 px-3">Expected</th>
                            <th className="py-2.5 px-3">Paid Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {loan.installments.map((inst) => (
                            <tr key={inst.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-500">{inst.installment_number}</td>
                              <td className="py-2 px-3 text-slate-700">{formatDate(inst.due_date)}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900">{formatCurrency(inst.expected_amount)}</td>
                              <td className="py-2 px-3 text-emerald-700">{formatCurrency(inst.paid_amount)}</td>
                              <td className="py-2 px-3 font-sans">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusBadgeClasses(inst.status)}`}>
                                  {inst.status === 'partially_paid' ? 'Partial' : inst.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Chronological Complete Transaction History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Complete Transaction History</h3>
            <p className="text-xs text-slate-500">Chronological ledger of every disbursement and repayment</p>
          </div>
          <span className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-600">
            {profile.transactions.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Previous Balance</th>
                <th className="py-3 px-4 font-semibold">Updated Balance</th>
                <th className="py-3 px-4 font-semibold">Notes / Method</th>
                <th className="py-3 px-4 font-semibold text-right">Audit / Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {profile.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans text-xs">
                    No transactions recorded for this customer yet.
                  </td>
                </tr>
              ) : (
                profile.transactions.map((t) => {
                  const isGiven = t.type === 'GIVEN';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
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
                          {isGiven ? 'Given (Disbursed)' : 'Received (Payment)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold whitespace-nowrap">
                        <span className={isGiven ? 'text-slate-900' : 'text-emerald-700'}>
                          {isGiven ? '-' : '+'}{formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatCurrency(t.previous_balance)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
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
                              title="View audit edit logs"
                              className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-1 font-medium"
                            >
                              <History className="w-3 h-3" />
                              <span>Edited ({t.audit_count})</span>
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
      <AddLoanModal
        isOpen={isAddLoanOpen}
        onClose={() => setIsAddLoanOpen(false)}
        preselectedCustomerId={profile.id}
        onLoanCreated={loadProfile}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        preselectedCustomerId={profile.id}
        onPaymentRecorded={loadProfile}
      />

      <EditTransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onTransactionUpdated={loadProfile}
      />

      <AuditHistoryModal
        isOpen={Boolean(viewingAuditTxId)}
        onClose={() => setViewingAuditTxId(null)}
        transactionId={viewingAuditTxId}
      />
    </div>
  );
};

