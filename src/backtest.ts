import SQLiteDB from './sqlite';
import BreakoutStrategy from './strategy';
import config from '../config.json';
import numeral from 'numeral';
import {maxDrawdown} from './utils';
import 'reflect-metadata';

const backTest = async () => {
  const sqlite = await SQLiteDB.getConnection();
  const candles = await sqlite.getCandles({symbol: 'BTCUSDT'});

  const strategy = new BreakoutStrategy(
    config.k,
    config.stopLoss,
    config.shorting,
    config.leverage
  );
  strategy.backtest(candles);
  strategy.printStats();

  const b = candles[candles.length - 1].close / candles[0].open - 1;
  const mDrawdown = maxDrawdown(candles.map(c => c.close));
  console.log('benchmark: ', numeral(b).format('0.00 %'));
  console.log('benchmark md: ', numeral(mDrawdown).format('0.00 %'));
};

backTest();
