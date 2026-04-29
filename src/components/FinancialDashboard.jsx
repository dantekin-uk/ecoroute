import React from 'react';
import RevenueTrendChart from './RevenueTrendChart';
import CollectionRateChart from './CollectionRateChart';
import LiveTicker from './LiveTicker';
import CollectorLeaderboard from './CollectorLeaderboard';

const FinancialDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Top Row - Financial Overview and Collection Rate */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full min-h-[500px]">
        {/* Financial Overview - Takes 2/3 of the space */}
        <div className="xl:col-span-2 min-w-0">
          <RevenueTrendChart />
        </div>
        
        {/* Collection Rate - Takes 1/3 of the space */}
        <div className="xl:col-span-1 min-w-0">
          <CollectionRateChart />
        </div>
      </div>

      {/* Bottom Row - Bento Grid for Leaderboard and Live Activity */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Collector Leaderboard - Takes 1/3 of the space on large screens */}
        <div className="lg:col-span-1 w-full">
          <CollectorLeaderboard />
        </div>
        
        {/* Live Activity Ticker - Takes 2/3 of the space on large screens */}
        <div className="lg:col-span-2 w-full">
          <LiveTicker />
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
