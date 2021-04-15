import Binance from './exchange/binance';
import moment = require('moment');
const fs = require('fs');

const fetchData = async () => {
  const client = new Binance();
  const start = moment().subtract(5, 'days');

  if (!fs.existsSync('historical')) {
    fs.mkdirSync('historical');
  }

  const candles = await client.candles('BTCUSDT', start);
  fs.writeFileSync(
    'historical/binance-historical.json',
    JSON.stringify(candles, null, 2)
  );
};

fetchData();
