/**
 * FASE 9: Cash Flow Forecasting Service
 * 
 * Predict future cash flow using time series analysis
 * - Linear regression for trend analysis
 * - Seasonal adjustments
 * - Confidence intervals
 * - Multiple forecasting periods (30/60/90 days)
 */

import { prisma } from './prisma';

interface CashFlowDataPoint {
  date: Date;
  amount: number;
  type: 'inflow' | 'outflow' | 'net';
}

interface ForecastResult {
  date: Date;
  predicted: number;
  lower: number; // Lower confidence bound
  upper: number; // Upper confidence bound
  confidence: number;
}

interface CashFlowForecast {
  period: string; // '30d', '60d', '90d'
  forecast: ForecastResult[];
  summary: {
    expectedCashFlow: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    risk: 'low' | 'medium' | 'high';
    confidence: number;
  };
  recommendations: string[];
}

/**
 * Get historical cash flow data
 */
async function getHistoricalCashFlow(
  companyId: string,
  days: number = 90
): Promise<CashFlowDataPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Use invoices and expenses for cash flow
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: companyId,
      status: 'PAID',
      issueDate: { gte: startDate },
    },
  });
  
  const expenses = await prisma.expense.findMany({
    where: {
      userId: companyId,
      date: { gte: startDate },
    },
  });
  
  // Group by date and calculate net cash flow
  const dailyFlow = new Map<string, { inflow: number; outflow: number }>();
  
  for (const inv of invoices) {
    const dateKey = inv.issueDate.toISOString().split('T')[0];
    const flow = dailyFlow.get(dateKey) || { inflow: 0, outflow: 0 };
    flow.inflow += parseFloat(inv.total.toString());
    dailyFlow.set(dateKey, flow);
  }
  
  for (const exp of expenses) {
    const dateKey = exp.date.toISOString().split('T')[0];
    const flow = dailyFlow.get(dateKey) || { inflow: 0, outflow: 0 };
    flow.outflow += parseFloat(exp.amount.toString());
    dailyFlow.set(dateKey, flow);
  }
  
  // Convert to array
  const data: CashFlowDataPoint[] = [];
  for (const [dateStr, flow] of dailyFlow) {
    data.push({
      date: new Date(dateStr),
      amount: flow.inflow - flow.outflow,
      type: 'net',
    });
  }
  
  return data.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Calculate linear regression
 */
