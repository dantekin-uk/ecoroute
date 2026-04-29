import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

const CollectorLeaderboard = () => {
  const [collectors, setCollectors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardData();

    // Set up real-time subscription for transactions
    const txSubscription = supabase
      .channel('leaderboard-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchLeaderboardData();
      })
      .subscribe();

    // Set up real-time subscription for collectors (for online status)
    const collectorSubscription = supabase
      .channel('leaderboard-collectors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collectors' }, () => {
        fetchLeaderboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(txSubscription);
      supabase.removeChannel(collectorSubscription);
    };
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch collectors to get their online status
      const { data: collectorsData, error: collectorsError } = await supabase
        .from('collectors')
        .select('*');
        
      if (collectorsError && collectorsError.code !== '42P01') throw collectorsError;

      // Fetch all transactions to aggregate by collector
      const { data: txs, error } = await supabase
        .from('transactions')
        .select('*');

      if (error) throw error;

      // Group by collector_name
      const collectorStats = {};
      
      // Initialize with collectors from the DB
      if (collectorsData) {
        collectorsData.forEach(c => {
          collectorStats[c.name] = {
            name: c.name,
            totalCollected: 0,
            cashInHand: 0,
            status: c.status || 'Offline'
          };
        });
      }
      
      if (txs) {
        txs.forEach(tx => {
          // Ignore incidents
          if (tx.payment_method?.startsWith('Incident')) return;
          
          const name = tx.collector_name || 'Admin';
          if (!collectorStats[name]) {
            collectorStats[name] = {
              name,
              totalCollected: 0,
              cashInHand: 0,
              status: 'Offline'
            };
          }

          const amount = Number(tx.amount || 0);
          const isPending = tx.payment_method?.includes('Pending');

          // Only add to total collected if it's an approved transaction
          if (!isPending) {
            collectorStats[name].totalCollected += amount;
          }

          // If it's a pending cash transaction, it's cash in hand
          if (tx.payment_method?.includes('Cash') && isPending) {
            collectorStats[name].cashInHand += amount;
          }
        });
      }

      // Convert to array and sort by totalCollected descending
      let sortedCollectors = Object.values(collectorStats).sort((a, b) => b.totalCollected - a.totalCollected);

      // Top collector sets the 100% benchmark for the progress bar
      const maxCollected = sortedCollectors.length > 0 ? sortedCollectors[0].totalCollected : 1;
      const targetGoal = Math.max(50000, maxCollected); // Minimum 50k goal or dynamic based on highest

      const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#6B7280', '#6B7280'];

      const formattedCollectors = sortedCollectors.slice(0, 5).map((c, index) => {
        const names = c.name.split(' ');
        const initials = names.length > 1 
          ? `${names[0][0]}${names[1][0]}`.toUpperCase()
          : c.name.substring(0, 2).toUpperCase();

        return {
          id: index + 1,
          name: c.name,
          initials,
          rank: index + 1,
          collectionRate: Math.min(100, Math.round((c.totalCollected / targetGoal) * 100)),
          cashInHand: c.cashInHand,
          totalCollected: c.totalCollected,
          status: c.status,
          color: colors[index] || '#6B7280'
        };
      });

      setCollectors(formattedCollectors);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    const badges = {
      1: { bg: 'bg-gradient-to-br from-yellow-400/20 to-amber-500/20', border: 'border-yellow-400/50', glow: 'shadow-yellow-400/30' },
      2: { bg: 'bg-gradient-to-br from-gray-300/20 to-slate-400/20', border: 'border-gray-300/50', glow: 'shadow-gray-300/30' },
      3: { bg: 'bg-gradient-to-br from-orange-400/20 to-amber-600/20', border: 'border-orange-400/50', glow: 'shadow-orange-400/30' },
      default: { bg: 'bg-gradient-to-br from-slate-600/20 to-gray-700/20', border: 'border-slate-600/50', glow: 'shadow-slate-600/30' }
    };
    return badges[rank] || badges.default;
  };

  const getRiskLevel = (cashInHand) => {
    if (cashInHand >= 10000) return 'high';
    if (cashInHand >= 7500) return 'medium';
    return 'low';
  };

  const formatCurrency = (amount) => {
    return `Ksh ${amount.toLocaleString()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6 h-[350px] sm:h-[400px] overflow-hidden relative w-full flex flex-col"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            Collector Leaderboard
          </h2>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <motion.div
              className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Real-time performance
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide pr-1">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">Loading leaderboard...</div>
            ) : collectors.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">No collections yet.</div>
            ) : collectors.map((collector, index) => {
              const rankBadge = getRankBadge(collector.rank);
              const riskLevel = getRiskLevel(collector.cashInHand);
              const isHighRisk = riskLevel === 'high';
              
              return (
                <motion.div
                  key={collector.id}
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95 }}
                  transition={{ 
                    duration: 0.5, 
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: index * 0.08,
                    layout: { duration: 0.4, ease: "easeInOut" }
                  }}
                  className={`relative p-3 rounded-xl bg-gray-50 dark:bg-[#1e293b] border ${
                    isHighRisk 
                      ? 'border-red-500/30' 
                      : 'border-gray-100 dark:border-gray-800'
                  } hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200`}
                >
                  {/* Risk Alert Pulse for High Risk */}
                  {isHighRisk && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border border-red-500/20"
                      animate={{
                        opacity: [0.2, 0.8, 0.2],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Rank Badge */}
                  <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center ${rankBadge.bg} border ${rankBadge.border} flex-shrink-0`}>
                    <span className="text-xs font-bold" style={{ color: collector.color }}>
                      #{collector.rank}
                    </span>
                  </div>

                  {/* Avatar and Name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        {collector.initials}
                      </span>
                      {collector.status === 'Active Now' && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#1e293b]"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {collector.name}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${collector.collectionRate}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                        {collector.collectionRate}% collected
                      </div>
                    </div>
                  </div>

                  {/* Cash in Hand - Risk Alert */}
                  <div className="text-right flex-shrink-0">
                    <motion.div
                      className={`text-sm font-bold ${
                        isHighRisk 
                          ? 'text-red-500 dark:text-red-400' 
                          : riskLevel === 'medium' 
                            ? 'text-amber-500 dark:text-amber-400' 
                            : 'text-gray-900 dark:text-white'
                      }`}
                      animate={isHighRisk ? {
                        scale: [1, 1.05, 1],
                      } : {}}
                      transition={{
                        duration: 1,
                        repeat: isHighRisk ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                    >
                      <span className="hidden sm:inline">{formatCurrency(collector.cashInHand)}</span>
                      <span className="sm:hidden">{collector.cashInHand >= 1000 ? `${(collector.cashInHand/1000).toFixed(1)}k` : collector.cashInHand}</span>
                    </motion.div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Collected
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectorLeaderboard;
