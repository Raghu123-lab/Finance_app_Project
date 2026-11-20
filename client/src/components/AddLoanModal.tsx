import React, { useState, useEffect } from 'react';
import { X, PlusCircle, Calculator, AlertCircle, Calendar, IndianRupee, Clock, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import {
  InterestType,
  RatePeriod,
  DurationUnit,
  RepaymentFrequency,
  CustomerWithSummary,
  LoanCalculationResponse,
} from '../types';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/formatters';

interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomerId?: string;
  onLoanCreated: () => void;
}

export const AddLoanModal: React.FC<AddLoanModalProps> = ({
  isOpen,
  onClose,
  preselectedCustomerId,
  onLoanCreated,
}) => {
  const [customers, setCustomers] = useState<CustomerWithSummary[]>([]);
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [principalAmount, setPrincipalAmount] = useState<number | ''>(10000);
  const [interestType, setInterestType] = useState<InterestType>('simple');
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>('per_month');
  const [interestRate, setInterestRate] = useState<number | ''>(2);
  const [duration, setDuration] = useState<number | ''>(10);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('weeks');
  const [repaymentFrequency, setRepaymentFrequency] = useState<RepaymentFrequency>('weekly');
  const [customInstallments, setCustomInstallments] = useState<number | ''>('');
  const [manualTotalPayable, setManualTotalPayable] = useState<number | ''>('');
  const [dateGiven, setDateGiven] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');

  const [calculation, setCalculation] = useState<LoanCalculationResponse | null>(null);
  const [schedulePreview, setSchedulePreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load customer list
  useEffect(() => {
    if (isOpen) {
      api.getCustomers().then((res) => setCustomers(res.data)).catch(console.error);
      if (preselectedCustomerId) {
        setCustomerId(preselectedCustomerId);
      }
      setDateGiven(getTodayDateString());
      setError(null);
    }
  }, [isOpen, preselectedCustomerId]);

  // Recalculate preview whenever terms change
  useEffect(() => {
    if (!principalAmount || Number(principalAmount) <= 0) {
      setCalculation(null);
      setSchedulePreview([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.calculateLoan({
          principalAmount: Number(principalAmount),
          interestRate: Number(interestRate) || 0,
          interestType,
          ratePeriod,
          duration: Number(duration) || 1,
          durationUnit,
          repaymentFrequency,
          customInstallments: customInstallments ? Number(customInstallments) : undefined,
          manualTotalPayable: manualTotalPayable ? Number(manualTotalPayable) : undefined,
          startDate: dateGiven,
        });

        setCalculation(res.calculation);
        setSchedulePreview(res.schedule_preview);
      } catch (e: any) {
        console.error(e);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [
    principalAmount,
    interestRate,
    interestType,
    ratePeriod,
    duration,
    durationUnit,
    repaymentFrequency,
    customInstallments,
    manualTotalPayable,
    dateGiven,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Please select a customer.');
      return;
    }
    if (!principalAmount || Number(principalAmount) <= 0) {
      setError('Please enter a valid principal amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createLoan({
        customerId,
        principalAmount: Number(principalAmount),
        interestRate: Number(interestRate) || 0,
        interestType,
        ratePeriod,
        duration: Number(duration) || 1,
        durationUnit,
        repaymentFrequency,
        customInstallments: customInstallments ? Number(customInstallments) : undefined,
        manualTotalPayable: manualTotalPayable ? Number(manualTotalPayable) : undefined,
        dateGiven,
        notes: notes.trim() || undefined,
      });

      onLoanCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Add Loan / Money Given</h2>
              <p className="text-xs text-slate-500">Record a new lending disbursement with transparent calculation</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Customer (Required)
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={Boolean(preselectedCustomerId)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
              required
            >
              <option value="">-- Choose registered customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Principal & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Principal Amount (₹) (Required)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 50000"
                  className="w-full pl-8 pr-3.5 py-2 border border-slate-300 rounded-lg font-mono font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date Given / Disbursed
              </label>
              <input
                type="date"
                value={dateGiven}
                onChange={(e) => setDateGiven(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          {/* Interest Calculation Method & Rate */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
              <Calculator className="w-4 h-4 text-blue-600" />
              Interest Formula & Terms
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Calculation Method</label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as InterestType)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="simple">Simple / Flat Interest</option>
                  <option value="flat">Fixed Flat Rate</option>
                  <option value="manual">Manual Total Repayment</option>
                </select>
              </div>

              {interestType !== 'manual' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rate Period</label>
                    <select
                      value={ratePeriod}
                      onChange={(e) => setRatePeriod(e.target.value as RatePeriod)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option value="per_month">% Per Month</option>
                      <option value="per_annum">% Per Annum (Yearly)</option>
                      <option value="flat_total">% Flat for entire term</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Interest Rate (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 2"
                        className="w-full px-3 py-1.5 pr-8 border border-slate-300 rounded-lg text-sm font-mono font-semibold"
                        required
                      />
                      <span className="absolute right-3 top-1.5 text-slate-400 font-bold text-sm">%</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Manual Total Repayment (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1.5 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min={Number(principalAmount) || 0}
                      step="any"
                      value={manualTotalPayable}
                      onChange={(e) => setManualTotalPayable(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 55000"
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono font-semibold"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Duration and Repayment Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Duration</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono font-semibold"
                    required
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Repayment Frequency</label>
                <select
                  value={repaymentFrequency}
                  onChange={(e) => setRepaymentFrequency(e.target.value as RepaymentFrequency)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Installments Count <span className="text-slate-400 font-normal">(Auto / Override)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={customInstallments !== '' ? customInstallments : calculation?.totalInstallments || ''}
                  onChange={(e) => setCustomInstallments(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={calculation ? String(calculation.totalInstallments) : 'Auto'}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Live Calculation Summary Banner */}
          {calculation && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="text-xs font-semibold text-blue-900 mb-2">
                Calculation Summary & Breakdown:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                  <div className="text-[11px] text-slate-500">Principal</div>
                  <div className="font-bold text-slate-900 font-mono text-sm">
                    {formatCurrency(calculation.principalAmount)}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                  <div className="text-[11px] text-slate-500">Total Interest</div>
                  <div className="font-bold text-blue-700 font-mono text-sm">
                    +{formatCurrency(calculation.totalInterest)}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                  <div className="text-[11px] text-slate-500">Total Payable</div>
                  <div className="font-bold text-emerald-700 font-mono text-base">
                    {formatCurrency(calculation.totalAmountPayable)}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                  <div className="text-[11px] text-slate-500">Per Installment</div>
                  <div className="font-bold text-slate-900 font-mono text-sm">
                    {formatCurrency(calculation.installmentAmount)}
                    <span className="text-[10px] text-slate-400 font-normal block">
                      ({calculation.totalInstallments} {repaymentFrequency}s)
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2 italic font-mono">
                {calculation.description}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Loan Purpose / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Seasonal inventory purchase, Machine repair"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Disbursement transaction will be automatically generated upon saving.
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !customerId || !calculation}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                {isSubmitting ? 'Recording Loan...' : 'Confirm & Disburse'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

