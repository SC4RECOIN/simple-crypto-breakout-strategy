import {Candle} from '../types';
import moment = require('moment');

abstract class Exchange {
  abstract candles(symbol: string, start: moment.Moment): Promise<Candle[]>;
  abstract perpetuals(minVolume?: number): Promise<string[]>;
}

export default Exchange;
