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
  long: boolean;

  constructor(
    k = 0.6,
    stopLoss: number | null,
    shorting = false,
    leverage = 1
  ) {
    this.k = k;
    this.shorting = shorting;
    this.leverage = leverage;
    this.sl = stopLoss;

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

  closePositions(price: number) {
    // sell if open position
    if (this.holding) {
      this.holding = false;
      this.balance *= price;
    }
  }

  reportTrade(price: number, ts: number): void {
    if (!this.currentCandle) {
      this.currentCandle = this.newDayCandle(price);
      this.lastStart = moment(ts);
      return;
    }

    const date = moment(ts);
    if (date.diff(this.lastStart, 'days') > 0) {
      this.long = this.currentCandle.close > this.currentCandle.open;
      let range = this.currentCandle.high - this.currentCandle.low;

      let stoploss = this.sl;
      if (!this.long) {
        range *= range * -1;
        if (stoploss) stoploss *= -1;
      }

      // position target and stop loss
      this.target = price + range * this.k;
      if (stoploss) this.stoploss = this.target * (1 - stoploss);

      this.closePositions(price);
      this.lastStart = date;
      this.currentCandle = this.newDayCandle(price);

      // simulate leverage
      const lastBalance = this.balanceHist[this.balanceHist.length - 1];
      const diff = this.balance - lastBalance;
      this.balance = lastBalance + diff * this.leverage;

      this.balanceHist.push(this.balance);
    }

    // hit long target
    if (this.long && this.target && !this.holding && price > this.target) {
      this.tradeCount += 1;
      this.holding = true;
      this.balance = this.balance / this.target;

      // don't want to rebuy until we get new target
      this.target = null;
    }

    // hit stop loss
    if (this.stoploss && this.holding && price < this.stoploss) {
      this.holding = false;
      this.balance *= this.stoploss;
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
