import {
  InterestType,
  RatePeriod,
  DurationUnit,
  RepaymentFrequency,
  Installment,
  InstallmentStatus
} from '../types/index.js';

export interface LoanCalculationInput {
  principalAmount: number;
  interestRate: number;
  interestType: InterestType;
  ratePeriod: RatePeriod;
  duration: number;
  durationUnit: DurationUnit;
  repaymentFrequency: RepaymentFrequency;
  customInstallments?: number;
  manualTotalInterest?: number;
  manualTotalPayable?: number;
}

export interface LoanCalculationResult {
  principalAmount: number;
  interestRate: number;
  interestType: InterestType;
  ratePeriod: RatePeriod;
  duration: number;
  durationUnit: DurationUnit;
  repaymentFrequency: RepaymentFrequency;
  totalInstallments: number;
  totalInterest: number;
  totalAmountPayable: number;
  installmentAmount: number;
  description: string;
}

/**
 * Rounds to 2 decimal places (cents/paise)
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate loan interest, total payable, and installment amounts
 */
export function calculateLoan(input: LoanCalculationInput): LoanCalculationResult {
  const principal = round2(input.principalAmount);
  const duration = Math.max(1, Math.floor(input.duration));

  // Determine total installments
  let installments = input.customInstallments && input.customInstallments > 0
    ? input.customInstallments
    : calculateDefaultInstallments(duration, input.durationUnit, input.repaymentFrequency);

  installments = Math.max(1, installments);

  let totalInterest = 0;
  let explanation = '';

  if (input.interestType === 'manual') {
    if (input.manualTotalPayable !== undefined && input.manualTotalPayable >= principal) {
      totalInterest = round2(input.manualTotalPayable - principal);
      explanation = `Manual total repayment entered: ₹${round2(input.manualTotalPayable).toLocaleString('en-IN')}`;
    } else if (input.manualTotalInterest !== undefined) {
      totalInterest = round2(input.manualTotalInterest);
      explanation = `Manual total interest entered: ₹${totalInterest.toLocaleString('en-IN')}`;
    }
  } else {
    // Simple or flat interest calculation
    const rate = input.interestRate;
    if (input.ratePeriod === 'flat_total') {
      totalInterest = round2(principal * (rate / 100));
      explanation = `Flat interest of ${rate}% on principal ₹${principal.toLocaleString('en-IN')}`;
    } else if (input.ratePeriod === 'per_month') {
      const durationInMonths = convertDurationToMonths(duration, input.durationUnit);
      totalInterest = round2(principal * (rate / 100) * durationInMonths);
      explanation = `${rate}% per month for ${durationInMonths.toFixed(1)} months on ₹${principal.toLocaleString('en-IN')}`;
    } else if (input.ratePeriod === 'per_annum') {
      const durationInYears = convertDurationToYears(duration, input.durationUnit);
      totalInterest = round2(principal * (rate / 100) * durationInYears);
      explanation = `${rate}% p.a. for ${durationInYears.toFixed(2)} years on ₹${principal.toLocaleString('en-IN')}`;
    }
  }

  const totalAmountPayable = round2(principal + totalInterest);
  const installmentAmount = round2(totalAmountPayable / installments);

  return {
    principalAmount: principal,
    interestRate: input.interestRate,
    interestType: input.interestType,
    ratePeriod: input.ratePeriod,
    duration,
    durationUnit: input.durationUnit,
    repaymentFrequency: input.repaymentFrequency,
    totalInstallments: installments,
    totalInterest,
    totalAmountPayable,
    installmentAmount,
    description: explanation,
  };
}

function calculateDefaultInstallments(
  duration: number,
  durationUnit: DurationUnit,
  frequency: RepaymentFrequency
): number {
  if (durationUnit === 'days') {
    if (frequency === 'daily') return duration;
    if (frequency === 'weekly') return Math.max(1, Math.round(duration / 7));
    if (frequency === 'monthly') return Math.max(1, Math.round(duration / 30));
  } else if (durationUnit === 'weeks') {
    if (frequency === 'daily') return duration * 7;
    if (frequency === 'weekly') return duration;
    if (frequency === 'monthly') return Math.max(1, Math.round(duration / 4));
  } else if (durationUnit === 'months') {
    if (frequency === 'daily') return duration * 30;
    if (frequency === 'weekly') return duration * 4;
    if (frequency === 'monthly') return duration;
  }
  return duration;
}

