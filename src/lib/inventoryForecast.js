/**
 * TERA inventory forecasting — lightweight ML-style models on dispense history:
 * - Linear regression (trend)
 * - Exponential smoothing (short-term level)
 * - Confidence from R² and sample size
 */

const WEEKS_HISTORY = 8;
const WEEKS_FORECAST = 3;

function linearRegression(points) {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y, r2: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  points.forEach(({ x, y }) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  });

  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  points.forEach(({ x, y }) => {
    const fit = slope * x + intercept;
    ssRes += (y - fit) ** 2;
    ssTot += (y - meanY) ** 2;
  });
  const r2 = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));

  return { slope, intercept, r2 };
}

function exponentialSmoothing(values, alpha = 0.4) {
  if (values.length === 0) return 0;
  let level = values[0];
  for (let i = 1; i < values.length; i++) {
    level = alpha * values[i] + (1 - alpha) * level;
  }
  return level;
}

function weekLabel(weeksAgo) {
  if (weeksAgo > 0) return `${weeksAgo}w ago`;
  if (weeksAgo === 0) return 'This week';
  return `+${Math.abs(weeksAgo)}w`;
}

function aggregateWeeklyUsage(logs, itemName) {
  const now = new Date();
  const buckets = {};

  for (let w = WEEKS_HISTORY - 1; w >= 0; w--) {
    buckets[w] = 0;
  }

  logs
    .filter((l) => l.item === itemName)
    .forEach((log) => {
      const d = new Date(log.timestamp);
      const daysAgo = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysAgo / 7);
      if (weekIndex >= 0 && weekIndex < WEEKS_HISTORY) {
        buckets[WEEKS_HISTORY - 1 - weekIndex] += Number(log.quantity || 0);
      }
    });

  return Array.from({ length: WEEKS_HISTORY }, (_, i) => ({
    weekIndex: i,
    weeksAgo: WEEKS_HISTORY - 1 - i,
    label: weekLabel(WEEKS_HISTORY - 1 - i),
    actual: buckets[i],
  }));
}

export function pickBestForecastItem(consumables, dispenseLogs) {
  if (consumables.length === 0) return null;

  const counts = {};
  dispenseLogs.forEach((l) => {
    counts[l.item] = (counts[l.item] || 0) + Number(l.quantity || 0);
  });

  let best = consumables[0].name;
  let bestScore = counts[best] || 0;

  consumables.forEach((c) => {
    const score = counts[c.name] || 0;
    if (score > bestScore) {
      bestScore = score;
      best = c.name;
    }
  });

  return best;
}

