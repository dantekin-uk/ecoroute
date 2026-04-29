import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { useTheme } from '../context/useTheme';
import { useGlobalFilter } from '../context/FilterContext';
import { useDashboardData } from '../context/DashboardContext';

const RevenueTrendChart = () => {
  const { timeRange } = useGlobalFilter();
  const { activePalette } = useTheme();
  const { revenueData, loading } = useDashboardData();

  // Calculate statistics
  const stats = useMemo(() => {
    if (!revenueData || revenueData.length === 0) return { growth: 0, total: 0, average: 0 };
    
    const latest = revenueData[revenueData.length - 1].revenue;
    const previous = revenueData[Math.max(0, revenueData.length - 7)].revenue;
    const growth = previous > 0 ? ((latest - previous) / previous) * 100 : 0;
    const total = revenueData.reduce((sum, item) => sum + item.revenue, 0);
    const average = total / revenueData.length;

    return {
      growth: growth.toFixed(1),
      total: total.toLocaleString(),
      average: Math.round(average).toLocaleString()
    };
  }, [revenueData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {entry.dataKey}
                </span>
              </div>
              <span className="text-sm font-bold" style={{ color: entry.color }}>
                Ksh {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const timeRanges = [
    { value: 'thisMonth', label: '1M' },
    { value: 'lastMonth', label: '1M' },
    { value: 'thisYear', label: '1Y' }
  ];

  const [showRevenue, setShowRevenue] = useState(true);
  const [showExpenses, setShowExpenses] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6 h-full flex flex-col"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            Financial Overview
          </h2>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {timeRange === 'thisMonth' ? 'This Month' : timeRange === 'lastMonth' ? 'Last Month' : 'This Year'}
        </div>
      </div>

      {/* Compact Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total</span>
            <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Ksh {stats.total}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-100 dark:border-blue-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">Average</span>
            <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">Ksh {stats.average}</p>
        </div>

        <div className={`rounded-xl p-4 border ${stats.growth >= 0 ? 'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium uppercase tracking-wider ${stats.growth >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>Growth</span>
            <div className={`w-6 h-6 ${stats.growth >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-lg flex items-center justify-center`}>
              <svg className={`w-3 h-3 ${stats.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stats.growth >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
            </div>
          </div>
          <p className={`text-lg font-bold ${stats.growth >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
            {stats.growth >= 0 ? '+' : ''}{Math.abs(stats.growth)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 bg-gray-50/50 dark:bg-[#1e293b] rounded-xl p-4 border border-gray-100 dark:border-gray-800 min-h-[250px]">
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={revenueData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5}/>
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activePalette.accent} stopOpacity={0.5}/>
                <stop offset="100%" stopColor={activePalette.accent} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            
            
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#9ca3af' }}
            />
            
            <YAxis
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `Ksh ${(value / 1000).toFixed(0)}k`}
              tick={{ fill: '#9ca3af' }}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '5 5' }} />
            
            {showRevenue && (
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={1.5}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#10b981',
                  stroke: '#fff',
                  strokeWidth: 2
                }}
              />
            )}
            {showExpenses && (
              <Area
                type="monotone"
                dataKey="expenses"
                stroke={activePalette.accent}
                strokeWidth={1.5}
                fill="url(#expenseGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: activePalette.accent,
                  stroke: '#fff',
                  strokeWidth: 2
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Compact Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: activePalette.accent }}></div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Expenses</span>
            </div>
          </div>
          <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            View Full Report &rarr;
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default RevenueTrendChart;
