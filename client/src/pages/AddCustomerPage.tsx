import React, { useState, useEffect } from 'react';
import { UserPlus, Hash, User, Phone, Home, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { Customer } from '../types';

interface AddCustomerPageProps {
  onCustomerCreated: (customer: Customer) => void;
}

export const AddCustomerPage: React.FC<AddCustomerPageProps> = ({ onCustomerCreated }) => {
  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Live status
  const [idStatus, setIdStatus] = useState<{ checked: boolean; valid: boolean; exists: boolean; message: string }>({
    checked: false,
    valid: false,
    exists: false,
    message: '',
  });
  const [phoneStatus, setPhoneStatus] = useState<{ checked: boolean; valid: boolean; exists: boolean; message: string }>({
    checked: false,
    valid: false,
    exists: false,
    message: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live ID check debounced
  useEffect(() => {
    if (!customerId.trim()) {
      setIdStatus({ checked: false, valid: false, exists: false, message: '' });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkCustomerId(customerId.trim());
        setIdStatus({
          checked: true,
          valid: res.valid,
          exists: res.exists,
          message: res.message,
        });
      } catch (e: any) {
        setIdStatus({ checked: true, valid: false, exists: false, message: e.message });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerId]);

  // Live Phone check debounced
  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setPhoneStatus({ checked: false, valid: false, exists: false, message: '' });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkPhone(cleanPhone);
        setPhoneStatus({
          checked: true,
          valid: res.valid,
          exists: res.exists,
          message: res.message,
        });
      } catch (e: any) {
        setPhoneStatus({ checked: true, valid: false, exists: false, message: e.message });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [phone]);

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const upper = e.target.value.toUpperCase();
    setCustomerId(upper);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!idStatus.valid || idStatus.exists) {
      setError(idStatus.message || 'Please enter a valid, unique Customer ID.');
      return;
    }

    if (phoneStatus.exists) {
      setError(phoneStatus.message || 'Mobile number is already registered.');
      return;
    }

    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }

    if (!address.trim()) {
      setError('Full residential address is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createCustomer({
        id: customerId.trim(),
        name: name.trim(),
        address: address.trim(),
        phone: phone.replace(/\D/g, ''),
        notes: notes.trim() || undefined,
      });

      onCustomerCreated(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to register customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Add Customer</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Register customer profile before recording lending transactions
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">New Customer Details</h3>
            <p className="text-xs text-slate-500">All fields are stored locally in your private database</p>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Customer ID (Required)
              </span>
              <span className="text-slate-400 text-[11px] font-normal">Format: 1 Letter + Numbers (e.g. A001, B105)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={customerId}
                onChange={handleIdChange}
                placeholder="e.g. A001"
                className={`w-full px-3.5 py-2.5 font-mono text-base font-semibold border rounded-lg focus:outline-none focus:ring-2 ${
                  idStatus.checked && (!idStatus.valid || idStatus.exists)
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : idStatus.checked && idStatus.valid && !idStatus.exists
                    ? 'border-emerald-300 focus:ring-emerald-200 bg-emerald-50/20'
                    : 'border-slate-300 focus:ring-blue-100'
                }`}
                autoFocus
                required
              />
              <div className="absolute right-3 top-3">
                {idStatus.checked && idStatus.valid && !idStatus.exists && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
                {idStatus.checked && (!idStatus.valid || idStatus.exists) && (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
              </div>
            </div>
            {idStatus.checked && (
              <p
                className={`text-xs mt-1 ${
                  idStatus.valid && !idStatus.exists ? 'text-emerald-600' : 'text-rose-600 font-medium'
                }`}
              >
                {idStatus.message}
              </p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Full Customer Name (Required)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Sharma"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Mobile Number (Must be unique across customers)
              </span>
              <span className="text-slate-400 text-[11px] font-normal">10-digit number</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9848012345"
                className={`w-full px-3.5 py-2.5 font-mono border rounded-lg focus:outline-none focus:ring-2 ${
                  phoneStatus.checked && phoneStatus.exists
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-blue-100'
                }`}
                required
              />
              <div className="absolute right-3 top-3">
                {phoneStatus.checked && !phoneStatus.exists && phoneStatus.valid && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                {phoneStatus.checked && phoneStatus.exists && (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
              </div>
            </div>
            {phoneStatus.checked && phoneStatus.exists && (
              <p className="text-xs text-rose-600 font-medium mt-1">{phoneStatus.message}</p>
            )}
          </div>

          {/* Full Residential Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-slate-400" />
              Full Residential Address (Required)
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Door/House/Shop no., Street, Colony, Area, City"
              rows={3}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
              required
            />
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Optional Notes / Reference
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cloth merchant, referred by Suresh"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !idStatus.valid || idStatus.exists || phoneStatus.exists}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {isSubmitting ? 'Registering...' : 'Register Customer Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

