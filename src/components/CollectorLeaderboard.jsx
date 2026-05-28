import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useGlobalFilter } from '../context/FilterContext';
import { getDateRangeForFilter } from '../lib/dateRange';

const CollectorLeaderboard = () => {
  const { currentUser } = useAuth();
  const { timeRange } = useGlobalFilter();
  const [collectors, setCollectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const fetchLeaderboardData = useCallback(async () => {
    if (!currentUser) return;
    setFetchError(null);
    try {
      const { startDate, endDate } = getDateRangeForFilter(timeRange);

      const { data: collectorsData, error: collectorsError } = await supabase
        .from('collectors')
        .select('id, name, status, assigned_estate')
        .eq('user_id', currentUser.id);

      if (collectorsError && collectorsError.code !== '42P01') throw collectorsError;

      const { data: txs, error } = await supabase
        .from('transactions')
        .select('amount, collector_name, payment_method, created_at')
        .eq('user_id', currentUser.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const collectorStats = {};

      (collectorsData || []).forEach((c) => {
        collectorStats[c.name] = {
          name: c.name,
          totalCollected: 0,
          cashInHand: 0,
          status: c.status || 'Offline',
        };
      });

      (txs || []).forEach((tx) => {
        if (tx.payment_method?.startsWith('Incident')) return;

        const name = tx.collector_name || 'Admin';
        if (!collectorStats[name]) {
          collectorStats[name] = {
            name,
            totalCollected: 0,
            cashInHand: 0,
            status: 'Offline',
          };
        }

        const amount = Number(tx.amount || 0);
        const isPending = tx.payment_method?.includes('(Pending)');

        if (!isPending) {
          collectorStats[name].totalCollected += amount;
        }

        if (tx.payment_method?.includes('Cash') && isPending) {
          collectorStats[name].cashInHand += amount;
        }
      });

      const sortedCollectors = Object.values(collectorStats).sort(
        (a, b) => b.totalCollected - a.totalCollected
      );

      const maxCollected = sortedCollectors.length > 0 ? sortedCollectors[0].totalCollected : 1;
      const targetGoal = Math.max(50000, maxCollected);
      const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#6B7280', '#6B7280'];

      const formattedCollectors = sortedCollectors.slice(0, 5).map((c, index) => {
        const names = c.name.split(' ');
        const initials =
          names.length > 1
            ? `${names[0][0]}${names[1][0]}`.toUpperCase()
            : c.name.substring(0, 2).toUpperCase();

        return {
          id: c.name,
          name: c.name,
          initials,
          rank: index + 1,
          collectionRate: Math.min(100, Math.round((c.totalCollected / targetGoal) * 100)),
          cashInHand: c.cashInHand,
          totalCollected: c.totalCollected,
          status: c.status,
          color: colors[index] || '#6B7280',
        };
      });

      setCollectors(formattedCollectors);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setFetchError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    fetchLeaderboardData();

    const txSubscription = supabase
      .channel('leaderboard-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${currentUser.id}` }, () => {
        fetchLeaderboardData();
      })
      .subscribe();

    const collectorSubscription = supabase
      .channel('leaderboard-collectors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collectors', filter: `user_id=eq.${currentUser.id}` }, () => {
        fetchLeaderboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(txSubscription);
      supabase.removeChannel(collectorSubscription);
    };
  }, [fetchLeaderboardData, currentUser]);

  const getRankBadge = (rank) => {
    const badges = {
      1: { bg: 'bg-gradient-to-br from-yellow-400/20 to-amber-500/20', border: 'border-yellow-400/50' },
      2: { bg: 'bg-gradient-to-br from-gray-300/20 to-slate-400/20', border: 'border-gray-300/50' },
      3: { bg: 'bg-gradient-to-br from-orange-400/20 to-amber-600/20', border: 'border-orange-400/50' },
      default: { bg: 'bg-gradient-to-br from-slate-600/20 to-gray-700/20', border: 'border-slate-600/50' },
    };
    return badges[rank] || badges.default;
  };

  const getRiskLevel = (cashInHand) => {
    if (cashInHand >= 10000) return 'high';
    if (cashInHand >= 7500) return 'medium';
    return 'low';
  };

  const formatCurrency = (amount) => `Ksh ${amount.toLocaleString()}`;

  const periodLabel =
    timeRange === 'thisMonth'
      ? 'This month'
      : timeRange === 'lastMonth'
        ? 'Last month'
        : 'This year';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6 h-[350px] sm:h-[400px] overflow-hidden relative w-full flex flex-col"
    >
      <div className="mb-4 flex flex-col gap-2 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Collector Leaderboard
            </h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
              <motion.div
                className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Live
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {periodLabel} · Supabase
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] sm:text-xs font-semibold">
          <Link
            to="/collector"
            className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
          >
            Collector portal <ChevronRight className="w-3 h-3" />
          </Link>
          <Link
            to="/team"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white flex items-center gap-0.5"
          >
            Team <ChevronRight className="w-3 h-3" />
          </Link>
          <Link
            to="/collections"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white flex items-center gap-0.5"
          >
            Ledger <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto scrollbar-hide pr-1">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                Loading leaderboard...
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center h-32 text-sm text-rose-500 text-center px-4">
                <p>Could not load leaderboard.</p>
                <p className="text-xs text-gray-500 mt-1">{fetchError}</p>
              </div>
            ) : collectors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-sm text-gray-500 text-center px-4">
                <p>No collections for {periodLabel.toLowerCase()}.</p>
                <Link to="/collector" className="text-emerald-600 text-xs font-semibold mt-2 hover:underline">
                  Open collector portal →
                </Link>
              </div>
            ) : (
              collectors.map((collector, index) => {
                const rankBadge = getRankBadge(collector.rank);

                return (
                  <motion.div
                    key={collector.id}
                    layout
                    initial={{ opacity: 0, x: -30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 30, scale: 0.95 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.25, 0.46, 0.45, 0.94],
                      delay: index * 0.08,
                    }}
                    className="relative p-3 rounded-xl bg-gray-50 dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200"
                  >

                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className={`relative w-8 h-8 rounded-lg flex items-center justify-center ${rankBadge.bg} border ${rankBadge.border} flex-shrink-0`}
                      >
                        <span className="text-xs font-bold" style={{ color: collector.color }}>
                          #{collector.rank}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                            {collector.initials}
                          </span>
                          {collector.status === 'Active Now' && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#1e293b]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {collector.name}
                          </div>
                          <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${collector.collectionRate}%` }}
                              transition={{ duration: 1.5, ease: 'easeOut' }}
                            />
                          </div>
                          <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                            {collector.collectionRate}% of top · {formatCurrency(collector.totalCollected)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <motion.div
                          className="text-sm font-bold text-emerald-600 dark:text-emerald-400"
                        >
                          <span className="hidden sm:inline">{formatCurrency(collector.totalCollected)}</span>
                          <span className="sm:hidden">
                            {collector.totalCollected >= 1000
                              ? `${(collector.totalCollected / 1000).toFixed(1)}k`
                              : collector.totalCollected}
                          </span>
                        </motion.div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">Total Collected</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectorLeaderboard;
