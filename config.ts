import {Config} from './src/entity/types';

export const config: Config = {
  // range multiplier
  // target = open + prev_day_range * k
  k: 0.6,

  // enable shorting
  shorting: false,

  // target leverge
  leverage: 1,

  // stop-loss when opening position
  // cannot set stop-loss and trailing-stop
  stopLoss: 0.02,

  // trailing-stop when opening position
  // cannot set stop-loss and trailing-stop
  trailingStop: null,

  // always be long
  // set long targets even if previous day was down
  alwaysLong: true,

  // trading pair to set targets for
  pair: 'BTCUSDT',

  // simulated slippage on market orders
  slippage: 0.0004,

  // trading fee
  fee: 0.0007,
};
