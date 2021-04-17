import moment = require('moment');
import {Candle} from './entity/candle';

class BreakoutStrategy {
  // config
  k: number;
  shorting: boolean;
  leverage: number;

  prevCandle: Candle | null;
  balanceHist: number[];
  tradeCount: number;

  constructor(k = 0.6, shorting = true, leverage = 1) {
    this.k = k;
    this.shorting = shorting;
    this.leverage = leverage;
    this.tradeCount = 0;
  }

  backtest(candles: Candle[]): void {
    if (!candles.length) {
      return;
    }

    let lastStart = moment(candles[0].ts);
    let currentCandle = this.newDayCandle(candles[0]);

    for (const candle of candles) {
      // new day
      const date = moment(candle.ts);
      if (date.diff(lastStart, 'days') > 0) {
        lastStart = date;
        currentCandle = this.newDayCandle(candle);
      }

      currentCandle.close = candle.close;
      currentCandle.high = Math.max(currentCandle.high, candle.high);
      currentCandle.low = Math.min(currentCandle.low, candle.low);
      currentCandle.volume += candle.volume;
    }
  }

  newDayCandle(candle: Candle): Candle {
    const dayCandle = new Candle();
    dayCandle.open = candle.open;
    dayCandle.volume = 0;
    dayCandle.high = candle.high;
    dayCandle.low = candle.low;

    return dayCandle;
  }
}

export default BreakoutStrategy;
