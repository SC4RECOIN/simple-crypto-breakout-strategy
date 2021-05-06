import moment from "moment";

export interface Target {
  last: number;
  lastTime: moment.Moment;
  target: number;
  open: number;
  ticker: string;
}

export interface AccountData {
  collateral: number;
  freeCollateral: number;
  totalAccountValue: number;
  totalPositionSize: number;
  leverage: number;
  positions: Position[];
  fills: Fill[];
}

export interface Position {
  future: string;
  side: string;
  entryPrice: number;
  estimatedLiquidationPrice: number;
  size: number;
  cost: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export interface Fill {
  fee: number;
  feeRate: number;
  future: string;
  price: number;
  side: "buy" | "sell";
  size: number;
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

export interface ActiveResponse {
  active: boolean;
}

export interface CloseAllResponse {
  message: string;
}
