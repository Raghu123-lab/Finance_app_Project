import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { PinLockScreen } from './components/PinLockScreen';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { AddCustomerPage } from './pages/AddCustomerPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { DailyPage } from './pages/DailyPage';
import { WeeklyPage } from './pages/WeeklyPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { isPinRequired, isUnlocked, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Starting Local Finance Engine...</p>
        </div>
      </div>
    );
  }

  if (isPinRequired && !isUnlocked) {
    return <PinLockScreen />;
  }

  const handleTabChange = (tab: string, customerId?: string) => {
    if (tab === 'customer-detail' && customerId) {
      setSelectedCustomerId(customerId);
      setCurrentTab('customer-detail');
    } else {
      setCurrentTab(tab);
      if (tab !== 'customer-detail') {
        setSelectedCustomerId(null);
      }
    }
  };

  return (
    <Layout currentTab={currentTab} onTabChange={handleTabChange}>
      {currentTab === 'dashboard' && <DashboardPage onNavigate={handleTabChange} />}
      {currentTab === 'customers' && (
        <CustomersPage onSelectCustomer={(id) => handleTabChange('customer-detail', id)} />
      )}
      {currentTab === 'add-customer' && (
        <AddCustomerPage
          onCustomerCreated={(c) => {
            handleTabChange('customer-detail', c.id);
          }}
        />
      )}
      {currentTab === 'customer-detail' && selectedCustomerId && (
        <CustomerDetailPage
          customerId={selectedCustomerId}
          onBack={() => handleTabChange('customers')}
        />
      )}
      {currentTab === 'daily' && (
        <DailyPage onSelectCustomer={(id) => handleTabChange('customer-detail', id)} />
      )}
      {currentTab === 'weekly' && (
        <WeeklyPage onSelectCustomer={(id) => handleTabChange('customer-detail', id)} />
      )}
      {currentTab === 'transactions' && (
        <TransactionsPage onSelectCustomer={(id) => handleTabChange('customer-detail', id)} />
      )}
      {currentTab === 'settings' && <SettingsPage />}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

