import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { motion } from 'framer-motion';

const RANGES = [
  { id: '6m', label: '6 months', months: 6 },
  { id: '12m', label: '12 months', months: 12 },
];

function buildMonthSeries(expenses, monthCount, categoryFilter) {
  const now = new Date();
  const months = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      ...(monthCount > 6 ? { year: '2-digit' } : {}),
    });
    months.push({ key, label });
  }

  const totals = {};
  const counts = {};
  months.forEach((m) => {
    totals[m.key] = 0;
    counts[m.key] = 0;
  });

  expenses.forEach((e) => {
    if (categoryFilter !== 'All' && e.category !== categoryFilter) return;
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (totals[key] !== undefined) {
      totals[key] += Number(e.amount || 0);
      counts[key] += 1;
    }
  });

  return months.map((m) => ({
    month: m.label,
    amount: Math.round(totals[m.key]),
    count: counts[m.key],
  }));
}

function buildCategoryBars(expenses, categoryFilter) {
  const totals = {};
  expenses.forEach((e) => {
    if (categoryFilter !== 'All' && e.category !== categoryFilter) return;
    const cat = e.category || 'General';
    totals[cat] = (totals[cat] || 0) + Number(e.amount || 0);
  });

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value: Math.round(value) }));
}

const SpendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/95 px-4 py-3 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      <p className="text-rose-300 font-bold text-sm">KES {Number(row?.amount || 0).toLocaleString()}</p>
      {row?.count > 0 && (
        <p className="text-slate-400 mt-1">{row.count} transaction{row.count !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
};

const CategoryTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/95 px-3 py-2 shadow-xl text-xs">
      <p className="text-white font-semibold">{payload[0].payload.name}</p>
      <p className="text-rose-300 font-bold">KES {Number(payload[0].value).toLocaleString()}</p>
    </div>
  );
};

const ExpensesSpendChart = ({ expenses, categoryFilter = 'All' }) => {
  const [range, setRange] = useState('6m');
  const [view, setView] = useState('trend');

  const monthCount = RANGES.find((r) => r.id === range)?.months || 6;

  const trendData = useMemo(
    () => buildMonthSeries(expenses, monthCount, categoryFilter),
    [expenses, monthCount, categoryFilter],
  );

  const categoryData = useMemo(
    () => buildCategoryBars(expenses, categoryFilter),
    [expenses, categoryFilter],
  );

  const totalInRange = trendData.reduce((s, d) => s + d.amount, 0);
  const avgMonthly = trendData.length ? Math.round(totalInRange / trendData.length) : 0;
  const peak = trendData.reduce((best, d) => (d.amount > best.amount ? d : best), { amount: 0, month: '—' });

  const hasData = expenses.length > 0 && totalInRange > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
    >
      <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              Spend analytics
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {categoryFilter === 'All' ? 'All categories' : categoryFilter} · live from your records
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
              {[
                { id: 'trend', label: 'Trend' },
                { id: 'categories', label: 'By category' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    view === v.id
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {view === 'trend' && (
              <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRange(r.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      range === r.id
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-gray-500'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {hasData && (
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-3">
              <p className="text-[10px] uppercase font-semibold text-rose-600/80 dark:text-rose-400">Period total</p>
              <p className="text-lg font-black text-rose-700 dark:text-rose-300">KES {totalInRange.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 p-3">
              <p className="text-[10px] uppercase font-semibold text-gray-500">Monthly avg</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">KES {avgMonthly.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 p-3">
              <p className="text-[10px] uppercase font-semibold text-gray-500">Peak month</p>
              <p className="text-lg font-black text-gray-900 dark:text-white truncate">
                {peak.month} <span className="text-sm font-bold text-rose-600">KES {peak.amount.toLocaleString()}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 pt-2">
        {!hasData ? (
          <div className="h-56 flex flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="font-medium text-gray-700 dark:text-gray-300">No spend data yet</p>
            <p className="text-xs mt-1 max-w-xs">Log expenses to see monthly trends and category breakdowns.</p>
          </div>
        ) : view === 'trend' ? (
          <div className="h-64 sm:h-72 w-full min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  width={48}
                />
                <Tooltip content={<SpendTooltip />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fill="url(#expenseAreaGrad)"
                  dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#fb7185', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" className="dark:opacity-20" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CategoryTooltip />} cursor={{ fill: 'rgba(244, 63, 94, 0.08)' }} />
                <Bar dataKey="value" fill="#f43f5e" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ExpensesSpendChart;
