import {
  Customer,
  CustomerProfile,
  CustomerWithSummary,
  DashboardSummary,
  DailyReport,
  WeeklyReport,
  Transaction,
  TransactionAuditLog,
  Loan,
  LoanCalculationResponse,
  InterestType,
  RatePeriod,
  DurationUnit,
  RepaymentFrequency,
} from '../types';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({ success: false, error: 'Invalid response from server' }));

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Network request failed');
  }

  return data;
}

export const api = {
  // Auth & PIN
  getPinStatus: () => request<{ success: boolean; pin_enabled: boolean }>('/auth/status'),
  setupPin: (pin: string) => request<{ success: boolean; message: string }>('/auth/setup-pin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  }),
  verifyPin: (pin: string) => request<{ success: boolean; verified: boolean; message: string }>('/auth/verify-pin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  }),
  changePin: (data: { currentPin?: string; newPin?: string; disable?: boolean }) => request<{ success: boolean; message: string }>('/auth/change-pin', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Customers
  getCustomers: (searchQuery?: string) => {
    const params = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
    return request<{ success: boolean; count: number; data: CustomerWithSummary[] }>(`/customers${params}`);
  },
  getCustomerProfile: (id: string) => request<{ success: boolean; data: CustomerProfile }>(`/customers/${encodeURIComponent(id)}`),
  checkCustomerId: (id: string) => request<{ success: boolean; valid: boolean; exists: boolean; normalizedId: string; message: string }>(`/customers/check-id/${encodeURIComponent(id)}`),
  checkPhone: (phone: string) => request<{ success: boolean; valid: boolean; exists: boolean; message: string }>(`/customers/check-phone/${encodeURIComponent(phone)}`),
  createCustomer: (data: { id: string; name: string; address: string; phone: string; notes?: string }) => request<{ success: boolean; message: string; data: Customer }>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCustomer: (id: string, data: { name?: string; address?: string; phone?: string; notes?: string }) => request<{ success: boolean; message: string; data: Customer }>(`/customers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Loans
  calculateLoan: (data: {
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
    startDate?: string;
  }) => request<{
    success: boolean;
    calculation: LoanCalculationResponse;
    schedule_preview: any[];
  }>('/loans/calculate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  createLoan: (data: {
    customerId: string;
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
    dateGiven: string;
    notes?: string;
  }) => request<{
    success: boolean;
    message: string;
    data: { loan: Loan; schedule: any[]; transaction: Transaction };
  }>('/loans', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getLoan: (id: string) => request<{ success: boolean; data: any }>(`/loans/${encodeURIComponent(id)}`),

  // Transactions
  getTransactions: (filters?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    type?: 'GIVEN' | 'RECEIVED';
    customerId?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.date) params.set('date', filters.date);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.customerId) params.set('customerId', filters.customerId);
    if (filters?.search) params.set('search', filters.search);
    return request<{ success: boolean; count: number; data: Transaction[] }>(`/transactions?${params.toString()}`);
  },

  recordRepayment: (data: {
    customerId: string;
    loanId?: string;
    amount: number;
    date: string;
    paymentMethod?: string;
    notes?: string;
  }) => request<{ success: boolean; message: string; data: Transaction }>('/transactions/repayment', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  editTransaction: (id: string, data: {
    amount: number;
    date: string;
    notes?: string;
    reason: string;
  }) => request<{ success: boolean; message: string; data: Transaction }>(`/transactions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  getTransactionAudit: (id: string) => request<{ success: boolean; count: number; data: TransactionAuditLog[] }>(`/transactions/${encodeURIComponent(id)}/audit`),

  // Reports
  getDashboard: () => request<{ success: boolean; data: DashboardSummary }>('/reports/dashboard'),
  getDailyReport: (date: string) => request<{ success: boolean; data: DailyReport }>(`/reports/daily?date=${date}`),
  getWeeklyReport: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return request<{ success: boolean; data: WeeklyReport }>(`/reports/weekly?${params.toString()}`);
  },

  // Backup & Admin
  downloadBackupUrl: '/api/backup/download',
  exportCsvUrl: (type: 'customers' | 'transactions' | 'loans') => `/api/backup/export/csv/${type}`,
  restoreBackup: async (file: File) => {
    const formData = new FormData();
    formData.append('backup_file', file);
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to restore database');
    }
    return json;
  },
  seedTestData: () => request<{ success: boolean; message: string }>('/backup/seed-test-data', { method: 'POST' }),
  resetDatabase: () => request<{ success: boolean; message: string }>('/backup/reset', { method: 'POST' }),
};

