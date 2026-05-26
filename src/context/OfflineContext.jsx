import React, { createContext, useContext, useEffect, useState } from 'react';

const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingTransactions, setPendingTransactions] = useState(() => {
    const saved = localStorage.getItem('pendingTransactions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addPendingTransaction = (transaction) => {
    const newPending = [...pendingTransactions, transaction];
    setPendingTransactions(newPending);
    localStorage.setItem('pendingTransactions', JSON.stringify(newPending));
  };

  const syncPendingTransactions = async (supabase) => {
    if (pendingTransactions.length === 0) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert(pendingTransactions);

      if (error) throw error;

      setPendingTransactions([]);
      localStorage.removeItem('pendingTransactions');
      alert('Pending transactions synced!');
    } catch (err) {
      console.error('Error syncing transactions:', err);
    }
  };

  return (
    <OfflineContext.Provider value={{ isOnline, addPendingTransaction, syncPendingTransactions, pendingTransactions }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);
