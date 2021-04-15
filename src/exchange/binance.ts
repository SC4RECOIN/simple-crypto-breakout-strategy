import BinanceSDK, {
  CandleChartInterval,
  Binance as Client,
} from 'binance-api-node';
import moment = require('moment');
import {Candle} from '../types';
import {sleep} from '../utils';
import Exchange from './abstract';

class Binance extends Exchange {
  client: Client;

  constructor() {
    super();
    this.client = BinanceSDK();
  }

  async candles(symbol: string, start: moment.Moment): Promise<Candle[]> {
    const candles: Candle[] = [];

    let cursor = start;
    const end = moment().subtract(5, 'minutes');

    while (cursor < end) {
      console.log(`Fetching ${cursor.format('YYYY-MM-DD')}...`);
      const interval = await this.client.candles({
        symbol,
        interval: CandleChartInterval.FIVE_MINUTES,
        startTime: cursor.valueOf(),
        limit: 1000,
      });

      for (const candle of interval) {
        candles.push({
          ts: candle.openTime,
          open: parseFloat(candle.open),
          close: parseFloat(candle.close),
          low: parseFloat(candle.low),
          high: parseFloat(candle.high),
          volume: parseFloat(candle.quoteVolume),
        });
      }

      const last = candles[candles.length - 1];
      cursor = moment(last.ts);
      sleep(100);
    }

    return candles;
  }
}

export default Binance;
