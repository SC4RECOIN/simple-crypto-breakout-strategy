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
