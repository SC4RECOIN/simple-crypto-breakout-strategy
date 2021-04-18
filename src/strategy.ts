import moment from 'moment';
import numeral from 'numeral';
import {Candle} from './entity/candle';
import {Config} from './entity/types';
import {maxDrawdown, validateConfig} from './utils';

class BreakoutStrategy {
  // config
  k: number;
  shorting: boolean;
  leverage: number;
  sl: number | null;
  alwaysLong: boolean;

  // portfolio
  balance: number;
  holding: boolean;
  balanceHist: number[];
  tradeCount: number;
  entry: number;

  // track trades
  lastStart: moment.Moment | null;
  currentCandle: Candle | null;
  target: number | null;
  stoploss: number | null;
  long: boolean;

  constructor(config: Config) {
    validateConfig(config);

    this.k = config.k;
    this.shorting = config.shorting;
    this.leverage = config.leverage;
    this.sl = config.stopLoss;
    this.alwaysLong = config.alwaysLong;

    this.tradeCount = 0;
    this.holding = false;
    this.balance = 10000;
    this.balanceHist = [10000];
  }

  printStats(): void {
    if (!this.balanceHist.length) {
      console.log('Run `backtest` before printing results');
    }

    const days = this.balanceHist.length - 1;
    const last = this.balanceHist[days];
    const ret = last / this.balanceHist[0] - 1;
    const annual = (1 + ret) ** (365 / days) - 1;
    const mDrawdown = maxDrawdown(this.balanceHist);

    console.log('return: ', numeral(ret).format('0.00 %'));
    console.log('annualized return: ', numeral(annual).format('0.00 %'));
    console.log('max drawdown: ', numeral(mDrawdown).format('0.00 %'));
    console.log('trades: ', this.tradeCount);
  }

  currentPositionReturn(price: number) {
    const posReturn = price / this.entry - 1;
    if (!this.long) return posReturn * -1;
    return posReturn;
  }

  closePositions(price: number) {
    // sell if open position
    if (this.holding) {
      const posReturn = this.currentPositionReturn(price) * this.balance;

      // simulate leverage
      this.balance += posReturn * this.leverage;
      this.holding = false;
    }
  }

  openPosition(price: number) {
    this.tradeCount += 1;
    this.holding = true;
    this.entry = this.target || price;

    // don't want to rebuy until we get new target
    this.target = null;
  }

  reportTrade(price: number, ts: number): void {
    if (!this.currentCandle) {
      this.currentCandle = this.newDayCandle(price);
      this.lastStart = moment(ts);
      return;
    }

    const date = moment(ts);
    if (date.diff(this.lastStart, 'days') > 0) {
      // close positions
      this.closePositions(price);
      this.balanceHist.push(this.balance);

      // new range target
      this.long = this.currentCandle.close > this.currentCandle.open;
      let range = this.currentCandle.high - this.currentCandle.low;

      if (this.alwaysLong) {
        this.long = true;
      }

      let stoploss = this.sl;
      if (!this.long) {
        range *= -1;
        if (stoploss) stoploss *= -1;
      }

      // position target and stop loss
      this.target = price + range * this.k;
      if (stoploss) this.stoploss = this.target * (1 - stoploss);

      // reset day candle
      this.lastStart = date;
      this.currentCandle = this.newDayCandle(price);
    }

    if (this.target && !this.holding) {
      // hit long target
      if (this.long && price > this.target) {
        this.openPosition(price);
      }

      // hit short target
      if (!this.long && this.shorting && price < this.target) {
        this.openPosition(price);
      }
    }

    // hit stop loss
    if (this.stoploss && this.holding) {
      // close long
      if (this.long && price < this.stoploss) {
        this.closePositions(this.stoploss);
      }
      // close short
      if (!this.long && price > this.stoploss) {
        this.closePositions(this.stoploss);
      }
    }

    if (this.holding) {
      const posReturn = this.currentPositionReturn(price);
      if (posReturn * this.leverage < -0.9) {
        console.log('Long: ', this.long);
        console.log('Entry price: ', this.entry);
        console.log('Price: ', price);
        console.log('Date: ', date);
        throw new Error('Account liquidated');
      }
    }

    this.currentCandle.close = price;
    this.currentCandle.high = Math.max(this.currentCandle.high, price);
    this.currentCandle.low = Math.min(this.currentCandle.low, price);
  }

  backtest(candles: Candle[]): void {
    for (const candle of candles) {
      // for new day targets
      this.reportTrade(candle.open, candle.ts);

      // for stop-loss hits
      this.reportTrade(candle.low, candle.ts);

      // for target hits
      this.reportTrade(candle.high, candle.ts);
    }
  }

  newDayCandle(price: number): Candle {
    const dayCandle = new Candle();
    dayCandle.open = price;
    dayCandle.volume = 0;
    dayCandle.high = price;
    dayCandle.low = price;

    return dayCandle;
  }
}

export default BreakoutStrategy;
