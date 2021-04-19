import {Config} from './src/entity/types';

export const config: Config = {
  // range multiplier
  // target = open + prev_day_range * k
  k: 0.6,

  // enable shorting
  shorting: false,

  // target leverge
  leverage: 5,

  // stop-loss when opening position
  // cannot set stop-loss and trailing-stop
  stopLoss: 0.03,

  // trailing-stop when opening position
  // cannot set stop-loss and trailing-stop
  trailingStop: null,

  // always be long
  // set long targets even if previous day was down
  alwaysLong: true,
};
