import {Candle} from '../entity/candle';
import moment from 'moment';

abstract class Exchange {
  abstract candles(symbol: string, start: moment.Moment): Promise<Candle[]>;
  abstract perpetuals(minVolume?: number): Promise<string[]>;
}

export default Exchange;
