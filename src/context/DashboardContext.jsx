import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useGlobalFilter } from './FilterContext';
import { useSupabaseExpenses } from '../hooks/useSupabaseExpenses';
import { getDateRangeForFilter } from '../lib/dateRange';
import { useAuth } from './useAuth';

const DashboardContext = createContext();

export const useDashboardData = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { timeRange } = useGlobalFilter();
  const {
    filteredByRange: expensesInRange,
    isLoading: expensesLoading,
  } = useSupabaseExpenses({ timeRange, userId: currentUser?.id });

  const [stats, setStats] = useState({
    totalRevenue: 0,
    expectedRevenue: 0,
    cashRisk: 0,
    totalExpenses: 0,
    netProfit: 0,
    lowStockCount: 0,
    stockValue: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('is_active', true);

      if (tenantsError) throw tenantsError;

      let expected = 0;
      let risk = 0;
      let totalTenants = 0;
      let paidTenants = 0;

      if (tenants) {
        totalTenants = tenants.length;
        tenants.forEach((t) => {
          expected += Number(t.monthly_rate || 0);
          if (t.current_balance < 0) {
            risk += Math.abs(t.current_balance);
          } else {
            paidTenants += 1;
          }
        });
      }

      const { startDate, endDate, now } = getDateRangeForFilter(timeRange);

      const { data: txs, error: txsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (txsError) throw txsError;

      const { data: recentTxs, error: recentTxsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentTxsError) throw recentTxsError;

      let totalRev = 0;
      if (txs) {
        txs.forEach((tx) => {
          if (!tx.payment_method?.includes('(Pending)') && !tx.payment_method?.startsWith('Incident')) {
            totalRev += Number(tx.amount || 0);
          }
        });
      }

      const expenseTotal = expensesInRange.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      let lowStockCount = 0;
      let stockValue = 0;
      const { data: stockRows } = await supabase
        .from('consumables')
        .select('quantity, critical_threshold, price_per_unit')
        .eq('user_id', currentUser.id);

      if (stockRows) {
        stockRows.forEach((row) => {
          const qty = Number(row.quantity || 0);
          const threshold = Number(row.critical_threshold || 0);
          const price = Number(row.price_per_unit || 0);
          stockValue += qty * price;
          if (qty <= threshold) lowStockCount += 1;
        });
      }

      setStats({
        totalRevenue: totalRev,
        expectedRevenue: expected,
        cashRisk: risk,
        totalTenants,
        paidTenants,
        totalExpenses: expenseTotal,
        netProfit: totalRev - expenseTotal,
        lowStockCount,
        stockValue,
      });

      const recentPayments = (recentTxs || []).filter((tx) => !tx.payment_method?.startsWith('Incident'));
      setRecentTransactions(recentPayments);

      const groupedData = {};
      if (txs) {
        txs.forEach((tx) => {
          if (tx.payment_method?.includes('(Pending)') || tx.payment_method?.startsWith('Incident')) return;

          const dateObj = new Date(tx.created_at);
          let dateStr = '';

          if (timeRange === 'thisYear') {
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
          } else {
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }

          if (!groupedData[dateStr]) {
            groupedData[dateStr] = { date: dateStr, revenue: 0, expenses: 0 };
          }
          groupedData[dateStr].revenue += Number(tx.amount || 0);
        });
      }

      expensesInRange.forEach((exp) => {
        const dateObj = new Date(exp.created_at);
        let dateStr = '';

        if (timeRange === 'thisYear') {
          dateStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
        } else {
          dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        if (!groupedData[dateStr]) {
          groupedData[dateStr] = { date: dateStr, revenue: 0, expenses: 0 };
        }
        groupedData[dateStr].expenses += Number(exp.amount || 0);
      });

      const chartData = [];
      if (timeRange === 'thisYear') {
        for (let i = 0; i <= now.getMonth(); i++) {
          const d = new Date(now.getFullYear(), i, 1);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short' });
          chartData.push(groupedData[dateStr] || { date: dateStr, revenue: 0, expenses: 0 });
        }
      } else {
        const daysInMonth = endDate.getDate();
        const currentDay = timeRange === 'thisMonth' ? now.getDate() : daysInMonth;

        for (let i = 1; i <= currentDay; i++) {
          const d = new Date(startDate.getFullYear(), startDate.getMonth(), i);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          chartData.push(groupedData[dateStr] || { date: dateStr, revenue: 0, expenses: 0 });
        }
      }

      setRevenueData(chartData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);
    fetchDashboardData();

    const tenantsSub = supabase
      .channel('dashboard-tenants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants', filter: `user_id=eq.${currentUser.id}` }, () => fetchDashboardData())
      .subscribe();

    const txSub = supabase
      .channel('dashboard-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${currentUser.id}` }, () => fetchDashboardData())
      .subscribe();

    const consumablesSub = supabase
      .channel('dashboard-consumables')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consumables', filter: `user_id=eq.${currentUser.id}` }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(tenantsSub);
      supabase.removeChannel(txSub);
      supabase.removeChannel(consumablesSub);
    };
  }, [currentUser, timeRange, expensesInRange]);

  return (
    <DashboardContext.Provider
      value={{
        stats,
        recentTransactions,
        revenueData,
        loading: loading || expensesLoading,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
