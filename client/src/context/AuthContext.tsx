import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface AuthContextType {
  isPinRequired: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  refreshPinStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isPinRequired: false,
  isUnlocked: true,
  isLoading: true,
  unlock: async () => false,
  lock: () => {},
  refreshPinStatus: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPinRequired, setIsPinRequired] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshPinStatus = async () => {
    try {
      const res = await api.getPinStatus();
      setIsPinRequired(res.pin_enabled);
      if (!res.pin_enabled) {
        setIsUnlocked(true);
      } else {
        const sessionUnlocked = sessionStorage.getItem('finance_app_unlocked');
        if (sessionUnlocked === 'true') {
          setIsUnlocked(true);
        } else {
          setIsUnlocked(false);
        }
      }
    } catch (e) {
      console.error('Failed to get PIN status:', e);
      setIsUnlocked(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshPinStatus();
  }, []);

  const unlock = async (pin: string): Promise<boolean> => {
    try {
      const res = await api.verifyPin(pin);
      if (res.verified) {
        setIsUnlocked(true);
        sessionStorage.setItem('finance_app_unlocked', 'true');
        return true;
      }
      return false;
    } catch (err) {
      throw err;
    }
  };

  const lock = () => {
    if (isPinRequired) {
      setIsUnlocked(false);
      sessionStorage.removeItem('finance_app_unlocked');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isPinRequired,
        isUnlocked,
        isLoading,
        unlock,
        lock,
        refreshPinStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

