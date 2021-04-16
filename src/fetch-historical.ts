import Binance from './exchange/binance';
import SQLiteDB from './sqlite';
import moment = require('moment');
import 'reflect-metadata';

const fetchData = async () => {
  const sqlite = await SQLiteDB.getConnection();
  const client = new Binance();
  const start = moment('2020-01-01');

  for (const pair of await client.perpetuals()) {
    console.log(`\nFetching candles for ${pair}`);
    const candles = await client.candles(pair, start);
    await sqlite.save(candles);
  }
};

fetchData();
