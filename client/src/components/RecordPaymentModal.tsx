import React, { useState, useEffect } from 'react';
import { X, ArrowDownCircle, AlertCircle, IndianRupee, Calendar, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { CustomerWithSummary, Loan } from '../types';
import { formatCurrency, getTodayDateString } from '../utils/formatters';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomerId?: string;
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedCustomerId,
  onPaymentRecorded,
}) => {
  const [customers, setCustomers] = useState<CustomerWithSummary[]>([]);
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithSummary | null>(null);
  const [loanId, setLoanId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getCustomers().then((res) => {
        setCustomers(res.data);
        if (preselectedCustomerId) {
          const match = res.data.find((c) => c.id === preselectedCustomerId);
          if (match) {
            setSelectedCustomer(match);
            setCustomerId(match.id);
            if (match.loans.length > 0) {
              setLoanId(match.loans[0].id);
            }
          }
        }
      }).catch(console.error);

      setDate(getTodayDateString());
      setAmount('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, preselectedCustomerId]);

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const match = customers.find((c) => c.id === id);
    setSelectedCustomer(match || null);
    if (match && match.loans.length > 0) {
      setLoanId(match.loans[0].id);
    } else {
      setLoanId('');
    }
  };

  const currentBalance = selectedCustomer?.financial_summary.remaining_balance || 0;
  const numAmount = Number(amount) || 0;
  const previewRemaining = Math.max(0, currentBalance - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Please select a customer.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.recordRepayment({
        customerId,
        loanId: loanId || undefined,
        amount: Number(amount),
        date,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Record Money Received</h2>
              <p className="text-xs text-slate-500">Record a customer installment or partial repayment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Select Customer */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Customer (Required)
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              disabled={Boolean(preselectedCustomerId)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
              required
            >
              <option value="">-- Choose customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name} (Balance: {formatCurrency(c.financial_summary.remaining_balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Customer Balance Info Banner */}
          {selectedCustomer && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Current Outstanding Balance:</span>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {formatCurrency(currentBalance)}
                </div>
              </div>
              {selectedCustomer.financial_summary.next_payment_date && (
                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Next Payment Due:</span>
                  <div className="text-xs font-semibold text-slate-700 font-mono">
                    {selectedCustomer.financial_summary.next_payment_date}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Received (₹) (Required)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full pl-8 pr-3.5 py-2 border border-slate-300 rounded-lg font-mono font-semibold text-base focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Supports partial and full payments</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / Online</option>
                <option value="bank_transfer">Bank Transfer / Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Daily collection, Part payment"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Real-time Updated Balance Preview */}
          {selectedCustomer && numAmount > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
              <span className="text-emerald-900 font-medium">New Balance After Payment:</span>
              <span className="font-bold text-emerald-800 font-mono text-sm">
                {formatCurrency(previewRemaining)}
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !customerId || !amount || Number(amount) <= 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2"
            >
              <ArrowDownCircle className="w-4 h-4" />
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

