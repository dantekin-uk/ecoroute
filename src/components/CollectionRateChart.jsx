import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { useTheme } from '../context/useTheme';
import { useDashboardData } from '../context/DashboardContext';

const CollectionRateChart = () => {
  const { techyColorPalettes } = useTheme();
  const { stats, loading } = useDashboardData();

  const totalTenantsCount = stats?.totalTenants || 0;
  const paidTenants = stats?.paidTenants || 0;
  const collectionRate = totalTenantsCount > 0 ? Math.round((paidTenants / totalTenantsCount) * 100) : 0;

  // Get tech color palette for good performance (using main-blue like other stat cards)
  const techPalette = techyColorPalettes['main-blue'] || techyColorPalettes['main-green'];
  
  // Determine ring color based on collection rate using tech colors
  const getRingColor = (rate) => {
    if (rate > 80) return techPalette?.hex || '#10b981'; // Tech color for excellent performance
    if (rate >= 50) return techyColorPalettes['main-purple']?.hex || '#f59e0b'; // Tech purple for warning zone
    return '#ef4444'; // Red for critical alert
  };

  const ringColor = getRingColor(collectionRate);

  // Create data for radial progress ring
  const data = [
    { name: 'Collected', value: collectionRate },
    { name: 'Remaining', value: 100 - collectionRate }
  ];

  const renderCustomLabel = () => {
    return (
      <g transform="translate(120, 120)">
        {/* Background circle for text */}
        <circle
          cx="0"
          cy="0"
          r="45"
          fill="white"
          fillOpacity={0.95}
          className="dark:fill-gray-900"
        />
        
        {/* Main percentage */}
        <text 
          x="0" 
          y="-10" 
          textAnchor="middle" 
          dominantBaseline="middle"
          className="font-black"
          style={{ 
            fontSize: '28px', 
            fill: ringColor,
            fontWeight: '900',
            letterSpacing: '-0.5px'
          }}
        >
          {collectionRate}%
        </text>
        
        {/* Subtitle */}
        <text 
          x="0" 
          y="15" 
          textAnchor="middle" 
          dominantBaseline="middle"
          className="font-medium"
          style={{ 
            fontSize: '10px', 
            fill: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '500'
          }}
        >
          {paidTenants} of {totalTenantsCount}
        </text>
        
        {/* Small houses text */}
        <text 
          x="0" 
          y="30" 
          textAnchor="middle" 
          dominantBaseline="middle"
          className="font-medium"
          style={{ 
            fontSize: '9px', 
            fill: '#9ca3af',
            letterSpacing: '0.3px'
          }}
        >
          houses
        </text>
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Collection Rate
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Current month payment status
          </p>
        </div>

        {/* Radial Progress Ring */}
        <div className="h-52 sm:h-64 w-full flex items-center justify-center min-h-[208px]">
          <div className="w-full max-w-[240px] sm:max-w-[280px] aspect-square relative">
            <ResponsiveContainer width="100%" height="100%" minHeight={200} minWidth={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={88}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  cornerRadius={20}
                  stroke="none"
                >
                  <Cell fill={ringColor} />
                  <Cell fill="#f1f5f9" className="dark:fill-gray-800" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 pointer-events-none drop-shadow-sm">
              <svg width="100%" height="100%" viewBox="0 0 240 240">
                {renderCustomLabel()}
              </svg>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-sm animate-pulse" 
                style={{ backgroundColor: ringColor }}
              ></div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {collectionRate > 80 ? 'Excellent' : collectionRate >= 50 ? 'Warning' : 'Critical'}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {collectionRate > 80 ? 'On track' : collectionRate >= 50 ? 'Needs attention' : 'Immediate action'}
            </span>
          </div>

          {/* Collection Details */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Paid</p>
              <p className="text-xl font-black text-emerald-900 dark:text-emerald-50">{paidTenants}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Remaining</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{totalTenantsCount - paidTenants}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectionRateChart;
