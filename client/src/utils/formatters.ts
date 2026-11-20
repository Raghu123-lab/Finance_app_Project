/**
 * Format numbers in Indian Rupee currency format (₹)
 */
export function formatCurrency(amount: number | null | undefined, showDecimals: boolean = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date string (YYYY-MM-DD) into readable format
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns color classes for payment statuses
 */
export function getStatusBadgeClasses(status: string): string {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'closed':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'partially paid':
    case 'partially_paid':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'overdue':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'active':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'pending':
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}

