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
      await sleep(100);
    }

    return candles;
  }

  async perpetuals(minVolumeMM = 100): Promise<string[]> {
    const quotes = await this.client.futuresAllBookTickers();
    minVolumeMM *= 1000000;

    // filter out quarterly contracts
    const pairs = Object.keys(quotes).filter(symbol => !symbol.includes('_'));

    const perps = [];
    for (const symbol of pairs) {
      try {
        const info = await this.client.dailyStats({symbol});
        const volume = Array.isArray(info)
          ? parseFloat(info[0].quoteVolume)
          : parseFloat(info.quoteVolume);

        if (volume > minVolumeMM) {
          perps.push(symbol);
        }
      } catch (e) {
        console.warn(`Error fetching info for ${symbol}`);
      }
    }

    return perps;
  }
}

export default Binance;
