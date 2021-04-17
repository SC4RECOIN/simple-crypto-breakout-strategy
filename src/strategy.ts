import moment from 'moment';
import numeral from 'numeral';
import {Candle} from './entity/candle';
import {maxDrawdown} from './utils';

class BreakoutStrategy {
  // config
  k: number;
  shorting: boolean;
  leverage: number;
  sl: number | null;

  // portfolio
  balance: number;
  holding: boolean;
  balanceHist: number[];
  tradeCount: number;

  // track trades
  lastStart: moment.Moment | null;
  currentCandle: Candle | null;
  target: number | null;
  stoploss: number | null;

  constructor(
    k = 0.6,
    stopLoss: number | null,
    shorting = false,
    leverage = 1
  ) {
    if (shorting) {
      throw Error('Shorting has not been implemented');
    }

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
    const days = this.balanceHist.length;
    const last = this.balanceHist[days - 1];
    const ret = last / this.balanceHist[0] - 1;
    const annual = (1 + ret) ** (365 / days) - 1;
    const mDrawdown = maxDrawdown(this.balanceHist);

    console.log('return: ', numeral(ret).format('0.00 %'));
    console.log('annualized return: ', numeral(annual).format('0.00 %'));
    console.log('max drawdown: ', numeral(mDrawdown).format('0.00 %'));
    console.log('trades: ', this.tradeCount);
  }

  reportTrade(price: number, ts: number): void {
    if (!this.currentCandle) {
      this.currentCandle = this.newDayCandle(price);
      this.lastStart = moment(ts);
    }

    const date = moment(ts);
    if (date.diff(this.lastStart, 'days') > 0) {
      // calculate next target
      const range = this.currentCandle.high - this.currentCandle.low;
      this.target = price + range * this.k;
      if (this.sl) this.stoploss = this.target * (1 - this.sl);

      // sell if open position
      if (this.holding) {
        this.holding = false;
        this.balance *= price;
      }

      this.lastStart = date;
      this.currentCandle = this.newDayCandle(price);
      this.balanceHist.push(this.balance);
    }

    // hit buy target
    if (this.target && !this.holding && price > this.target) {
      this.tradeCount += 1;
      this.holding = true;
      this.balance = this.balance / this.target;
    }

    // hit stop loss
    if (this.stoploss && this.holding && price < this.stoploss) {
      this.holding = false;
      this.balance *= this.stoploss;

      // don't want to rebuy at target
      this.target = null;
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
