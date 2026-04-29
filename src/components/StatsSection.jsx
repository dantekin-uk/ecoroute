import React from 'react';
import StatsCard from './StatsCard';
import { Banknote, BarChart2, AlertTriangle, Target } from 'lucide-react';
import { useDashboardData } from '../context/DashboardContext';

const StatsSection = () => {
  const { stats, loading } = useDashboardData();

  if (loading) {
    return <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-800 rounded-xl mb-8"></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-start">
      <StatsCard
        title="Total Revenue"
        value={`Ksh ${stats.totalRevenue.toLocaleString()}`}
        icon={<Banknote size={24} strokeWidth={1.5} />}
        colorScheme="main-green"
        trend={{ value: '+12.5%', isPositive: true }} // Mock trend for visual appeal
      />
      <StatsCard
        title="Expected Revenue"
        value={`Ksh ${stats.expectedRevenue.toLocaleString()}`}
        icon={<BarChart2 size={24} strokeWidth={1.5} />}
        colorScheme="main-blue"
      />
      <StatsCard
        title="Cash Risk (Debt)"
        value={`Ksh ${stats.cashRisk.toLocaleString()}`}
        icon={<AlertTriangle size={24} strokeWidth={1.5} />}
        colorScheme="main-purple"
        trend={{ value: '-2.4%', isPositive: false }} // Mock trend
      />
    </div>
  );
};

export default StatsSection;