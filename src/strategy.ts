import moment = require('moment');
import numeral = require('numeral');
import {Candle} from './entity/candle';

class BreakoutStrategy {
  // config
  k: number;
  shorting: boolean;
  leverage: number;
  sl: number | null;

  balance: number;
  holding: boolean;
  balanceHist: number[];
  tradeCount: number;

  constructor(k = 0.6, stopLoss = null, shorting = false, leverage = 1) {
    this.k = k;
    this.shorting = shorting;
    this.leverage = leverage;
    this.sl = stopLoss;

    this.tradeCount = 0;
    this.holding = false;
    this.balance = 10000;
    this.balanceHist = [];
  }

  printStats(): void {
    if (!this.balanceHist.length) {
      console.log('Run `backtest` before printing results');
    }
    const last = this.balanceHist[this.balanceHist.length - 1];
    const ret = last / this.balanceHist[0] - 1;

    // find max drawdown
    let maxValue = 0;
    let maxDrawdown = 0;
    for (const balance of this.balanceHist) {
      maxValue = Math.max(maxValue, balance);
      maxDrawdown = Math.min(maxDrawdown, balance / maxValue - 1);
    }

    console.log('return', numeral(ret).format('0.00 %'));
    console.log('max drawdown', numeral(maxDrawdown).format('0.00 %'));
  }

  backtest(candles: Candle[]): void {
    if (!candles.length) {
      return;
    }

    let lastStart = moment(candles[0].ts);
    let currentCandle = this.newDayCandle(candles[0]);
    let target;

    for (const candle of candles) {
      // new day
      const date = moment(candle.ts);
      if (date.diff(lastStart, 'days') > 0) {
        // calculate next target
        const range = currentCandle.high - currentCandle.low;
        target = candle.open + range * this.k;

        // sell if open position
        if (this.holding) {
          this.holding = false;
          this.balance *= candle.open;
        }

        lastStart = date;
        currentCandle = this.newDayCandle(candle);
        this.balanceHist.push(this.balance);
      }

      // hit buy target
      if (target && !this.holding && candle.high > target) {
        this.holding = true;
        this.balance = this.balance / target;

        // don't want to hit sl and then rebuy at target
        target = null;
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
