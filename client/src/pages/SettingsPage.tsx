import React, { useState, useEffect } from 'react';
import {
  Settings,
  Lock,
  Shield,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Database,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { isPinRequired, refreshPinStatus } = useAuth();

  // PIN settings state
  const [pinMode, setPinMode] = useState<'status' | 'setup' | 'change' | 'disable'>('status');
  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Backup / Restore state
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);
    if (newPin.length < 4 || newPin.length > 6) {
      setPinMessage({ type: 'error', text: 'PIN must be between 4 and 6 numeric digits.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'PIN and confirmation do not match.' });
      return;
    }

    try {
      await api.setupPin(newPin);
      await refreshPinStatus();
      setPinMessage({ type: 'success', text: 'Security PIN set successfully! The app is now protected.' });
      setNewPin('');
      setConfirmPin('');
      setPinMode('status');
    } catch (err: any) {
      setPinMessage({ type: 'error', text: err.message || 'Failed to setup PIN' });
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);
    if (!currentPin) {
      setPinMessage({ type: 'error', text: 'Please enter your current PIN.' });
      return;
    }
    if (newPin.length < 4 || newPin.length > 6) {
      setPinMessage({ type: 'error', text: 'New PIN must be between 4 and 6 numeric digits.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'New PIN and confirmation do not match.' });
      return;
    }

    try {
      await api.changePin({ currentPin, newPin });
      setPinMessage({ type: 'success', text: 'PIN updated successfully.' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setPinMode('status');
    } catch (err: any) {
      setPinMessage({ type: 'error', text: err.message || 'Failed to update PIN' });
    }
  };

  const handleDisablePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);
    try {
      await api.changePin({ currentPin, disable: true });
      await refreshPinStatus();
      setPinMessage({ type: 'success', text: 'Security PIN has been disabled.' });
      setCurrentPin('');
      setPinMode('status');
    } catch (err: any) {
      setPinMessage({ type: 'error', text: err.message || 'Failed to disable PIN' });
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = api.downloadBackupUrl;
  };

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;

    if (!window.confirm('WARNING: Restoring will overwrite the current database with the uploaded backup. Do you want to continue?')) {
      return;
    }

    setIsProcessing(true);
    setBackupMessage(null);
    try {
      await api.restoreBackup(restoreFile);
      setBackupMessage({ type: 'success', text: 'Database restored successfully! Reloading page...' });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setBackupMessage({ type: 'error', text: err.message || 'Failed to restore database.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadDemoData = async () => {
    if (!window.confirm('Load sample test data (5 customers, multiple loans & repayments)? This will replace existing database records for testing purposes.')) {
      return;
    }
    setIsProcessing(true);
    try {
      const res = await api.seedTestData();
      alert(res.message);
      window.location.reload();
    } catch (err: any) {
      alert(`Error loading test data: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('CONFIRM RESET: This will wipe all customer and financial data, leaving an empty clean database for production. Are you sure?')) {
      return;
    }
    setIsProcessing(true);
    try {
      const res = await api.resetDatabase();
      alert(res.message);
      window.location.reload();
    } catch (err: any) {
      alert(`Error resetting database: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Local Backup</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage local PIN access, export raw SQLite snapshots, and download CSV spreadsheets
        </p>
      </div>

      {/* 1. Local PIN Security Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Local PIN Security Protection</h3>
              <p className="text-xs text-slate-500">
                Lock application on your computer to keep records confidential
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              isPinRequired
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isPinRequired ? 'PIN Enabled' : 'PIN Disabled'}
          </span>
        </div>

        <div className="p-5 space-y-4">
          {pinMessage && (
            <div
              className={`p-3 rounded-lg text-xs sm:text-sm flex items-center gap-2 ${
                pinMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {pinMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{pinMessage.text}</span>
            </div>
          )}

          {pinMode === 'status' && (
            <div className="flex flex-wrap items-center gap-3">
              {!isPinRequired ? (
                <button
                  onClick={() => setPinMode('setup')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Setup Security PIN</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setPinMode('change')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Change PIN</span>
                  </button>
                  <button
                    onClick={() => setPinMode('disable')}
                    className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Disable PIN
                  </button>
                </>
              )}
            </div>
          )}

          {pinMode === 'setup' && (
            <form onSubmit={handleSetupPin} className="max-w-md space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <h4 className="font-semibold text-slate-800 text-sm">Create New PIN</h4>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Enter 4-6 Digit PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-1.5 font-mono text-center tracking-widest text-lg border border-slate-300 rounded-lg bg-white"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Confirm PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-1.5 font-mono text-center tracking-widest text-lg border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinMode('status')}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                >
                  Save PIN
                </button>
              </div>
            </form>
          )}

          {pinMode === 'change' && (
            <form onSubmit={handleChangePin} className="max-w-md space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <h4 className="font-semibold text-slate-800 text-sm">Change Security PIN</h4>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Current PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-1.5 font-mono text-center tracking-widest text-lg border border-slate-300 rounded-lg bg-white"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">New 4-6 Digit PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-1.5 font-mono text-center tracking-widest text-lg border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Confirm New PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-1.5 font-mono text-center tracking-widest text-lg border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinMode('status')}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                >
                  Update PIN
                </button>
              </div>
            </form>
          )}

          {pinMode === 'disable' && (
            <form onSubmit={handleDisablePin} className="max-w-md space-y-3 p-4 bg-rose-50/50 border border-rose-200 rounded-xl">
              <h4 className="font-semibold text-rose-800 text-sm">Disable Security PIN</h4>
              <p className="text-xs text-slate-500">Enter your current PIN to confirm disabling protection.</p>
              <div>
                <input
                  type="password"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-3 py-1.5 font-mono text-center tracking-widest text-lg border border-slate-300 rounded-lg bg-white"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinMode('status')}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
                >
                  Confirm Disable
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 2. Full SQLite Database Backup & Restore */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Complete Database Backup & Restore</h3>
            <p className="text-xs text-slate-500">
              Download the exact SQLite database file or restore from a previously saved backup
            </p>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {backupMessage && (
            <div
              className={`p-3 rounded-lg text-xs sm:text-sm flex items-center gap-2 ${
                backupMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              {backupMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{backupMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Backup Download */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <h4 className="font-semibold text-slate-800 text-sm">Download Complete Database</h4>
              <p className="text-xs text-slate-500">
                Saves a timestamped copy of <code className="text-slate-700">finance.db</code> containing all customer, loan, installment, and transaction audit records.
              </p>
              <button
                onClick={handleDownloadBackup}
                className="mt-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Download Database (.sqlite)</span>
              </button>
            </div>

            {/* Restore Upload */}
            <form onSubmit={handleRestoreBackup} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
              <h4 className="font-semibold text-slate-800 text-sm">Restore From Backup File</h4>
              <p className="text-xs text-slate-500">
                Upload a valid <code className="text-slate-700">.sqlite</code> backup to replace the active ledger.
              </p>
              <input
                type="file"
                accept=".sqlite,.db"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              <button
                type="submit"
                disabled={!restoreFile || isProcessing}
                className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-2xs flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>{isProcessing ? 'Restoring...' : 'Restore Database'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 3. CSV Spreadsheet Exports */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Export Records to CSV / Excel</h3>
            <p className="text-xs text-slate-500">
              Download clean spreadsheet data compatible with Microsoft Excel, Google Sheets, or LibreOffice
            </p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href={api.exportCsvUrl('customers')}
            download
            className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition-colors group block"
          >
            <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 flex items-center justify-between">
              <span>Customers CSV</span>
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Customer IDs, names, phones, addresses, and balances
            </p>
          </a>

          <a
            href={api.exportCsvUrl('transactions')}
            download
            className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition-colors group block"
          >
            <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 flex items-center justify-between">
              <span>Transactions CSV</span>
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Chronological log of every disbursement and repayment
            </p>
          </a>

          <a
            href={api.exportCsvUrl('loans')}
            download
            className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition-colors group block"
          >
            <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 flex items-center justify-between">
              <span>Loans Agreements CSV</span>
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Principal amounts, interest formulas, and installment terms
            </p>
          </a>
        </div>
      </div>

      {/* 4. Development & Production Database Management */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Development & Clean Production Setup</h3>
            <p className="text-xs text-slate-500">
              Load realistic sample data to inspect all calculations, or reset to an empty production database
            </p>
          </div>
        </div>

        <div className="p-5 flex flex-wrap items-center gap-4">
          <button
            onClick={handleLoadDemoData}
            disabled={isProcessing}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
          >
            <Database className="w-4 h-4 text-blue-600" />
            <span>Load Realistic Demo Test Data</span>
          </button>

          <button
            onClick={handleResetDatabase}
            disabled={isProcessing}
            className="px-4 py-2.5 border border-rose-300 hover:bg-rose-50 text-rose-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Clear All Data / Reset Database</span>
          </button>
        </div>
      </div>
    </div>
  );
};

