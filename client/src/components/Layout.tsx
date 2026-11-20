import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Calendar,
  CalendarRange,
  Receipt,
  Settings,
  Search,
  PlusCircle,
  ArrowDownCircle,
  Lock,
  Menu,
  X,
  CreditCard,
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GlobalSearchModal } from './GlobalSearchModal';
import { AddCustomerModal } from './AddCustomerModal';
import { AddLoanModal } from './AddLoanModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { formatDate, getTodayDateString } from '../utils/formatters';

interface LayoutProps {
  currentTab: string;
  onTabChange: (tab: string, customerId?: string) => void;
  children: React.ReactNode;
  onRefreshData?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onTabChange,
  children,
  onRefreshData,
}) => {
  const { isPinRequired, lock } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'add-customer', label: 'Add Customer', icon: UserPlus },
    { id: 'daily', label: 'Daily', icon: Calendar },
    { id: 'weekly', label: 'Weekly', icon: CalendarRange },
    { id: 'transactions', label: 'All Transactions', icon: Receipt },
    { id: 'settings', label: 'Backup & Settings', icon: Settings },
  ];

  const handleSelectCustomer = (customerId: string) => {
    onTabChange('customer-detail', customerId);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shadow-md shadow-blue-500/20 text-lg">
            ₹
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">Finance Ledger</h1>
            <p className="text-[11px] text-slate-500 font-medium">Local Offline Record</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          {isPinRequired && (
            <button
              onClick={lock}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Application
            </button>
          )}
          <div className="text-[11px] text-slate-400 text-center">
            Private & Offline • SQLite Local
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
            ₹
          </div>
          <span className="font-bold text-slate-900 text-sm">Finance Ledger</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="w-4/5 max-w-xs bg-white h-full shadow-2xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <span className="font-bold text-slate-900">Navigation</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            {isPinRequired && (
              <button
                onClick={() => {
                  lock();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg mt-auto"
              >
                <Lock className="w-3.5 h-3.5" />
                Lock Application
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-20">
          {/* Prominent Quick Search Trigger */}
          <div className="flex-1 max-w-lg">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200 rounded-lg text-slate-500 text-xs sm:text-sm transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">Search customer by ID (e.g. A001), name, or phone...</span>
              </div>
              <span className="hidden sm:inline-block font-mono text-[11px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
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

            {isPinRequired && (
              <button
                onClick={lock}
                title="Lock Application"
                className="hidden sm:flex p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectCustomer={handleSelectCustomer}
      />

      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onCustomerCreated={(c) => {
          if (onRefreshData) onRefreshData();
          onTabChange('customer-detail', c.id);
        }}
      />

      <AddLoanModal
        isOpen={isAddLoanOpen}
        onClose={() => setIsAddLoanOpen(false)}
        onLoanCreated={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onPaymentRecorded={() => {
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
};

