import React from 'react';

/**
 * Unified stat card — 2-column mobile grid on every page (matches Expenses / Collector portal).
 */
const PageStatCard = ({
  label,
  value,
  subtitle,
  icon: Icon,
  valueClassName = 'text-gray-900 dark:text-white',
  iconClassName = 'text-emerald-600 dark:text-emerald-400',
  iconBgClassName = 'bg-emerald-100 dark:bg-emerald-500/20',
  className = '',
  as: Component = 'div',
  ...rest
}) => (
  <Component
    className={`block h-full bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl p-4 sm:p-5 shadow-xl transition-shadow hover:shadow-2xl ${className}`}
    {...rest}
  >
    <div className="flex items-start gap-3 h-full">
      {Icon && (
        <div
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex-shrink-0 flex items-center justify-center ${iconBgClassName}`}
        >
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconClassName}`} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-tight">
          {label}
        </p>
        <h3 className={`text-lg sm:text-2xl font-black mt-0.5 sm:mt-1 truncate ${valueClassName}`}>
          {value}
        </h3>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  </Component>
);

export default PageStatCard;
