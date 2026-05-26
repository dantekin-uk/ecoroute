import React from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Loader2,
  LogOut,
  Flame,
  Target,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useCollectorPortal } from '../hooks/useCollectorPortal';
import CollectorDoorGrid from './collector/CollectorDoorGrid';
import CollectorPaymentSheet from './collector/CollectorPaymentSheet';

const encouragements = [
  { min: 0, text: 'Every door counts — you’ve got this!' },
  { min: 25, text: 'Good start. Keep the momentum going.' },
  { min: 50, text: 'Halfway there — strong work today!' },
  { min: 75, text: 'Almost done — finish strong!' },
  { min: 100, text: 'Route complete. Outstanding!' },
];

function getEncouragement(progress) {
  const match = [...encouragements].reverse().find((e) => progress >= e.min);
  return match?.text || encouragements[0].text;
}

const MobileCollectorGrid = () => {
  const portal = useCollectorPortal('field');
  const {
    isAdminMode,
    isDedicatedCollector,
    estates,
    activeEstate,
    setActiveEstate,
    houses,
    allCollectors,
    selectedCollectorName,
    setSelectedCollectorName,
    collectorName,
    stats,
    isLoading,
    isSubmitting,
    selectedHouse,
    showIssueMenu,
    setShowIssueMenu,
    handleHouseClick,
    handleCloseSheet,
    handleLogPayment,
    handleReportIssue,
    logoutCollector,
  } = portal;

  const encouragement = getEncouragement(stats.routeProgress);
  const ringRadius = 36;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDash = (stats.routeProgress / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white overflow-hidden font-sans flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 relative flex flex-col shadow-2xl">
        <div className="pt-10 pb-5 px-5 bg-gradient-to-b from-[#131B2C] to-[#0B0F19] sticky top-0 z-10 border-b border-white/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-xl bg-rose-500/20">
                <MapPin className="text-rose-400 w-5 h-5 flex-shrink-0" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Field route</p>
                <h1 className="text-xl font-black tracking-tight truncate">
                  {isLoading ? 'Loading...' : activeEstate?.name || 'No estate'}
                </h1>
                <p className="text-xs text-gray-400 truncate">{collectorName}</p>
              </div>
            </div>
            {isDedicatedCollector && (
              <button
                type="button"
                onClick={logoutCollector}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                Out
              </button>
            )}
          </div>

          {(estates.length > 1 || isAdminMode) && (
            <div className="mt-3 flex flex-col gap-2">
              {estates.length > 1 && (
                <select
                  value={activeEstate?.id || ''}
                  onChange={(e) => {
                    const estate = estates.find((es) => es.id === e.target.value);
                    if (estate) setActiveEstate(estate);
                  }}
                  className="w-full bg-[#131B2C] border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {estates.map((estate) => (
                    <option key={estate.id} value={estate.id}>
                      {estate.name}
                    </option>
                  ))}
                </select>
              )}
              {isAdminMode && allCollectors.length > 0 && (
                <select
                  value={selectedCollectorName}
                  onChange={(e) => setSelectedCollectorName(e.target.value)}
                  className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {allCollectors.map((c) => (
                    <option key={c.id} value={c.name}>
                      Logging as: {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 p-4 rounded-2xl bg-[#131B2C]/80 border border-white/10">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="6"
                />
                <motion.circle
                  cx="44"
                  cy="44"
                  r={ringRadius}
                  fill="none"
                  stroke="url(#progressGrad)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - strokeDash }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-white">{stats.routeProgress}%</span>
                <span className="text-[9px] text-gray-400 uppercase">done</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-white">
                  {stats.pendingDoors} doors pending
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-emerald-300 font-semibold">
                  KES {stats.collectedToday.toLocaleString()} today
                </span>
              </div>
              <p className="text-[11px] text-gray-400 flex items-start gap-1 leading-snug">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                {encouragement}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-5 pb-8 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tap red doors to collect</h2>
            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
              {stats.doneDoors}/{stats.totalDoors}
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : houses.length === 0 ? (
            <p className="text-center text-gray-500 py-16 text-sm">No doors on this route yet.</p>
          ) : (
            <CollectorDoorGrid houses={houses} onHouseClick={handleHouseClick} columns={3} />
          )}
        </div>

        <CollectorPaymentSheet
          variant="mobile"
          selectedHouse={selectedHouse}
          isSubmitting={isSubmitting}
          showIssueMenu={showIssueMenu}
          onClose={handleCloseSheet}
          onLogPayment={handleLogPayment}
          onReportIssue={handleReportIssue}
          onToggleIssueMenu={() => setShowIssueMenu((v) => !v)}
        />
      </div>
    </div>
  );
};

export default MobileCollectorGrid;