function linearRegression(data: CashFlowDataPoint[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = data.length;
  
  if (n === 0) {
    return { slope: 0, intercept: 0, r2: 0 };
  }
  
  // Convert dates to numeric (days since first date)
  const firstDate = data[0].date.getTime();
  const x = data.map(d => (d.date.getTime() - firstDate) / (1000 * 60 * 60 * 24));
  const y = data.map(d => d.amount);
  
  // Calculate means
  const xMean = x.reduce((sum, val) => sum + val, 0) / n;
  const yMean = y.reduce((sum, val) => sum + val, 0) / n;
  
  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (y[i] - yMean);
    denominator += (x[i] - xMean) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Calculate R²
  const predictions = x.map(xi => slope * xi + intercept);
  const ssRes = y.reduce((sum, yi, i) => sum + (yi - predictions[i]) ** 2, 0);
  const ssTot = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const r2 = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  
  return { slope, intercept, r2 };
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Detect seasonality (day of week patterns)
 */
function calculateSeasonalFactors(data: CashFlowDataPoint[]): Map<number, number> {
  const dayOfWeekAmounts = new Map<number, number[]>();
  
  for (const point of data) {
    const dayOfWeek = point.date.getDay();
    const amounts = dayOfWeekAmounts.get(dayOfWeek) || [];
    amounts.push(point.amount);
    dayOfWeekAmounts.set(dayOfWeek, amounts);
  }
  
  // Calculate average for each day
  const overallAvg = data.reduce((sum, d) => sum + d.amount, 0) / data.length;
  const seasonalFactors = new Map<number, number>();
  
  for (const [day, amounts] of dayOfWeekAmounts) {
    const dayAvg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const factor = overallAvg !== 0 ? dayAvg / overallAvg : 1;
    seasonalFactors.set(day, factor);
  }
  
  return seasonalFactors;
}

/**
 * Forecast cash flow for future periods
 */
export async function forecastCashFlow(
  companyId: string,
  days: number = 30
): Promise<CashFlowForecast> {
  // Get historical data (3x the forecast period or at least 90 days)
  const historicalDays = Math.max(days * 3, 90);
  const historicalData = await getHistoricalCashFlow(companyId, historicalDays);
  
  if (historicalData.length < 14) {
    throw new Error('Insufficient historical data for forecasting (minimum 14 days required)');
  }
  
  // Calculate trend using linear regression
  const { slope, intercept, r2 } = linearRegression(historicalData);
  
  // Calculate seasonality
  const seasonalFactors = calculateSeasonalFactors(historicalData);
  
  // Calculate error bounds
  const amounts = historicalData.map(d => d.amount);
  const stdDev = standardDeviation(amounts);
  
  // Generate forecast
  const forecast: ForecastResult[] = [];
  const lastDate = historicalData[historicalData.length - 1].date;
  const firstDate = historicalData[0].date.getTime();
  
  for (let i = 1; i <= days; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    
    // Days since first data point
    const x = (forecastDate.getTime() - firstDate) / (1000 * 60 * 60 * 24);
    
    // Base prediction from linear regression
    let predicted = slope * x + intercept;
    
    // Apply seasonal adjustment
    const dayOfWeek = forecastDate.getDay();
    const seasonalFactor = seasonalFactors.get(dayOfWeek) || 1;
    predicted *= seasonalFactor;
    
    // Calculate confidence interval (95%)
    const margin = 1.96 * stdDev * Math.sqrt(1 + 1 / historicalData.length);
    
    forecast.push({
      date: forecastDate,
      predicted,
      lower: predicted - margin,
      upper: predicted + margin,
      confidence: Math.max(0, Math.min(1, r2)), // R² as confidence
    });
  }
  
  // Calculate summary
  const totalForecast = forecast.reduce((sum, f) => sum + f.predicted, 0);
  const avgConfidence = forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.length;
  
  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (slope > 100) trend = 'increasing';
  else if (slope < -100) trend = 'decreasing';
  
  // Assess risk
  let risk: 'low' | 'medium' | 'high' = 'low';
  const negativeDays = forecast.filter(f => f.predicted < 0).length;
  if (negativeDays > days * 0.5) risk = 'high';
  else if (negativeDays > days * 0.2) risk = 'medium';
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (risk === 'high') {
    recommendations.push('⚠️ High risk of negative cash flow detected');
    recommendations.push('Consider accelerating receivables collection');
    recommendations.push('Review and postpone non-essential expenses');
  } else if (risk === 'medium') {
    recommendations.push('Monitor cash flow closely over the next few weeks');
    recommendations.push('Ensure timely invoice payments');
  }
  
  if (trend === 'decreasing') {
    recommendations.push('📉 Declining cash flow trend detected');
    recommendations.push('Review revenue streams and cost structure');
  } else if (trend === 'increasing') {
    recommendations.push('📈 Positive cash flow trend - consider investing surplus');
  }
  
  if (avgConfidence < 0.5) {
    recommendations.push('⚠️ Low forecast confidence due to volatile historical data');
    recommendations.push('Consider additional data sources for accuracy');
  }
  
  // Log forecast
  await (prisma as any).predictionLog.create({
    data: {
      modelId: await getOrCreateForecastModel(companyId),
      companyId,
      inputData: {
        historicalDays: historicalData.length,
        forecastDays: days,
      },
      prediction: {
        totalForecast,
        trend,
        risk,
      },
      confidence: avgConfidence > 0.7 ? 'HIGH' : avgConfidence > 0.5 ? 'MEDIUM' : 'LOW',
      confidenceScore: avgConfidence,
    },
  });
  
  return {
    period: `${days}d`,
    forecast,
    summary: {
      expectedCashFlow: totalForecast,
      trend,
      risk,
      confidence: avgConfidence,
    },
    recommendations,
  };
}

/**
 * Get or create forecast model record
 */
async function getOrCreateForecastModel(companyId: string): Promise<string> {
  let model = await (prisma as any).aIModel.findFirst({
    where: {
      companyId,
      type: 'CASH_FLOW_FORECASTING',
    },
  });
  
  if (!model) {
    model = await (prisma as any).aIModel.create({
      data: {
        companyId,
        type: 'CASH_FLOW_FORECASTING',
        name: 'Cash Flow Forecaster',
        description: 'Predict future cash flow using time series analysis',
        status: 'READY',
        version: '1.0.0',
      },
    });
  }
  
  return model.id;
}

/**
 * Generate multi-period forecast
 */
export async function generateMultiPeriodForecast(companyId: string) {
  const forecasts = await Promise.all([
    forecastCashFlow(companyId, 30),
    forecastCashFlow(companyId, 60),
    forecastCashFlow(companyId, 90),
  ]);
  
  return {
    '30days': forecasts[0],
    '60days': forecasts[1],
    '90days': forecasts[2],
    generatedAt: new Date(),
  };
}

/**
 * Analyze cash flow patterns
 */
export async function analyzeCashFlowPatterns(companyId: string) {
  const data = await getHistoricalCashFlow(companyId, 180); // 6 months
  
  if (data.length === 0) {
    return {
      avgDailyFlow: 0,
      volatility: 0,
      positiveDays: 0,
      negativeDays: 0,
      longestPositiveStreak: 0,
      longestNegativeStreak: 0,
      seasonality: {},
    };
  }
  
  // Calculate metrics
  const amounts = data.map(d => d.amount);
  const avgDailyFlow = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
  const volatility = standardDeviation(amounts);
  
  let positiveDays = 0;
  let negativeDays = 0;
  let currentStreak = 0;
  let streakType: 'positive' | 'negative' | null = null;
  let longestPositiveStreak = 0;
  let longestNegativeStreak = 0;
  
  for (const point of data) {
    if (point.amount > 0) {
      positiveDays++;
      if (streakType === 'positive') {
        currentStreak++;
      } else {
        currentStreak = 1;
        streakType = 'positive';
      }
      longestPositiveStreak = Math.max(longestPositiveStreak, currentStreak);
    } else if (point.amount < 0) {
      negativeDays++;
      if (streakType === 'negative') {
        currentStreak++;
      } else {
        currentStreak = 1;
        streakType = 'negative';
      }
      longestNegativeStreak = Math.max(longestNegativeStreak, currentStreak);
    }
  }
  
  // Seasonality by day of week
  const seasonalFactors = calculateSeasonalFactors(data);
  const seasonality: Record<string, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (const [day, factor] of seasonalFactors) {
    seasonality[dayNames[day]] = factor;
  }
  
  return {
    avgDailyFlow,
    volatility,
    positiveDays,
    negativeDays,
    longestPositiveStreak,
    longestNegativeStreak,
    seasonality,
  };
}

/**
 * Get forecast accuracy (compare previous forecasts with actuals)
 */
export async function getForecastAccuracy(companyId: string, days: number = 30) {
  // Get forecasts made in the past
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - days);
  
  const predictions = await (prisma as any).predictionLog.findMany({
    where: {
      companyId,
      model: {
        type: 'CASH_FLOW_FORECASTING',
      },
      createdAt: { lte: pastDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  
  if (predictions.length === 0) {
    return {
      accuracy: 0,
      meanAbsoluteError: 0,
      meanAbsolutePercentageError: 0,
      evaluations: 0,
    };
  }
  
  let totalError = 0;
  let totalPercentError = 0;
  let count = 0;
  
  for (const pred of predictions) {
    const forecastDate = new Date(pred.createdAt);
    forecastDate.setDate(forecastDate.getDate() + days);
    
    // Get actual cash flow for the forecasted period
    const actual = await getHistoricalCashFlow(companyId, days);
    const actualTotal = actual
      .filter(d => d.date >= pred.createdAt && d.date <= forecastDate)
      .reduce((sum, d) => sum + d.amount, 0);
    
    const predicted = pred.prediction?.totalForecast || 0;
    const error = Math.abs(predicted - actualTotal);
    const percentError = actualTotal !== 0 ? (error / Math.abs(actualTotal)) * 100 : 0;
    
    totalError += error;
    totalPercentError += percentError;
    count++;
  }
  
  const mae = count > 0 ? totalError / count : 0;
  const mape = count > 0 ? totalPercentError / count : 0;
  const accuracy = Math.max(0, 1 - mape / 100);
  
  return {
    accuracy,
    meanAbsoluteError: mae,
    meanAbsolutePercentageError: mape,
    evaluations: count,
  };
}

/**
 * Scenario planning - What-if analysis
 */
export async function runScenarioAnalysis(
  companyId: string,
  scenarios: Array<{
    name: string;
    revenueChange: number; // percentage
    expenseChange: number; // percentage
  }>
) {
  const baseForecast = await forecastCashFlow(companyId, 90);
  const results = [];
  
  for (const scenario of scenarios) {
    const adjustedForecast = baseForecast.forecast.map(f => ({
      ...f,
      predicted: f.predicted * (1 + scenario.revenueChange / 100) * (1 - scenario.expenseChange / 100),
    }));
    
    const totalCashFlow = adjustedForecast.reduce((sum, f) => sum + f.predicted, 0);
    const negativeDays = adjustedForecast.filter(f => f.predicted < 0).length;
    
    results.push({
      scenario: scenario.name,
      totalCashFlow,
      negativeDays,
      impact: totalCashFlow - baseForecast.summary.expectedCashFlow,
      impactPercent: ((totalCashFlow - baseForecast.summary.expectedCashFlow) / baseForecast.summary.expectedCashFlow) * 100,
    });
  }
  
  return {
    base: {
      totalCashFlow: baseForecast.summary.expectedCashFlow,
    },
    scenarios: results,
  };
}
