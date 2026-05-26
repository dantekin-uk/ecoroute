import React, { useState } from 'react';
import {
  Banknote,
  MapPin,
  Users,
  TrendingUp,
  Wallet,
  DoorOpen,
  Search,
  ExternalLink,
  Circle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import { useCollectorPortal } from '../../hooks/useCollectorPortal';
import CollectorDoorGrid from './CollectorDoorGrid';
import CollectorPaymentSheet from './CollectorPaymentSheet';

const AdminCollectorPortal = () => {
  const { activePalette } = useTheme();
  const [collectorSearch, setCollectorSearch] = useState('');
  const portal = useCollectorPortal('admin');

  const {
    estates,
    activeEstate,
    setActiveEstate,
    houses,
    collectorSummaries,
    selectedCollectorName,
    setSelectedCollectorName,
    collectorName,
    stats,
    recentForCollector,
    isLoading,
    isSubmitting,
    selectedHouse,
    showIssueMenu,
    setShowIssueMenu,
    handleHouseClick,
    handleCloseSheet,
    handleLogPayment,
    handleReportIssue,
  } = portal;

  const filteredCollectors = collectorSummaries.filter(
    (c) =>
      !collectorSearch ||
      c.name.toLowerCase().includes(collectorSearch.toLowerCase()) ||
      c.estateName.toLowerCase().includes(collectorSearch.toLowerCase())
  );

  const activeCollector = collectorSummaries.find((c) => c.name === selectedCollectorName);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto min-h-screen space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
            <Banknote className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Collector Portal
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monitor field agents and preview each collector&apos;s route in real time
            </p>
          </div>
        </div>
        <Link
          to="/app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          Open mobile field app
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          {
            label: 'Route progress',
            value: `${stats.routeProgress}%`,
            sub: `${stats.doneDoors}/${stats.totalDoors} doors cleared`,
            icon: DoorOpen,
            color: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Collected today',
            value: `KES ${stats.collectedToday.toLocaleString()}`,
            sub: `${stats.logsToday} logs today`,
            icon: TrendingUp,
            color: 'text-blue-600 dark:text-blue-400',
          },
          {
            label: 'Cash in hand',
            value: `KES ${stats.cashInHand.toLocaleString()}`,
            sub: 'Pending cash approvals',
            icon: Wallet,
            color: stats.cashInHand >= 10000 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white',
          },
          {
            label: 'Doors pending',
            value: stats.pendingDoors,
            sub: activeEstate?.name || 'Select estate',
            icon: MapPin,
            color: 'text-amber-600 dark:text-amber-400',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl p-4 shadow-xl"
          >
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <card.icon size={12} />
              {card.label}
            </p>
            <h3 className={`text-xl sm:text-2xl font-black ${card.color}`}>{card.value}</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <aside className="xl:col-span-3 space-y-3">
          <div className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Collectors
                </h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search name or estate..."
                  value={collectorSearch}
                  onChange={(e) => setCollectorSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredCollectors.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 text-center">No collectors found.</p>
              ) : (
                filteredCollectors.map((c) => {
                  const isActive = c.name === selectedCollectorName;
                  const isOnline = c.status === 'Active Now';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCollectorName(c.name)}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${
                        isActive
                          ? `${activePalette.activeBg} border-emerald-500/30 shadow-sm`
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {c.name}
                        </span>
                        <span
                          className={`flex items-center gap-1 text-[10px] font-bold uppercase ${
                            isOnline ? 'text-emerald-600' : 'text-gray-400'
                          }`}
                        >
                          <Circle className={`w-2 h-2 fill-current ${isOnline ? 'animate-pulse' : ''}`} />
                          {isOnline ? 'Live' : 'Off'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{c.estateName}</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        KES {c.collectedToday.toLocaleString()} today
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        <div className="xl:col-span-9 space-y-4">
          <div className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Viewing as
                </p>
                <p className="text-lg font-black text-gray-900 dark:text-white">{collectorName}</p>
                {activeCollector && (
                  <p className="text-xs text-gray-500 mt-0.5">Assigned: {activeCollector.estateName}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-bold text-gray-500 uppercase">Estate</label>
                <select
                  value={activeEstate?.id || ''}
                  onChange={(e) => {
                    const estate = estates.find((es) => es.id === e.target.value);
                    if (estate) setActiveEstate(estate);
                  }}
                  disabled={!estates.length}
                  className="min-w-[160px] px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {estates.map((estate) => (
                    <option key={estate.id} value={estate.id}>
                      {estate.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stats.routeProgress}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl p-4 sm:p-6 shadow-xl min-h-[360px]">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-rose-500" />
                Door map — tap pending doors to log
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-20 text-gray-500">Loading route...</div>
              ) : houses.length === 0 ? (
                <div className="flex justify-center py-20 text-gray-500">No tenants for this estate.</div>
              ) : (
                <CollectorDoorGrid
                  houses={houses}
                  onHouseClick={handleHouseClick}
                  columns={6}
                  compact
                />
              )}
            </div>

            <div className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                Today&apos;s activity
              </h3>
              <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar">
                {recentForCollector.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No logs yet today.</p>
                ) : (
                  recentForCollector.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          Door {tx.house_number}
                        </span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(tx.amount) > 0 ? `KES ${Number(tx.amount).toLocaleString()}` : '—'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 truncate">{tx.payment_method}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CollectorPaymentSheet
        variant="desktop"
        selectedHouse={selectedHouse}
        isSubmitting={isSubmitting}
        showIssueMenu={showIssueMenu}
        onClose={handleCloseSheet}
        onLogPayment={handleLogPayment}
        onReportIssue={handleReportIssue}
        onToggleIssueMenu={() => setShowIssueMenu((v) => !v)}
      />
    </div>
  );
};

export default AdminCollectorPortal;