export function buildInventoryForecast(consumables, dispenseLogs, itemName) {
  const consumable = consumables.find((c) => c.name === itemName);
  if (!consumable) {
    return {
      itemName: itemName || null,
      chartData: [],
      insights: null,
      hasEnoughData: false,
    };
  }

  const history = aggregateWeeklyUsage(dispenseLogs, itemName);
  const actuals = history.map((h) => h.actual);
  const nonZeroWeeks = actuals.filter((v) => v > 0).length;
  const totalDispensed = actuals.reduce((a, b) => a + b, 0);

  const regressionPoints = history.map((h, i) => ({ x: i, y: h.actual }));
  const { slope, intercept, r2 } = linearRegression(regressionPoints);
  const smoothedLevel = exponentialSmoothing(actuals.filter((v) => v > 0).length ? actuals : [0]);

  const lastIndex = WEEKS_HISTORY - 1;

  function blendedForecast(stepIndex) {
    const reg = Math.max(0, slope * (lastIndex + stepIndex) + intercept);
    const weightReg = Math.min(0.7, 0.3 + nonZeroWeeks * 0.08);
    return weightReg * reg + (1 - weightReg) * smoothedLevel;
  }

  const residuals = history.map((h, i) => h.actual - (slope * i + intercept));
  const stdErr = residuals.length > 1
    ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length)
    : smoothedLevel * 0.25;

  const sampleFactor = Math.min(1, (nonZeroWeeks + totalDispensed > 0 ? 1 : 0) * (0.35 + nonZeroWeeks * 0.1));
  const confidence = Math.round(Math.min(92, Math.max(18, (r2 * 55 + sampleFactor * 40))));

  const chartData = [];

  history.forEach((h, i) => {
    const fit = Math.max(0, slope * i + intercept);
    chartData.push({
      week: h.label,
      actual: h.actual,
      modelFit: Math.round(fit),
      forecast: null,
      forecastLow: null,
      forecastHigh: null,
      isFuture: false,
    });
  });

  const lastActual = actuals[actuals.length - 1] || 0;
  for (let f = 1; f <= WEEKS_FORECAST; f++) {
    const pred = Math.round(blendedForecast(f));
    const margin = Math.round(stdErr * (1.2 + (WEEKS_FORECAST - f) * 0.15));
    chartData.push({
      week: weekLabel(-f),
      actual: null,
      modelFit: null,
      forecast: pred,
      forecastLow: Math.max(0, pred - margin),
      forecastHigh: pred + margin,
      isFuture: true,
    });
  }

  const nextWeekUsage = Math.round(blendedForecast(1));
  const weeklyBurn = nextWeekUsage > 0
    ? nextWeekUsage
    : totalDispensed > 0
      ? Math.ceil(totalDispensed / Math.max(1, nonZeroWeeks))
      : 0;

  const dailyBurn = weeklyBurn / 7;
  const daysUntilStockout = dailyBurn > 0
    ? Math.floor(consumable.quantity / dailyBurn)
    : null;

  const targetCoverWeeks = 2;
  const reorderQty = Math.max(
    0,
    Math.ceil(targetCoverWeeks * weeklyBurn + (consumable.criticalThreshold || 0) - consumable.quantity),
  );

  let trend = 'stable';
  if (slope > weeklyBurn * 0.08) trend = 'rising';
  else if (slope < -weeklyBurn * 0.08) trend = 'falling';

  const anomaly = lastActual > 0 && nextWeekUsage > 0 && lastActual > nextWeekUsage * 1.45;

  const messages = [];

  if (nonZeroWeeks < 2 && totalDispensed === 0) {
    messages.push({
      type: 'info',
      title: 'Learning your patterns',
      body: 'Record a few dispenses over 2+ weeks. TERA will unlock higher-confidence forecasts.',
    });
  } else {
    messages.push({
      type: trend === 'rising' ? 'warning' : 'success',
      title: trend === 'rising' ? 'Demand trending up' : trend === 'falling' ? 'Demand easing' : 'Stable burn rate',
      body: `Next week forecast: ~${nextWeekUsage} ${consumable.unit} (${confidence}% confidence).`,
    });

    if (daysUntilStockout !== null && daysUntilStockout <= 14) {
      messages.push({
        type: daysUntilStockout <= 7 ? 'danger' : 'warning',
        title: daysUntilStockout <= 7 ? 'Stockout risk' : 'Reorder window',
        body: `At current burn, ${consumable.name} may run out in ~${daysUntilStockout} days.`,
      });
    }

    if (reorderQty > 0) {
      messages.push({
        type: 'info',
        title: 'Suggested reorder',
        body: `Order ~${reorderQty} ${consumable.unit} to cover ${targetCoverWeeks} weeks plus your alert level.`,
      });
    }

    if (anomaly) {
      messages.push({
        type: 'warning',
        title: 'Usage spike detected',
        body: 'This week is well above the model — check for waste or one-off jobs.',
      });
    }
  }

  return {
    itemName,
    chartData,
    hasEnoughData: chartData.length > 0,
    insights: {
      confidence,
      modelLabel: 'Linear trend + exponential smoothing',
      nextWeekUsage,
      weeklyBurn,
      unit: consumable.unit,
      quantityOnHand: consumable.quantity,
      daysUntilStockout,
      reorderQty,
      trend,
      anomaly,
      r2: Math.round(r2 * 100),
      dataWeeks: nonZeroWeeks,
      messages,
    },
  };
}
