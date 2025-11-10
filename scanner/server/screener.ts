/**
 * Bullish Breakout Screener Algorithm
 * 
 * Implements 5 technical indicators:
 * 1. SMA Breakout (25 points max)
 * 2. MACD (20 points max)
 * 3. RSI (20 points max)
 * 4. Volume Analysis (15 points max)
 * 5. 52-Week High Breakout (15 points max)
 * 
 * Total: 100 points max
 */

export interface StockData {
  symbol: string;
  prices: number[];
  volumes: number[];
  dates: string[];
}

export interface TechnicalIndicators {
  sma10: number;
  sma50: number;
  sma200: number;
  rsi: number;
  macdLine: number;
  signalLine: number;
  histogram: number;
  volumeRatio: number;
  high52w: number;
  currentPrice: number;
  avgVolume20: number;
  atr: number;
}

export interface TradingLevels {
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward: number;
}

export interface IndicatorScores {
  sma: number;
  macd: number;
  rsi: number;
  volume: number;
  highBreakout: number;
}

export interface ScreenerResult {
  symbol: string;
  totalScore: number;
  scores: IndicatorScores;
  indicators: TechnicalIndicators;
  recommendation: 'STRONG BUY' | 'BUY' | 'WATCH' | 'PASS';
  alerts: string[];
  priceChange: number;
  tradingLevels: TradingLevels;
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
}

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(prices: number[]): { macdLine: number; signalLine: number; histogram: number } {
  if (prices.length < 26) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  // Calculate signal line (9-day EMA of MACD)
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdValues.push(e12 - e26);
  }
  
  const signalLine = calculateEMA(macdValues, 9);
  const histogram = macdLine - signalLine;
  
  return { macdLine, signalLine, histogram };
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter(c => c > 0);
  const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));
  
  const avgGain = gains.length > 0 ? gains.reduce((sum, g) => sum + g, 0) / period : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, l) => sum + l, 0) / period : 0;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return rsi;
}

/**
 * Calculate ATR (Average True Range) for volatility measurement
 * Uses simplified approach based on price changes when high/low data unavailable
 */
export function calculateATR(prices: number[], period: number = 14): number {
  if (prices.length < 2) return 0;
  
  // Calculate True Range using adjacent close prices (simplified approach)
  const trueRanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const tr = Math.abs(prices[i] - prices[i - 1]);
    trueRanges.push(tr);
  }
  
  if (trueRanges.length < period) {
    // Not enough data, return simple average
    return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  }
  
  // Use Wilder's smoothing method
  let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
  
  for (let i = period; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period;
  }
  
  return atr;
}

/**
 * Calculate trading levels (entry, stop loss, targets) based on volatility
 */
