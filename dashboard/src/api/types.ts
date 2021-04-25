export interface Target {
  last: number;
  target: number;
  open: number;
}

export interface AccountData {
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

export interface OpenOrder {
  type: string;
  orderType: string;
  status: string;
  future: string;
  side: string;
  orderPrice: number;
  size: number;
  triggerPrice: number;
  avgFillPrice: number;
  reduceOnly: boolean;
  filledSize: number;
  id: number;
}
