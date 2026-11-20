import React, { useState, useEffect } from 'react';
import {
  CalendarRange,
  TrendingUp,
  TrendingDown,
  Scale,
  Users,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  BarChart3
} from 'lucide-react';
import { api } from '../services/api';
import { WeeklyReport } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface WeeklyPageProps {
  onSelectCustomer: (customerId: string) => void;
}

export const WeeklyPage: React.FC<WeeklyPageProps> = ({ onSelectCustomer }) => {
  // Current Monday calculation
  const getInitialMonday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return monday.toISOString().slice(0, 10);
  };

  const [weekStart, setWeekStart] = useState<string>(getInitialMonday());
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const calculateSunday = (mondayStr: string) => {
    const d = new Date(mondayStr);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  };

  const weekEnd = calculateSunday(weekStart);

  const loadWeeklyReport = async (start: string, end: string) => {
    try {
      setIsLoading(true);
      const res = await api.getWeeklyReport(start, end);
      setReport(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWeeklyReport(weekStart, weekEnd);
  }, [weekStart]);

  const handlePrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const handleNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const handleCurrentWeek = () => {
    setWeekStart(getInitialMonday());
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;
    const rows = [
      ['Section', 'Weekly Financial Report'],
      ['Week Range', `${report.week_start} to ${report.week_end}`],
      ['Total Given (₹)', report.summary.total_given],
      ['Total Received (₹)', report.summary.total_received],
      ['Net Cash Flow (₹)', report.summary.net_cash_flow],
      ['Number of Transactions', report.summary.transaction_count],
      ['Customers Who Paid', report.summary.customers_paid_count],
      ['Total Outstanding Across All Customers (₹)', report.summary.total_outstanding_balance],
      [],
      ['--- WEEKLY TRANSACTIONS ---'],
      ['Date', 'Customer ID', 'Customer Name', 'Type', 'Amount (₹)', 'Notes'],
      ...report.transactions.map((t) => [
        t.date,
        t.customer_id,
        `"${t.customer_name}"`,
        t.type,
        t.amount,
        `"${t.notes || ''}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `weekly_report_${report.week_start}_to_${report.week_end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find max value in daily breakdown for chart bar scaling
  const maxBarValue = report?.daily_breakdown.reduce((max, d) => Math.max(max, d.given, d.received), 1) || 1;

  return (
    <div className="space-y-6">
      {/* Header and Week Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Weekly Report</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Monday to Sunday summary, collection comparisons, and trend analysis
          </p>
        </div>

        {/* Week navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-blue-600" />
            <span>{formatDate(weekStart)} — {formatDate(weekEnd)}</span>
          </div>

          <button
            onClick={handleNextWeek}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleCurrentWeek}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
          >
            Current Week
          </button>

          <button
            onClick={handlePrint}
            title="Print weekly report"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs ml-1"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            title="Export CSV"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shadow-2xs"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Weekly Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Money Given */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Money Given</span>
          <div className="text-lg font-bold text-slate-900 font-mono mt-1">
            {isLoading ? '...' : formatCurrency(report?.summary.total_given)}
          </div>
        </div>

        {/* Total Money Received */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Money Received</span>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-1">
            {isLoading ? '...' : formatCurrency(report?.summary.total_received)}
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Net Cash Flow</span>
          <div className={`text-lg font-bold font-mono mt-1 ${
            (report?.summary.net_cash_flow || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}>
            {isLoading ? '...' : formatCurrency(report?.summary.net_cash_flow)}
          </div>
        </div>

        {/* Number of Transactions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Transactions</span>
          <div className="text-lg font-bold text-slate-900 font-mono mt-1">
            {isLoading ? '...' : report?.summary.transaction_count || 0}
          </div>
        </div>

        {/* Customers Paid */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Customers Paid</span>
          <div className="text-lg font-bold text-blue-700 font-mono mt-1">
            {isLoading ? '...' : report?.summary.customers_paid_count || 0}
          </div>
        </div>

        {/* Total Outstanding Across Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Outstanding</span>
          <div className="text-lg font-bold text-rose-700 font-mono mt-1">
            {isLoading ? '...' : formatCurrency(report?.summary.total_outstanding_balance)}
          </div>
        </div>
      </div>

      {/* Simple Weekly Chart (Money Given vs Money Received) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              Daily Money Flow Comparison (Mon — Sun)
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
              <span className="text-slate-600 font-medium">Given (Disbursed)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
              <span className="text-slate-600 font-medium">Received (Collections)</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-4 pb-2">
          {report?.daily_breakdown.map((item) => {
            const givenHeight = Math.round((item.given / maxBarValue) * 120);
            const receivedHeight = Math.round((item.received / maxBarValue) * 120);

            return (
              <div key={item.date} className="flex flex-col items-center">
                <div className="h-36 w-full flex items-end justify-center gap-1 sm:gap-2 px-1">
                  {/* Given Bar */}
                  <div
                    style={{ height: `${Math.max(4, givenHeight)}px` }}
                    className="w-1/2 max-w-[28px] bg-blue-500 hover:bg-blue-600 rounded-t transition-all group relative"
                  >
                    <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap z-10 font-mono">
                      Given: {formatCurrency(item.given)}
                    </div>
                  </div>

                  {/* Received Bar */}
                  <div
                    style={{ height: `${Math.max(4, receivedHeight)}px` }}
                    className="w-1/2 max-w-[28px] bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all group relative"
                  >
                    <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap z-10 font-mono">
                      Recv: {formatCurrency(item.received)}
                    </div>
                  </div>
                </div>

                <div className="text-center mt-2 border-t border-slate-200 pt-1.5 w-full">
                  <div className="font-bold text-xs text-slate-800">{item.day}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {item.date.slice(8)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Transaction Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Weekly Transaction Ledger ({report?.transactions.length || 0})
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {formatDate(weekStart)} - {formatDate(weekEnd)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Customer ID</th>
                <th className="py-3 px-4 font-semibold">Customer Name</th>
                <th className="py-3 px-4 font-semibold">Transaction Type</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {!report?.transactions || report.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans text-xs">
                    No transactions recorded during this week.
                  </td>
                </tr>
              ) : (
                report.transactions.map((t) => {
                  const isGiven = t.type === 'GIVEN';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => onSelectCustomer(t.customer_id)}
                          className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:underline"
                        >
                          {t.customer_id}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900 whitespace-nowrap">
                        {t.customer_name}
                      </td>
                      <td className="py-3 px-4 font-sans whitespace-nowrap">
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
                      <td className="py-3 px-4 font-bold whitespace-nowrap">
                        <span className={isGiven ? 'text-slate-900' : 'text-emerald-700'}>
                          {isGiven ? '-' : '+'}{formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600 truncate max-w-xs">
                        {t.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

