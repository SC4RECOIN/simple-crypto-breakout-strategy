import moment from 'moment';
import numeral from 'numeral';
import {Candle} from './entity/candle';
import {Config} from './entity/types';
import SQLiteDB from './sqlite';
import {maxDrawdown, validateConfig} from './utils';
import 'reflect-metadata';

class BackTester {
  // config
  k: number;
  shorting: boolean;
  leverage: number;
  sl: number | null;
  tStop: number | null;
  alwaysLong: boolean;
  pairs: string[];

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
    this.pairs = config.universe;

    this.tradeCount = 0;
    this.hwm = 0;
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
      this.lastStart = moment(ts).utc().startOf('day');
      this.hwm = price;
      return;
    }

    const date = moment(ts);
    this.hwm = Math.max(this.hwm, price);
    this.lwm = Math.min(this.lwm, price);

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

      let stoploss = this.sl || this.tStop;
      if (!this.long) {
        range *= -1;
        if (stoploss) stoploss *= -1;
      }

      // position target and stop loss
      this.target = price + range * this.k;
      if (stoploss) this.stoploss = this.target * (1 - stoploss);

      // reset day candle and water marks
      this.lastStart = this.lastStart?.add(1, 'days') || date;
      this.hwm = price;
      this.lwm = price;
      this.currentCandle = this.newDayCandle(price);
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
      if (this.long && price > this.target) {
        this.openPosition(price);
      }

      // hit short target
      if (!this.long && this.shorting && price < this.target) {
        this.openPosition(price);
      }
    }

    // hit stop-loss
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

    // check if liquidated
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

  async backtest(): Promise<void> {
    const sqlite = await SQLiteDB.getConnection();
    const candles = await sqlite.getCandles({symbol: 'ETHUSDT'});

    for (const candle of candles) {
      // for new day targets
      this.reportTrade(candle.open, candle.ts);

      // for stop-loss hits and target hits
      if (!this.holding && !this.long) {
        this.reportTrade(candle.low, candle.ts);
        this.reportTrade(candle.high, candle.ts);
      } else {
        this.reportTrade(candle.high, candle.ts);
        this.reportTrade(candle.low, candle.ts);
      }
    }

    this.printStats();

    const b = candles[candles.length - 1].close / candles[0].open - 1;
    const mDrawdown = maxDrawdown(candles.map(c => c.close));
    console.log('benchmark: ', numeral(b).format('0.00 %'));
    console.log('benchmark md: ', numeral(mDrawdown).format('0.00 %'));
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

export default BackTester;
