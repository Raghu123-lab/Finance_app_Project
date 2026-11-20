import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

export const PinLockScreen: React.FC = () => {
  const { unlock } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await unlock(pin);
    } catch (err: any) {
      setError(err.message || 'Incorrect PIN. Please try again.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600 mb-4 border border-blue-100">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Local Security Lock</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">Enter your security PIN to access the ledger</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* PIN Dots */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border transition-all ${
                  pin.length > idx ? 'bg-blue-600 border-blue-600 scale-110' : 'border-slate-300 bg-slate-100'
                }`}
              />
            ))}
          </div>

          <input
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full text-center tracking-widest text-2xl font-mono py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
            placeholder="••••"
            autoFocus
          />

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="py-3 text-lg font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            >
              DEL
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="py-3 text-lg font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-3 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            >
              CLR
            </button>
          </div>

          <button
            type="submit"
            disabled={pin.length < 4 || isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            {isSubmitting ? 'Verifying...' : 'Unlock Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

