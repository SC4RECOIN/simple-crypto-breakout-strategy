export interface Target {
  last: number;
  target: number;
  open: number;
}

export interface AccountInfo {
  collateral: number;
  freeCollateral: number;
  totalAccountValue: number;
  totalPositionSize: number;
  leverage: number;
  positions: Position[];
}

export interface Position {
  future: string;
  side: string;
  entryPrice: number;
  etimatedLiquidationPrice: number;
  size: number;
  cost: number;
  unrealizedPnl: number;
  realizedPnl: number;
}
