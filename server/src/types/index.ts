export type CustomerId = string;

export interface Customer {
  id: string; // E.g. A001
  name: string;
  address: string;
  phone: string;
  notes?: string;
  created_at: string;
}

export type InterestType = 'flat' | 'simple' | 'manual';
export type RatePeriod = 'per_month' | 'per_annum' | 'flat_total';
export type DurationUnit = 'days' | 'weeks' | 'months';
export type RepaymentFrequency = 'daily' | 'weekly' | 'monthly';
export type LoanStatus = 'active' | 'closed' | 'overdue';

export interface Loan {
  id: string;
  customer_id: string;
  principal_amount: number;
  interest_rate: number;
  interest_type: InterestType;
  rate_period: RatePeriod;
  duration: number;
  duration_unit: DurationUnit;
  repayment_frequency: RepaymentFrequency;
  total_installments: number;
  total_interest: number;
  total_amount_payable: number;
  date_given: string; // YYYY-MM-DD
  notes?: string;
  status: LoanStatus;
  created_at: string;
}

export type InstallmentStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue';

export interface Installment {
  id: string;
  loan_id: string;
  customer_id: string;
  installment_number: number;
  due_date: string; // YYYY-MM-DD
  expected_amount: number;
  paid_amount: number;
  status: InstallmentStatus;
  paid_date?: string;
}

export type TransactionType = 'GIVEN' | 'RECEIVED';

export interface Transaction {
  id: string;
  type: TransactionType;
  customer_id: string;
  loan_id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  previous_balance: number;
  updated_balance: number;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionAuditLog {
  id: string;
  transaction_id: string;
  action: 'EDIT' | 'CORRECTION';
  old_data: string; // JSON string
  new_data: string; // JSON string
  reason: string;
  created_at: string;
}

export interface CustomerFinancialSummary {
  total_given: number;
  total_interest: number;
  total_payable: number;
  total_received: number;
  remaining_balance: number;
  installments_paid: number;
  total_installments: number;
  next_payment_date: string | null;
  payment_status: 'Paid' | 'Partially paid' | 'Pending' | 'Overdue';
}

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

export interface CustomerWithSummary extends Customer {
  financial_summary: CustomerFinancialSummary;
  loans: Loan[];
}

export interface CustomerProfile extends Customer {
  financial_summary: CustomerFinancialSummary;
  loans: (Loan & {
    amount_received: number;
    remaining_balance: number;
    installments: Installment[];
  })[];
  transactions: TransactionWithDetails[];
}

export interface TransactionWithDetails extends Transaction {
  customer_name: string;
  customer_phone: string;
  audit_count?: number;
}