export function calculateTradingLevels(indicators: TechnicalIndicators): TradingLevels {
  const { currentPrice, atr, sma10, sma50, sma200, high52w } = indicators;
  
  // Guard against invalid data
  if (currentPrice <= 0 || atr <= 0) {
    return {
      entry: currentPrice,
      stopLoss: currentPrice * 0.95,
      target1: currentPrice * 1.10,
      target2: currentPrice * 1.20,
      target3: currentPrice * 1.30,
      riskReward: 2.0,
    };
  }
  
  // Entry price is current market price
  const entry = currentPrice;
  
  // Stop Loss: Tighter (higher) of (1.5×ATR below entry) or (2% below nearest SMA support)
  const stopLossCandidateAtr = entry - (1.5 * atr);
  
  // Find nearest SMA support level BELOW current price
  const smaSupportsAboveZero = [sma10, sma50, sma200].filter(sma => sma > 0 && sma < entry);
  const nearestSmaSupport = smaSupportsAboveZero.length > 0 
    ? Math.max(...smaSupportsAboveZero) // Highest SMA below price
    : 0;
  
  const stopLossCandidateSma = nearestSmaSupport > 0 
    ? nearestSmaSupport * 0.98 // 2% below SMA support
    : 0;
  
  // Use TIGHTER (higher) stop loss - protects capital better
  let stopLossRaw = Math.max(stopLossCandidateAtr, stopLossCandidateSma);
  
  // Apply 5% hard floor
  const stopLossFloor = entry * 0.95;
  let stopLoss = Math.max(stopLossRaw, stopLossFloor);
  
  // Ensure stop loss is below entry
  if (stopLoss >= entry) {
    stopLoss = entry * 0.99; // 1% buffer minimum
  }
  
  // Target levels
  const target1 = entry * 1.10;  // 10% quick profit
  const target2 = entry * 1.20;  // 20% swing target
  let target3 = Math.min(entry + (3 * atr), high52w > entry ? high52w : entry * 1.30); // ATR-based or 52w high
  
  // Ensure targets are monotonically increasing
  if (target3 < target2) {
    target3 = target2 * 1.05; // At least 5% above target2
  }
  
  // Risk/Reward ratio
  const risk = Math.max(entry - stopLoss, Number.EPSILON);
  const reward = target1 - entry;
  const riskReward = reward / risk;
  
  return {
    entry: Number(entry.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    target1: Number(target1.toFixed(2)),
    target2: Number(target2.toFixed(2)),
    target3: Number(target3.toFixed(2)),
    riskReward: Number(riskReward.toFixed(2)),
  };
}

/**
 * Calculate all technical indicators
 */
export function calculateIndicators(data: StockData): TechnicalIndicators {
  const { prices, volumes } = data;
  const currentPrice = prices[prices.length - 1];
  
  return {
    sma10: calculateSMA(prices, 10),
    sma50: calculateSMA(prices, 50),
    sma200: calculateSMA(prices, 200),
    rsi: calculateRSI(prices, 14),
    ...calculateMACD(prices),
    volumeRatio: volumes[volumes.length - 1] / calculateSMA(volumes, 20),
    high52w: Math.max(...prices),
    currentPrice,
    avgVolume20: calculateSMA(volumes, 20),
    atr: calculateATR(prices, 14),
  };
}

/**
 * Score SMA Breakout (25 points max)
 * 
 * Criteria:
 * - Price > SMA200: 10 points
 * - Price > SMA50: 8 points
 * - SMA10 > SMA50 (Golden Cross setup): 7 points
 */
export function scoreSMABreakout(price: number, indicators: TechnicalIndicators): number {
  let score = 0;
  
  // Price above 200-day SMA (strong uptrend)
  if (price > indicators.sma200) {
    score += 10;
  }
  
  // Price above 50-day SMA
  if (price > indicators.sma50) {
    score += 8;
  }
  
  // 10-day SMA above 50-day SMA (Golden Cross setup)
  if (indicators.sma10 > indicators.sma50) {
    score += 7;
  }
  
  return score;
}

/**
 * Score MACD (20 points max)
 * 
 * Criteria:
 * - MACD line > 0: 8 points
 * - MACD line > Signal line (bullish crossover): 12 points
 */
export function scoreMACDIndicator(indicators: TechnicalIndicators): number {
  let score = 0;
  
  // MACD line above zero (bullish momentum)
  if (indicators.macdLine > 0) {
    score += 8;
  }
  
  // MACD line above signal line (bullish crossover)
  if (indicators.macdLine > indicators.signalLine) {
    score += 12;
  }
  
  return score;
}

/**
 * Score RSI (20 points max)
 * 
 * Criteria:
 * - RSI between 50-70 (bullish but not overbought): 20 points
 * - RSI between 40-50: 12 points
 * - RSI between 70-80: 10 points
 * - RSI > 80 (overbought): 5 points
 * - RSI < 40 (bearish): 0 points
 */
export function scoreRSI(rsi: number): number {
  if (rsi >= 50 && rsi <= 70) {
    return 20; // Sweet spot - bullish but not overbought
  } else if (rsi >= 40 && rsi < 50) {
    return 12; // Moderately bullish
  } else if (rsi > 70 && rsi <= 80) {
    return 10; // Overbought but still acceptable
  } else if (rsi > 80) {
    return 5; // Too overbought
  }
  return 0; // Bearish
}

/**
 * Score Volume (15 points max)
 * 
 * Criteria:
 * - Volume > 2x average: 15 points
 * - Volume > 1.5x average: 10 points
 * - Volume > 1.2x average: 5 points
 */
export function scoreVolume(volumeRatio: number): number {
  if (volumeRatio >= 2.0) {
    return 15;
  } else if (volumeRatio >= 1.5) {
    return 10;
  } else if (volumeRatio >= 1.2) {
    return 5;
  }
  return 0;
}

/**
 * Score 52-Week High Breakout (15 points max)
 * 
 * Criteria:
 * - At 52-week high: 15 points
 * - Within 5% of 52-week high: 10 points
 * - Within 10% of 52-week high: 5 points
 */
export function scoreHighBreakout(price: number, high52w: number): number {
  const percentFromHigh = ((high52w - price) / high52w) * 100;
  
  if (percentFromHigh <= 0) {
    return 15; // New high
  } else if (percentFromHigh <= 5) {
    return 10;
  } else if (percentFromHigh <= 10) {
    return 5;
  }
  return 0;
}

/**
 * Generate alerts based on indicators
 */
export function generateAlerts(indicators: TechnicalIndicators): string[] {
  const alerts: string[] = [];
  
  // Golden Cross: 50-day SMA crossed above 200-day SMA
  if (indicators.sma50 > indicators.sma200 && indicators.sma10 > indicators.sma50) {
    alerts.push('GOLDEN_CROSS');
  }
  
  // Volume surge: 3x or more than average
  if (indicators.volumeRatio >= 3.0) {
    alerts.push('VOLUME_SURGE_3X');
  }
  
  // New 52-week high
  if (indicators.currentPrice >= indicators.high52w) {
    alerts.push('NEW_52W_HIGH');
  }
  
  // Strong MACD crossover
  if (indicators.macdLine > indicators.signalLine && indicators.histogram > 0) {
    alerts.push('MACD_BULLISH_CROSSOVER');
  }
  
  return alerts;
}

/**
 * Get recommendation based on total score
 */
export function getRecommendation(totalScore: number): 'STRONG BUY' | 'BUY' | 'WATCH' | 'PASS' {
  if (totalScore >= 80) return 'STRONG BUY';
  if (totalScore >= 70) return 'BUY';
  if (totalScore >= 60) return 'WATCH';
  return 'PASS';
}

/**
 * Main screener function - analyze a stock and return results
 */
export function analyzeStock(data: StockData): ScreenerResult {
  const indicators = calculateIndicators(data);
  
  const scores: IndicatorScores = {
    sma: scoreSMABreakout(indicators.currentPrice, indicators),
    macd: scoreMACDIndicator(indicators),
    rsi: scoreRSI(indicators.rsi),
    volume: scoreVolume(indicators.volumeRatio),
    highBreakout: scoreHighBreakout(indicators.currentPrice, indicators.high52w),
  };
  
  const totalScore = scores.sma + scores.macd + scores.rsi + scores.volume + scores.highBreakout;
  const alerts = generateAlerts(indicators);
  const recommendation = getRecommendation(totalScore);
  const tradingLevels = calculateTradingLevels(indicators);
  
  // Calculate price change (current vs previous day)
  const priceChange = data.prices.length >= 2
    ? ((data.prices[data.prices.length - 1] - data.prices[data.prices.length - 2]) / data.prices[data.prices.length - 2]) * 100
    : 0;
  
  return {
    symbol: data.symbol,
    totalScore,
    scores,
    indicators,
    recommendation,
    alerts,
    priceChange,
    tradingLevels,
  };
}
