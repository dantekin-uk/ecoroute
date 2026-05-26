import React from 'react';
import { useTheme } from '../context/useTheme';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatsCard = ({ title, value, icon, colorScheme = 'main-green', trend, compact, subtitle }) => {
  const { techyColorPalettes } = useTheme();

  const defaultFallbackPalette = {
    hex: '#10B981',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-green-600',
  };

  const currentPalette = techyColorPalettes[colorScheme] || techyColorPalettes['main-green'] || defaultFallbackPalette;
  const accentColor = currentPalette.hex;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden bg-white dark:bg-[#0f172a] rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 h-full ${
        compact ? 'p-2.5 sm:p-5' : 'p-6'
      }`}
    >
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-[0.05] dark:opacity-[0.1] blur-2xl pointer-events-none transition-colors duration-500"
        style={{ backgroundColor: accentColor }}
      />

      <div className={`flex justify-between items-start relative z-10 ${compact ? 'mb-1 sm:mb-2' : 'mb-4'}`}>
        <div className="flex-1 min-w-0 pr-1">
          <p className={`font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight ${
            compact ? 'text-[9px] sm:text-xs mb-0.5 sm:mb-1' : 'text-xs mb-2'
          }`}>
            {title}
          </p>
          <h3 className={`font-black text-gray-900 dark:text-white tracking-tight truncate ${
            compact ? 'text-sm sm:text-xl lg:text-2xl' : 'text-3xl'
          }`}>
            {value}
          </h3>
          {subtitle && (
            <p className={`text-gray-500 dark:text-gray-400 mt-0.5 truncate ${compact ? 'text-[9px] sm:text-xs' : 'text-xs'}`}>
              {subtitle}
            </p>
          )}
        </div>

        <div
          className={`rounded-lg sm:rounded-[1rem] flex items-center justify-center shrink-0 shadow-sm ${
            compact ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-12 h-12'
          }`}
          style={{
            backgroundColor: `${accentColor}15`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-2 mt-4 relative z-10">
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${
              trend.isPositive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
            }`}
          >
            {trend.isPositive ? <TrendingUp size={14} strokeWidth={2.5} /> : <TrendingDown size={14} strokeWidth={2.5} />}
            <span>{trend.value}</span>
          </div>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500">vs last month</span>
        </div>
      )}

      {!trend && !subtitle && (
        <div className={compact ? 'h-0 sm:h-2' : 'h-[28px] mt-4'} />
      )}

      <div
        className="absolute bottom-0 left-0 h-[3px] w-full opacity-80"
        style={{
          background: `linear-gradient(to right, ${accentColor}20, ${accentColor}, ${accentColor}20)`,
        }}
      />
    </motion.div>
  );
};

export default StatsCard;
