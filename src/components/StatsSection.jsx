import React from 'react';
import { Link } from 'react-router-dom';
import StatsCard from './StatsCard';
import { Banknote, BarChart2, AlertTriangle, Receipt, TrendingUp, Package } from 'lucide-react';
import { useDashboardData } from '../context/DashboardContext';
import { useGlobalFilter } from '../context/FilterContext';

const SPEND_LABELS = {
  thisMonth: 'Spend (This Month)',
  lastMonth: 'Spend (Last Month)',
  thisYear: 'Spend (Year to Date)',
};

const StatsSection = () => {
  const { stats, loading } = useDashboardData();
  const { timeRange } = useGlobalFilter();

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded-2xl ${
              i === 1 ? 'col-span-2 min-h-[132px]' : 'min-h-[100px]'
            }`}
          />
        ))}
      </div>
    );
  }

  const spendLabel = SPEND_LABELS[timeRange] || 'Period Spend';
  const netPositive = stats.netProfit >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8 auto-rows-fr">
      {/* Bento hero — revenue */}
      <div className="col-span-2 lg:row-span-2 min-h-[120px] lg:min-h-[160px]">
        <StatsCard
          title="Total Revenue"
          value={`Ksh ${stats.totalRevenue.toLocaleString()}`}
          icon={<Banknote size={24} strokeWidth={1.5} />}
          colorScheme="main-green"
          subtitle="Approved collections in period"
        />
      </div>

      <StatsCard
        compact
        title="Expected Revenue"
        value={`Ksh ${stats.expectedRevenue.toLocaleString()}`}
        icon={<BarChart2 size={20} strokeWidth={1.5} />}
        colorScheme="main-blue"
      />
      <StatsCard
        compact
        title="Cash Risk"
        value={`Ksh ${stats.cashRisk.toLocaleString()}`}
        icon={<AlertTriangle size={20} strokeWidth={1.5} />}
        colorScheme="main-purple"
        subtitle="Outstanding tenant balances"
      />

      <Link to="/expenses" className="block min-w-0 h-full">
        <StatsCard
          compact
          title={spendLabel}
          value={`Ksh ${stats.totalExpenses.toLocaleString()}`}
          icon={<Receipt size={20} strokeWidth={1.5} />}
          colorScheme="main-purple"
          subtitle="View expenses →"
        />
      </Link>
      <StatsCard
        compact
        title="Net Margin"
        value={`Ksh ${stats.netProfit.toLocaleString()}`}
        icon={<TrendingUp size={20} strokeWidth={1.5} />}
        colorScheme={netPositive ? 'main-green' : 'main-purple'}
        subtitle={netPositive ? 'Revenue ahead' : 'Costs exceed revenue'}
      />
    </div>
  );
};

export default StatsSection;