function convertDurationToMonths(duration: number, unit: DurationUnit): number {
  if (unit === 'months') return duration;
  if (unit === 'weeks') return duration / 4;
  if (unit === 'days') return duration / 30;
  return duration;
}

function convertDurationToYears(duration: number, unit: DurationUnit): number {
  if (unit === 'months') return duration / 12;
  if (unit === 'weeks') return duration / 52;
  if (unit === 'days') return duration / 365;
  return duration;
}

/**
 * Add days, weeks, or months to a YYYY-MM-DD date string
 */
export function addIntervalToDate(
  dateStr: string,
  frequency: RepaymentFrequency,
  count: number
): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (frequency === 'daily') {
    date.setDate(date.getDate() + count);
  } else if (frequency === 'weekly') {
    date.setDate(date.getDate() + count * 7);
  } else if (frequency === 'monthly') {
    date.setMonth(date.getMonth() + count);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generate installment schedule records
 */
export function generateSchedule(
  loanId: string,
  customerId: string,
  totalAmountPayable: number,
  totalInstallments: number,
  startDate: string,
  frequency: RepaymentFrequency
): Omit<Installment, 'paid_amount' | 'status' | 'paid_date'>[] {
  const schedule: Omit<Installment, 'paid_amount' | 'status' | 'paid_date'>[] = [];
  const standardAmount = round2(totalAmountPayable / totalInstallments);
  let allocatedSoFar = 0;

  for (let i = 1; i <= totalInstallments; i++) {
    const isLast = i === totalInstallments;
    const amount = isLast
      ? round2(totalAmountPayable - allocatedSoFar)
      : standardAmount;
    allocatedSoFar = round2(allocatedSoFar + amount);

    schedule.push({
      id: `INST-${loanId}-${i}`,
      loan_id: loanId,
      customer_id: customerId,
      installment_number: i,
      due_date: addIntervalToDate(startDate, frequency, i),
      expected_amount: amount,
    });
  }

  return schedule;
}

/**
 * Allocate repayments across installments and determine status
 */
export function updateInstallmentsStatus(
  installments: Installment[],
  totalAmountReceived: number,
  todayStr: string = new Date().toISOString().slice(0, 10)
): {
  updatedInstallments: Installment[];
  installmentsPaid: number;
  installmentsPartiallyPaid: number;
  nextPaymentDate: string | null;
  overallStatus: 'Paid' | 'Partially paid' | 'Pending' | 'Overdue';
} {
  let remainingPayment = totalAmountReceived;
  let paidCount = 0;
  let partialCount = 0;
  let nextDueDate: string | null = null;

  const sorted = [...installments].sort((a, b) => a.installment_number - b.installment_number);

  const updatedInstallments = sorted.map((inst) => {
    let paidAmount = 0;
    let status: InstallmentStatus = 'pending';
    let paidDate: string | undefined = undefined;

    if (remainingPayment >= inst.expected_amount) {
      paidAmount = inst.expected_amount;
      remainingPayment = round2(remainingPayment - inst.expected_amount);
      status = 'paid';
      paidCount++;
    } else if (remainingPayment > 0) {
      paidAmount = remainingPayment;
      remainingPayment = 0;
      status = 'partially_paid';
      partialCount++;
      if (!nextDueDate) {
        nextDueDate = inst.due_date;
      }
    } else {
      paidAmount = 0;
      if (inst.due_date < todayStr) {
        status = 'overdue';
      } else {
        status = 'pending';
      }
      if (!nextDueDate) {
        nextDueDate = inst.due_date;
      }
    }

    return {
      ...inst,
      paid_amount: round2(paidAmount),
      status,
      paid_date: paidDate || (status === 'paid' ? inst.paid_date : undefined),
    };
  });

  let overallStatus: 'Paid' | 'Partially paid' | 'Pending' | 'Overdue' = 'Pending';
  if (paidCount === sorted.length && sorted.length > 0) {
    overallStatus = 'Paid';
  } else if (totalAmountReceived > 0) {
    overallStatus = 'Partially paid';
  } else if (sorted.some((inst) => inst.status === 'overdue')) {
    overallStatus = 'Overdue';
  }

  return {
    updatedInstallments,
    installmentsPaid: paidCount,
    installmentsPartiallyPaid: partialCount,
    nextPaymentDate: nextDueDate,
    overallStatus,
  };
}

