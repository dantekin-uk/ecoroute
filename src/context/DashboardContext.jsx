import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useGlobalFilter } from './FilterContext';

const DashboardContext = createContext();

export const useDashboardData = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
  const { timeRange } = useGlobalFilter();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    expectedRevenue: 0,
    cashRisk: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch all tenants for expected revenue and cash risk
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .eq('is_active', true);
        
      if (tenantsError) throw tenantsError;

      let expected = 0;
      let risk = 0;
      let totalTenants = 0;
      let paidTenants = 0;

      if (tenants) {
        totalTenants = tenants.length;
        tenants.forEach(t => {
          expected += Number(t.monthly_rate || 0);
          if (t.current_balance < 0) {
            risk += Math.abs(t.current_balance);
          } else {
            paidTenants += 1;
          }
        });
      }

      // Determine date filter based on timeRange
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      
      if (timeRange === 'thisMonth') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (timeRange === 'lastMonth') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (timeRange === 'thisYear') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      }

      // 2. Fetch transactions for total revenue and charts based on timeRange
      let query = supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      const { data: txs, error: txsError } = await query;

      if (txsError) throw txsError;

      // 3. Fetch ALWAYS the latest 10 transactions for the Live Activity Ticker
      const { data: recentTxs, error: recentTxsError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentTxsError) throw recentTxsError;

      let totalRev = 0;
      if (txs) {
        txs.forEach(tx => {
          if (!tx.payment_method?.includes('(Pending)') && !tx.payment_method?.startsWith('Incident')) {
            totalRev += Number(tx.amount || 0);
          }
        });
      }

      setStats({
        totalRevenue: totalRev,
        expectedRevenue: expected,
        cashRisk: risk,
        totalTenants,
        paidTenants
      });

      // Keep latest 10 globally for live ticker, filtering out incidents
      const recentPayments = (recentTxs || []).filter(tx => !tx.payment_method?.startsWith('Incident'));
      setRecentTransactions(recentPayments);

      // Group transactions by date/month for the chart
      const groupedData = {};
      if (txs) {
        txs.forEach(tx => {
          if (tx.payment_method?.includes('(Pending)') || tx.payment_method?.startsWith('Incident')) return;

          const dateObj = new Date(tx.created_at);
          let dateStr = '';
          
          if (timeRange === 'thisYear') {
            // Group by month
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
          } else {
            // Group by day
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
          
          if (!groupedData[dateStr]) {
            groupedData[dateStr] = { date: dateStr, revenue: 0, expenses: 0 };
          }
          groupedData[dateStr].revenue += Number(tx.amount || 0);
          groupedData[dateStr].expenses = Math.round(groupedData[dateStr].revenue * 0.3); // mock 30% expense
        });
      }

      // Generate chart data array based on timeRange
      const chartData = [];
      if (timeRange === 'thisYear') {
        // 12 months
        for (let i = 0; i <= now.getMonth(); i++) {
          const d = new Date(now.getFullYear(), i, 1);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short' });
          if (groupedData[dateStr]) {
            chartData.push(groupedData[dateStr]);
          } else {
            chartData.push({ date: dateStr, revenue: 0, expenses: 0 });
          }
        }
      } else {
        // Days in the selected month
        const daysInMonth = endDate.getDate();
        const currentDay = timeRange === 'thisMonth' ? now.getDate() : daysInMonth;
        
        for (let i = 1; i <= currentDay; i++) {
          const d = new Date(startDate.getFullYear(), startDate.getMonth(), i);
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (groupedData[dateStr]) {
            chartData.push(groupedData[dateStr]);
          } else {
            chartData.push({ date: dateStr, revenue: 0, expenses: 0 });
          }
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
    fetchDashboardData();

    // Set up real-time subscriptions
    const tenantsSub = supabase
      .channel('dashboard-tenants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    const txSub = supabase
      .channel('dashboard-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tenantsSub);
      supabase.removeChannel(txSub);
    };
  }, [timeRange]); // Re-fetch when timeRange changes

  return (
    <DashboardContext.Provider value={{ stats, recentTransactions, revenueData, loading }}>
      {children}
    </DashboardContext.Provider>
  );
};
