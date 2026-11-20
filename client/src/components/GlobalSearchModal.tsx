import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Phone, ArrowRight, IndianRupee } from 'lucide-react';
import { api } from '../services/api';
import { CustomerWithSummary } from '../types';
import { formatCurrency, getStatusBadgeClasses } from '../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customerId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerWithSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      loadInitial();
    }
  }, [isOpen]);

  const loadInitial = async () => {
    try {
      setIsLoading(true);
      const res = await api.getCustomers();
      setResults(res.data.slice(0, 8));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    try {
      setIsLoading(true);
      const res = await api.getCustomers(val);
      setResults(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-200 p-4 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by Customer ID (e.g. A001), Name, or Mobile Number..."
            className="w-full text-base bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono px-2 py-1 rounded"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">Searching customers...</div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              {query ? `No customers found matching "${query}".` : 'No customers registered yet.'}
            </div>
          ) : (
            results.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onSelectCustomer(c.id);
                  onClose();
                }}
                className="group flex items-center justify-between p-3 hover:bg-blue-50/60 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center font-mono text-sm border border-blue-200">
                    {c.id}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-blue-700 flex items-center gap-2">
                      <span>{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-normal ${getStatusBadgeClasses(c.financial_summary.payment_status)}`}>
                        {c.financial_summary.payment_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-xs">{c.address}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-xs text-slate-400">Balance</div>
                    <div className="font-semibold text-slate-900 font-mono text-sm">
                      {formatCurrency(c.financial_summary.remaining_balance)}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer tips */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 flex justify-between items-center">
          <span>Search tip: Enter uppercase letter + number (e.g. <b>A001</b>)</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};

