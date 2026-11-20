import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, History, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { TransactionAuditLog } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  isOpen,
  onClose,
  transactionId,
}) => {
  const [logs, setLogs] = useState<TransactionAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && transactionId) {
      setIsLoading(true);
      api.getTransactionAudit(transactionId)
        .then((res) => setLogs(res.data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, transactionId]);

  if (!isOpen || !transactionId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Transaction Audit History</h2>
              <p className="text-xs text-slate-500 font-mono">Transaction ID: {transactionId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading audit records...</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No audit edits have been performed on this transaction.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => {
                let oldObj: any = {};
                let newObj: any = {};
                try {
                  oldObj = JSON.parse(log.old_data);
                  newObj = JSON.parse(log.new_data);
                } catch (e) {}

                return (
                  <div key={log.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-2">
                      <span className="font-mono font-semibold text-slate-700">{log.id}</span>
                      <span>{new Date(log.created_at).toLocaleString('en-IN')}</span>
                    </div>

                    <div className="text-xs">
                      <span className="font-semibold text-slate-600">Audit Reason:</span>
                      <div className="p-2 bg-white border border-slate-200 rounded text-slate-800 mt-1 italic">
                        "{log.reason}"
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-rose-50/60 border border-rose-200 rounded-lg">
                        <div className="text-[10px] uppercase font-bold text-rose-700 mb-1">Previous Values</div>
                        <div className="text-slate-700">Amount: <b className="font-mono">{formatCurrency(oldObj.amount)}</b></div>
                        <div className="text-slate-700">Date: <b className="font-mono">{oldObj.date}</b></div>
                        {oldObj.notes && <div className="text-slate-500 truncate">Notes: {oldObj.notes}</div>}
                      </div>

                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                        <div className="text-[10px] uppercase font-bold text-emerald-700 mb-1">Corrected Values</div>
                        <div className="text-slate-700">Amount: <b className="font-mono">{formatCurrency(newObj.amount)}</b></div>
                        <div className="text-slate-700">Date: <b className="font-mono">{newObj.date}</b></div>
                        {newObj.notes && <div className="text-slate-500 truncate">Notes: {newObj.notes}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

