import Binance from './exchange/binance';
import moment = require('moment');
const fs = require('fs');

const fetchData = async () => {
  const client = new Binance();
  const start = moment().subtract(5, 'days');

  if (!fs.existsSync('historical')) {
    fs.mkdirSync('historical');
  }

  for (const pair of await client.perpetuals()) {
    console.log(`\nFetching candles for ${pair}`);
    const candles = await client.candles(pair, start);
    fs.writeFileSync(
      `historical/binance-historical-${pair}.json`,
      JSON.stringify(candles, null, 2)
    );
  }
};

fetchData();
