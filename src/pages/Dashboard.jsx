import React from 'react';
import StatsSection from '../components/StatsSection';
import FinancialDashboard from '../components/FinancialDashboard';
import PendingApprovals from '../components/PendingApprovals';
import { FilterProvider, useGlobalFilter } from '../context/FilterContext';
import { DashboardProvider } from '../context/DashboardContext';

const GlobalFilter = () => {
  const { timeRange, setTimeRange, timeRanges } = useGlobalFilter();

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left Side - Filter Controls */}
        <div className="flex items-center gap-4">
          <div className="flex bg-white dark:bg-gray-900 rounded-2xl p-1 border border-gray-200 dark:border-gray-700 shadow-xl">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden group ${
                  timeRange === range.value
                    ? 'text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {timeRange === range.value && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl"></div>
                )}
                <span className="relative z-10">{range.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side - Current Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              {timeRange === 'thisMonth' ? 'Current Month Active' : timeRange === 'lastMonth' ? 'Previous Month Data' : 'Year to Date'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <FilterProvider>
      <DashboardProvider>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto space-y-6">
          {/* Global Filter - At the very top */}
          <GlobalFilter />
          
          <PendingApprovals />
          
          {/* Stats Section - Now can also be affected by global filter */}
          <StatsSection />
          
          {/* Financial Dashboard Section */}
          <FinancialDashboard />
          
          {/* More sections can be added here cleanly */}
        </div>
      </DashboardProvider>
    </FilterProvider>
  );
};

export default Dashboard;