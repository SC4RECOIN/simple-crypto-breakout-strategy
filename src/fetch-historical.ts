import Binance from './exchange/binance';
import SQLiteDB from './sqlite';
import moment from 'moment';
import 'reflect-metadata';

const fetchData = async () => {
  const sqlite = await SQLiteDB.getConnection();
  const client = new Binance();
  const start = moment('2017-12-01');
  const pairs = await client.perpetuals();

  for (const [idx, pair] of pairs.entries()) {
    console.log(`\nFetching candles for ${pair} (${idx + 1}/${pairs.length})`);
    const candles = await client.candles(pair, start);

    console.log('saving to db...');
    await sqlite.save(candles);
  }
};

fetchData();
