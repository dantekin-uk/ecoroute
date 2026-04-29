import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDashboardData } from '../context/DashboardContext';

const LiveTicker = () => {
  const { recentTransactions, loading } = useDashboardData();

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6 h-[350px] sm:h-[400px] overflow-hidden relative w-full flex flex-col"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            Live Activity
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
          Real-time transactions
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-hide pr-1">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">Loading live data...</div>
            ) : recentTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">No recent transactions</div>
            ) : (
              recentTransactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: -30, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, x: 30, scale: 0.95 }}
                  transition={{ 
                    duration: 0.6, 
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: index * 0.1,
                    layout: { duration: 0.4, ease: "easeInOut" }
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    {/* Transaction Icon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex-shrink-0">
                      <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        Ksh {transaction.amount}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                        {transaction.payment_method} • House {transaction.house_number}
                      </div>
                    </div>
                  </div>

                  {/* Timestamp & Estate */}
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-300">
                      {transaction.estate_name}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatTime(transaction.created_at)}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveTicker;
