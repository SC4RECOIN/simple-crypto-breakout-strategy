import SQLiteDB from './sqlite';
import 'reflect-metadata';
import BreakoutStrategy from './strategy';

const backTest = async () => {
  const sqlite = await SQLiteDB.getConnection();
  const candles = await sqlite.getCandles({symbol: 'BTCUSDT'});

  const strategy = new BreakoutStrategy();
  strategy.backtest(candles);
};

backTest();
