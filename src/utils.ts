import {Config} from './entity/types';
import {DataBaseEntity} from './sqlite';

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const chunk = (arr: DataBaseEntity[], size = 100) => {
  const chunckedArr = [];
  for (let i = 0; i < arr.length; i += size) {
    chunckedArr.push(arr.slice(i, i + size));
  }
  return chunckedArr;
};

export const maxDrawdown = (portfolioValues: number[]): number => {
  let maxValue = 0;
  let maxDrawdown = 0;
  for (const balance of portfolioValues) {
    maxValue = Math.max(maxValue, balance);
    maxDrawdown = Math.min(maxDrawdown, balance / maxValue - 1);
  }

  return maxDrawdown;
};

export const validateConfig = (config: Config): void => {
  if (config.k < 0) {
    throw new Error('k cannot be negative');
  }

  if (config.leverage < 0) {
    throw new Error('leverage cannot be negative');
  }

  if (config.stopLoss && config.trailingStop) {
    throw new Error('cannot specify stoploss and trailing stop');
  }

  if (config.alwaysLong && config.shorting) {
    throw new Error('cannot short and be always longs');
  }

  if (!config.universe || config.universe.length === 0) {
    throw new Error('universe must have at least one pair');
  }
};
