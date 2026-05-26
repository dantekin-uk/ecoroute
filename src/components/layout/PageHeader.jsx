import React from 'react';

const PageHeader = ({ icon: Icon, iconClassName = 'text-emerald-600 dark:text-emerald-400', iconBgClassName = 'bg-emerald-500/10 dark:bg-emerald-500/20', title, subtitle, actions, badge }) => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div className="flex items-center gap-3 min-w-0">
      {Icon && (
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${iconBgClassName}`}>
          <Icon className={`h-6 w-6 ${iconClassName}`} />
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">{actions}</div>}
  </div>
);

export default PageHeader;
