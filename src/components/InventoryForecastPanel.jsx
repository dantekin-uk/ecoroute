import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line,
} from 'recharts';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles } from 'lucide-react';
const TrendIcon = ({ trend }) => {
  if (trend === 'rising') return <TrendingUp className="h-4 w-4 text-amber-500" />;
  if (trend === 'falling') return <TrendingDown className="h-4 w-4 text-emerald-500" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
};

const MessageCard = ({ msg }) => {
  const styles = {
    success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30',
    danger: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-500/30',
    info: 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700',
  };
  return (
    <div className={`p-3 rounded-xl border ${styles[msg.type] || styles.info}`}>
      <p className="text-xs font-bold text-gray-900 dark:text-white">{msg.title}</p>
      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{msg.body}</p>
    </div>
  );
};

const ForecastTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="bg-slate-900/95 text-white text-xs rounded-xl p-3 shadow-xl border border-slate-700 max-w-[220px]">
      <p className="font-semibold mb-2">{label}</p>
      {row?.actual != null && <p className="text-emerald-300">Actual: {row.actual}</p>}
      {row?.modelFit != null && row.actual == null && <p className="text-slate-300">Model fit: {row.modelFit}</p>}
      {row?.forecast != null && (
        <>
          <p className="text-violet-300 mt-1">Forecast: {row.forecast}</p>
          {row.forecastLow != null && (
            <p className="text-slate-400">Range: {row.forecastLow} – {row.forecastHigh}</p>
          )}
        </>
      )}
      {row?.isFuture && <p className="text-[10px] text-slate-500 mt-2">TERA projected</p>}
    </div>
  );
};

const InventoryForecastPanel = ({
  consumables,
  forecastItem,
  onForecastItemChange,
  forecast,
}) => {
  if (consumables.length === 0) return null;

  const { chartData, insights, itemName } = forecast;
  const showChart = chartData.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                TERA Forecast
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Actual usage + {insights ? '3-week' : ''} ML projection
              </p>
            </div>
          </div>
          {consumables.length > 1 && (
            <select
              value={forecastItem}
              onChange={(e) => onForecastItemChange(e.target.value)}
              className="text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white max-w-xs"
            >
              {consumables.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {showChart ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip content={<ForecastTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => {
                    const labels = {
                      actual: 'Actual dispensed',
                      forecast: 'Forecast',
                      forecastHigh: 'Confidence band',
                    };
                    return labels[value] || value;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="forecastHigh"
                  stroke="none"
                  fill="url(#bandGrad)"
                  connectNulls
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="forecastLow"
                  stroke="none"
                  fill="#0f172a"
                  fillOpacity={0}
                  connectNulls
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#actualGrad)"
                  connectNulls
                  name="actual"
                />
                <Line
                  type="monotone"
                  dataKey="modelFit"
                  stroke="#64748b"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                  legendType="none"
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: '#8b5cf6' }}
                  connectNulls
                  name="forecast"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-gray-500">
            Select a stock item to view forecasts.
          </div>
        )}

        {insights && (
          <p className="text-[10px] text-gray-400 mt-3">
            Model: {insights.modelLabel} · R² {insights.r2}% · {insights.dataWeeks} active week(s) of data
            {itemName ? ` · ${itemName}` : ''}
          </p>
        )}
      </div>

      <div className="bg-white/80 dark:bg-[#1E293B]/30 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-xl flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            TERA Insights
          </p>
        </div>

        {insights ? (
          <div className="space-y-3 flex-1">
            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/25 border border-violet-200 dark:border-violet-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-violet-700 dark:text-violet-300">Confidence</span>
                <span className="text-lg font-black text-violet-700 dark:text-violet-200">{insights.confidence}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-violet-200/50 dark:bg-violet-900/50 overflow-hidden">
                <div
                  className="h-full bg-violet-600 dark:bg-violet-400 rounded-full transition-all"
                  style={{ width: `${insights.confidence}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700">
                <p className="text-[10px] text-gray-500 uppercase">Next week</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  ~{insights.nextWeekUsage} <span className="text-xs font-normal">{insights.unit}</span>
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700">
                <p className="text-[10px] text-gray-500 uppercase flex items-center gap-1">Trend <TrendIcon trend={insights.trend} /></p>
                <p className="text-sm font-bold capitalize text-gray-900 dark:text-white">{insights.trend}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700">
                <p className="text-[10px] text-gray-500 uppercase">On hand</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {insights.quantityOnHand} {insights.unit}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700">
                <p className="text-[10px] text-gray-500 uppercase">Stockout est.</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {insights.daysUntilStockout != null ? `~${insights.daysUntilStockout}d` : '—'}
                </p>
              </div>
            </div>

            {insights.reorderQty > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/25">
                <AlertTriangle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold">Reorder ~{insights.reorderQty} {insights.unit}</span>
                  {' '}recommended to stay above alert level.
                </p>
              </div>
            )}

            <div className="space-y-2 pt-1">
              {insights.messages.map((msg, i) => (
                <MessageCard key={`${msg.title}-${i}`} msg={msg} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Add stock items and record dispenses — TERA will generate predictions automatically.
          </p>
        )}

        <p className="text-[10px] text-gray-400 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
          Predictions learn from your dispense log only. More history improves accuracy.
        </p>
      </div>
    </div>
  );
};

export default InventoryForecastPanel;
