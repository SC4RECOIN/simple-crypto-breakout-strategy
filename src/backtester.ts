import moment from 'moment';
import numeral from 'numeral';
import {Candle} from './entity/candle';
import {Config} from './entity/types';
import SQLiteDB from './sqlite';
import {maxDrawdown, validateConfig} from './utils';
import fs from 'fs';

class BackTester {
  // config
  k: number;
  shorting: boolean;
  leverage: number;
  sl: number | null;
  tStop: number | null;
  alwaysLong: boolean;
  pair: string;
  impact: number;

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
  stoploss: number;
  long: boolean;

  // high water mark for tStop
  hwm: number;
  lwm: number;

  constructor(config: Config) {
    validateConfig(config);

    this.k = config.k;
    this.shorting = config.shorting;
    this.leverage = config.leverage;
    this.sl = config.stopLoss;
    this.tStop = config.trailingStop;
    this.alwaysLong = config.alwaysLong;
    this.pair = config.pair;
    this.impact = config.fee + config.slippage;

    this.tradeCount = 0;
    this.hwm = Number.NEGATIVE_INFINITY;
    this.lwm = Number.POSITIVE_INFINITY;
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

    console.log('days: ', days);
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
      let posReturn = this.currentPositionReturn(price);

      // fees & slippage on entry and exit
      posReturn -= this.impact * 2;

      // simulate leverage
      this.balance += posReturn * this.balance * this.leverage;
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

  reportTrade(c: Candle): void {
    if (!this.currentCandle) {
      this.currentCandle = this.newDayCandle(c);
      this.lastStart = moment(c.ts).utc().startOf('day');
      return;
    }

    const date = moment(c.ts);
    this.hwm = Math.max(this.hwm, c.high);
    this.lwm = Math.min(this.lwm, c.low);

    if (date.diff(this.lastStart, 'days') > 0) {
      // close positions
      this.closePositions(c.close);
      this.balanceHist.push(this.balance);

      // new range target
      this.long = this.currentCandle.close > this.currentCandle.open;
      let range = this.currentCandle.high - this.currentCandle.low;

      if (this.alwaysLong) {
        this.long = true;
      }

      let stoploss = this.sl || this.tStop;
      if (!this.long) {
        range *= -1;
        if (stoploss) stoploss *= -1;
      }

      // position target and stop loss
      this.target = c.open + range * this.k;
      if (stoploss) this.stoploss = this.target * (1 - stoploss);

      // reset day candle and water marks
      this.lastStart = this.lastStart?.add(1, 'days') || date;
      this.hwm = c.high;
      this.lwm = c.low;
      this.currentCandle = this.newDayCandle(c);
    }

    // adjust trailing stop-loss
    if (this.tStop) {
      if (this.long) {
        const tStop = this.hwm * (1 - this.tStop);
        this.stoploss = Math.max(this.stoploss || 0, tStop);
      } else {
        const tStop = this.lwm * (1 + this.tStop);
        this.stoploss = Math.min(this.stoploss || 0, tStop);
      }
    }

    if (this.target && !this.holding) {
      // hit long target
      if (this.long && c.high > this.target) {
        this.openPosition(this.target);
      }

      // hit short target
      if (!this.long && this.shorting && c.low < this.target) {
        this.openPosition(this.target);
      }
    }

    // hit stop-loss
    if (this.stoploss && this.holding) {
      // close long
      if (this.long && c.low < this.stoploss) {
        this.closePositions(this.stoploss);
      }
      // close short
      if (!this.long && c.high > this.stoploss) {
        this.closePositions(this.stoploss);
      }
    }

    // check if liquidated
    if (this.holding) {
      const value = this.long ? c.low : c.high;
      const posReturn = this.currentPositionReturn(value);
      if (posReturn * this.leverage < -0.9) {
        console.log('Long: ', this.long);
        console.log('Entry price: ', this.entry);
        console.log('Price: ', value);
        console.log('Date: ', date);
        throw new Error('Account liquidated');
      }
    }

    this.currentCandle.close = c.close;
    this.currentCandle.high = Math.max(this.currentCandle.high, c.high);
    this.currentCandle.low = Math.min(this.currentCandle.low, c.low);
  }

  async backtest(): Promise<void> {
    const sqlite = await SQLiteDB.getConnection();
    const candles: {[key: number]: Candle[]} = {};
    const timestamps = new Set();

    const c = await sqlite.getCandles({symbol: this.pair});
    for (const candle of c) {
      timestamps.add(candle.ts);
      candles[candle.ts] ||= [];
      candles[candle.ts].push(candle);
    }

    for (const ts of [...timestamps].sort()) {
      const key = ts as number;
      for (const candle of candles[key]) {
        this.reportTrade(candle);
      }
    }

    // write balances to file
    let csv = 'index,balance\n';
    this.balanceHist.map((bal, idx) => (csv += `${idx},${bal}\n`));
    fs.writeFile('balances.csv', csv, (err: unknown) => {
      if (err) throw err;
    });

    this.printStats();

    // benchmark
    const bench = c[c.length - 1].close / c[0].open - 1;
    const mDrawdown = maxDrawdown(c.map(x => x.close));
    console.log('benchmark: ', numeral(bench).format('0.00 %'));
    console.log('benchmark md: ', numeral(mDrawdown).format('0.00 %'));
  }

  newDayCandle(candle: Candle): Candle {
    const dayCandle = new Candle();
    dayCandle.open = candle.open;
    dayCandle.high = candle.high;
    dayCandle.low = candle.low;

    return dayCandle;
  }
}

export default BackTester;
