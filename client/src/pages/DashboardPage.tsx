import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  CalendarRange,
  PlusCircle,
  ArrowDownCircle,
  UserPlus,
  ArrowRight,
  Search,
  Receipt,
  Clock,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClasses } from '../utils/formatters';
import { AddCustomerModal } from '../components/AddCustomerModal';
import { AddLoanModal } from '../components/AddLoanModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { EditTransactionModal } from '../components/EditTransactionModal';

interface DashboardPageProps {
  onNavigate: (tab: string, customerId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Modals
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any | null>(null);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await api.getDashboard();
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.getCustomers(val);
      setSearchResults(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Search Bar Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time local summary of lending balances, payments, and customer accounts
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
          <button
            onClick={() => setIsAddLoanOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Give Money</span>
          </button>
          <button
            onClick={() => setIsRecordPaymentOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Receive Money</span>
          </button>
        </div>
      </div>

      {/* Prominent Customer Search Bar */}
      <div className="relative">
        <div className="flex items-center bg-white border border-slate-300 rounded-xl px-4 py-3 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by Customer ID (e.g. A001, B001), Customer Name, or Mobile Number..."
            className="w-full text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => handleSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
              Clear
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map((c) => (
              <div
                key={c.id}
                onClick={() => onNavigate('customer-detail', c.id)}
                className="p-3.5 flex items-center justify-between hover:bg-blue-50/60 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-mono font-bold text-xs flex items-center justify-center border border-blue-200">
                    {c.id}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{c.phone} • {c.address}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Balance</div>
                  <div className="font-bold text-slate-900 font-mono text-sm">
                    {formatCurrency(c.financial_summary.remaining_balance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Customers */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Customers</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {isLoading ? '...' : data?.total_customers || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 group-hover:text-blue-600 font-medium">
            <span>View customer directory</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Total Amount Given */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Principal Given</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {isLoading ? '...' : formatCurrency(data?.total_given)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across all active & closed loans
          </div>
        </div>

        {/* Total Amount Received */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Collections Received</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {isLoading ? '...' : formatCurrency(data?.total_received)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total verified repayments
          </div>
        </div>

        {/* Total Outstanding Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outstanding Balance</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono">
            {isLoading ? '...' : formatCurrency(data?.total_outstanding_balance)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Payable minus collections
          </div>
        </div>
      </div>

      {/* Today's Summary & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Today's Cash Flow Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Today's Cash Flow</h3>
              <p className="text-xs text-slate-500">Money given and received today</p>
            </div>
            <button
              onClick={() => onNavigate('daily')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <span>Daily section</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Money Given Today</span>
              <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                {isLoading ? '...' : formatCurrency(data?.today_given)}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Money Received Today</span>
              <div className="text-xl font-bold text-emerald-700 font-mono mt-1">
                {isLoading ? '...' : formatCurrency(data?.today_received)}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Net Cash Flow</span>
              <div className={`text-xl font-bold font-mono mt-1 ${
                ((data?.today_received || 0) - (data?.today_given || 0)) >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                {isLoading ? '...' : formatCurrency((data?.today_received || 0) - (data?.today_given || 0))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Calculated from verified local database transactions.</span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAddLoanOpen(true)}
                className="text-blue-600 hover:underline font-medium"
              >
                + Disburse Loan
              </button>
              <span>•</span>
              <button
                onClick={() => setIsRecordPaymentOpen(true)}
                className="text-emerald-600 hover:underline font-medium"
              >
                + Record Payment
              </button>
            </div>
          </div>
        </div>

        {/* Section Shortcuts Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Section Shortcuts</h3>
            <p className="text-xs text-slate-500 mb-4">Jump directly to specialized audit sections</p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('daily')}
                className="w-full p-3 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Daily Section</div>
                    <div className="text-[11px] text-slate-500">Given vs Received by date & printable report</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('weekly')}
                className="w-full p-3 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <CalendarRange className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Weekly Section</div>
                    <div className="text-[11px] text-slate-500">Mon - Sun summary, charts, and trends</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('transactions')}
                className="w-full p-3 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">All Transactions</div>
                    <div className="text-[11px] text-slate-500">Ledger with audit correction history</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Recent Transactions</h3>
            <p className="text-xs text-slate-500">Latest financial activities recorded in the local database</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Remaining Balance</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Loading recent transactions...
                  </td>
                </tr>
              ) : !data?.recent_transactions || data.recent_transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No transactions recorded yet. Click "Add Customer" to get started.
                  </td>
                </tr>
              ) : (
                data.recent_transactions.map((t) => {
                  const isGiven = t.type === 'GIVEN';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
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
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onNavigate('customer-detail', t.customer_id)}
                          className="text-left group"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600">
                            {t.customer_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {t.customer_id} • {t.customer_phone}
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <span className={isGiven ? 'text-slate-900' : 'text-emerald-700'}>
                          {isGiven ? '-' : '+'}{formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600 whitespace-nowrap">
                        {formatCurrency(t.updated_balance)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs truncate max-w-xs">
                        {t.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setEditingTx(t)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100"
                        >
                          Edit
                        </button>
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
          loadDashboard();
          onNavigate('customer-detail', c.id);
        }}
      />

      <AddLoanModal
        isOpen={isAddLoanOpen}
        onClose={() => setIsAddLoanOpen(false)}
        onLoanCreated={loadDashboard}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onPaymentRecorded={loadDashboard}
      />

      <EditTransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onTransactionUpdated={loadDashboard}
      />
    </div>
  );
};

