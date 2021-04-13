import Binance, {CandleChartInterval} from 'binance-api-node';
import moment = require('moment');

const fetchData = async () => {
  const client = Binance();
  const start = moment('2020-01-01');

  const candles = await client.candles({
    symbol: 'BTCUSDT',
    interval: CandleChartInterval.FIVE_MINUTES,
    startTime: start.valueOf(),
    limit: 10,
  });

  console.log(JSON.stringify(candles));
};

fetchData();
