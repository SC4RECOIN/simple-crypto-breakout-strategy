export interface Config {
  k: number;
  shorting: boolean;
  leverage: number;
  stopLoss: number | null;
  trailingStop: number | null;
  alwaysLong: boolean;
}
