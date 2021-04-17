import SQLiteDB from './sqlite';
import BreakoutStrategy from './strategy';
import 'reflect-metadata';
import config from '../config.json';

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
};

backTest();
