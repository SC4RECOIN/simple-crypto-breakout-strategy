import BackTester from './backtester';
import Binance from './exchange/binance';
import SQLiteDB from './sqlite';
import moment from 'moment';
import {config} from '../config';

const fetchData = async () => {
  const sqlite = await SQLiteDB.getConnection();
  const client = new Binance();
  const start = moment('2017-12-01');
  const pairs = [config.pair];

  for (const [idx, pair] of pairs.entries()) {
    console.log(`\nFetching candles for ${pair} (${idx + 1}/${pairs.length})`);
    const candles = await client.candles(pair, start);

    console.log('\nsaving to db...');
    await sqlite.save(candles);
  }
};

const args = process.argv;

/*
 * Specify what should run
 * with cmd-line arg
 */
if (args.length > 2) {
  if (args[2] === 'backtest') {
    const strategy = new BackTester(config);
    strategy.backtest();
  }

  if (args[2] === 'fetch-historical') {
    fetchData();
  }
} else {
  console.log('Specify CMD arg');
}
