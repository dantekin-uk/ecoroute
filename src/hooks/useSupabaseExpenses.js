import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase';
import { getDateRangeForFilter } from '../lib/dateRange';

export function useSupabaseExpenses({ timeRange, userId } = {}) {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error?.code === 'PGRST205' || error?.code === '42P01') {
      setTableMissing(true);
      setExpenses([]);
    } else if (error) {
      console.error('Error fetching expenses:', error);
    } else {
      setTableMissing(false);
      setExpenses(data || []);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    
    fetchExpenses();

    const channel = supabase
      .channel('expenses-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${userId}` }, () => fetchExpenses())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchExpenses]);

  const filteredByRange = useMemo(() => {
    if (!timeRange) return expenses;
    const { startDate, endDate } = getDateRangeForFilter(timeRange);
    return expenses.filter((e) => {
      const d = new Date(e.created_at);
      return d >= startDate && d <= endDate;
    });
  }, [expenses, timeRange]);

  const totalAllTime = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses],
  );

  const totalInRange = useMemo(
    () => filteredByRange.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [filteredByRange],
  );

  const now = new Date();
  const totalThisMonth = useMemo(
    () =>
      expenses
        .filter((e) => {
          const d = new Date(e.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses],
  );

  return {
    expenses,
    filteredByRange,
    isLoading,
    tableMissing,
    totalAllTime,
    totalInRange,
    totalThisMonth,
    refetch: fetchExpenses,
  };
}
