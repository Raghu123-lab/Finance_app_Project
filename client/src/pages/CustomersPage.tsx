import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Home,
  ArrowRight,
  PlusCircle,
  ArrowDownCircle,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerWithSummary } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClasses } from '../utils/formatters';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { AddLoanModal } from '../components/AddLoanModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';

interface CustomersPageProps {
  onSelectCustomer: (customerId: string) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ onSelectCustomer }) => {
  const [customers, setCustomers] = useState<CustomerWithSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [activeLoanCustomerId, setActiveLoanCustomerId] = useState<string | undefined>(undefined);
  const [activePaymentCustomerId, setActivePaymentCustomerId] = useState<string | undefined>(undefined);

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await api.getCustomers(searchQuery);
      setCustomers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filtered = customers.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.financial_summary.payment_status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Accounts</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Registered customer profiles, outstanding balances, and lending history
          </p>
        </div>
        <button
          onClick={() => setIsAddCustomerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID (e.g. A001), Customer Name, or Mobile Number..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="partially paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer ID</th>
                <th className="py-3 px-4 font-semibold">Name & Mobile</th>
                <th className="py-3 px-4 font-semibold">Residential Address</th>
                <th className="py-3 px-4 font-semibold">Total Given</th>
                <th className="py-3 px-4 font-semibold">Total Received</th>
                <th className="py-3 px-4 font-semibold">Outstanding Balance</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    Loading customer records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    {searchQuery
                      ? `No customers found matching "${searchQuery}".`
                      : 'No customers registered yet. Click "Add New Customer" above.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const s = c.financial_summary;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCustomer(c.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md">
                          {c.id}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-700">
                          {c.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {c.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {c.address}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                        {formatCurrency(s.total_given)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-emerald-700 whitespace-nowrap">
                        {formatCurrency(s.total_received)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className={s.remaining_balance > 0 ? 'text-rose-700' : 'text-slate-700'}>
                          {formatCurrency(s.remaining_balance)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${getStatusBadgeClasses(s.payment_status)}`}>
                          {s.payment_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveLoanCustomerId(c.id)}
                            title="Disburse new loan"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setActivePaymentCustomerId(c.id)}
                            title="Record repayment"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs"
                          >
                            <ArrowDownCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onSelectCustomer(c.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs"
                          >
                            <ArrowRight className="w-4 h-4" />
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
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onCustomerCreated={(c) => {
          loadCustomers();
          onSelectCustomer(c.id);
        }}
      />

      {activeLoanCustomerId && (
        <AddLoanModal
          isOpen={Boolean(activeLoanCustomerId)}
          onClose={() => setActiveLoanCustomerId(undefined)}
          preselectedCustomerId={activeLoanCustomerId}
          onLoanCreated={loadCustomers}
        />
      )}

      {activePaymentCustomerId && (
        <RecordPaymentModal
          isOpen={Boolean(activePaymentCustomerId)}
          onClose={() => setActivePaymentCustomerId(undefined)}
          preselectedCustomerId={activePaymentCustomerId}
          onPaymentRecorded={loadCustomers}
        />
      )}
    </div>
  );
};

