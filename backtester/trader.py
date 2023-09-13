import pandas as pd
import numpy as np
import arrow
from tqdm import tqdm
from empyrical import max_drawdown, annual_return
import matplotlib.pyplot as plt
from typing import Optional

from models import OHLCV
from logger import Logger


class Trader(object):
    def __init__(
        self,
        long_k=0.6,
        short_k=0.8,
        stoploss=0.02,
        ma_window=50,
        leverage=1,
        trading_free=0.0003,
        slippage=0.0001,
        enable_shorting=False,
        enable_ma=True,
        dist_to_lev=None,
        logger: Optional[Logger] = None,
        trade_everyday=True,
    ):
        self.logger = logger

        self.long_k = long_k
        self.short_k = short_k
        self.stoploss = stoploss
        self.ma_window = ma_window
        self.leverage = leverage
        self.enable_shorting = enable_shorting
        self.impact = slippage + trading_free
        self.enable_ma = enable_ma
        self.trade_everyday = trade_everyday
        self.can_trade = True
        self.dist_to_lev = dist_to_lev
        self.last_start = None

        self.balance = 10000
        self.balance_hist = []
        self.benchmark = []
        self.trade_cnt = 0

        self.buy_target = None
        self.sell_target = None
        self.sl = None
        self.current_candle = None
        self.entry_price = None
        self.long = True

    def print_stats(self, plot=True):
        chg = np.diff(self.balance_hist) / self.balance_hist[:-1]
        b = np.diff(self.benchmark) / self.benchmark[:-1]
        r = self.balance_hist[-1] / self.balance_hist[0] - 1
        ks = [self.long_k, self.short_k]

        print(f"\nk: {ks}\tleverage: {self.leverage}\tstoploss: {self.stoploss}")
        print(f"trades:\t\t\t{self.trade_cnt}")
        print(f"max drawdown:\t\t{max_drawdown(chg)*100:.3f}%")
        print(f"return:\t\t\t{r*100:.3f}%")
        print(f"annual return:\t\t{annual_return(chg, annualization=365)*100:.3f}%")

        # benchmark
        print(f"benchmark max drawdown:\t{max_drawdown(b)*100:.3f}%")
        bench = self.benchmark[-1] / self.benchmark[0] - 1
        print(f"benchmark return:\t{(bench)*100:.3f}%")
        print(f"benchmark annual:\t{annual_return(b, annualization=365)*100:.3f}%")

        if plot:
            hist = np.array(self.balance_hist)
            bench = np.array(self.benchmark)
            plt.plot(hist / hist[0], label="portfolio value", color="red")
            plt.plot(bench / bench[0], label="buy and hold", color="blue")
            plt.legend()
            plt.savefig("data/perf.png")

    def backtest(self, df: pd.DataFrame, disable_load_bar=True):
        self.new_day(df.iloc[0])
        self.benchmark.append(df.iloc[0].open)
        for candle in tqdm(df.values, total=len(df), disable=disable_load_bar):
            self.report_candle(OHLCV(*candle))

    def report_candle(self, candle: OHLCV):
        ts = candle.datetime

        # new day
        if (ts - self.last_start).days > 0:
            had_position = self.entry_price is not None
            self.benchmark.append(candle.close)
            self.close_positions(candle.open)

            # calculate new target
            c = self.current_candle
            r = c.high - c.low
            self.buy_target = c.close + r * self.long_k
            self.sell_target = c.close - r * self.short_k

            # rp = int(r / c.open * 100)
            # self.leverage = 2
            # if rp > 3:
            #     self.leverage = 4
            # if rp > 6:
            #     self.leverage = 6
            # if rp > 9:
            #     self.leverage = 8

            self.new_day(candle)

            # if we had a position, disable trading for the next day
            self.can_trade = True
            if had_position and not self.trade_everyday:
                self.can_trade = False

        # not in position and target is set
        if self.entry_price is None and self.buy_target is not None and self.can_trade:
            ma = np.average(self.benchmark[-self.ma_window :])

            if self.dist_to_lev is not None:
                dist = abs((candle.close - ma) / ma)
                for dist_thresh, lev in self.dist_to_lev.items():
                    if dist > dist_thresh:
                        self.leverage = lev

            # long
            if candle.high > self.buy_target:
                if not self.enable_ma:
                    self.long = True
                    self.sl = self.buy_target * (1 - self.stoploss)
                    self.open_position(self.buy_target, ts)
                # candle must open above ma
                elif self.current_candle.open > ma:
                    self.long = True
                    # buy price cannot be below ma
                    price = max(self.buy_target, ma)
                    self.sl = price * (1 - self.stoploss)
                    self.open_position(price, ts)

            # short
            elif candle.low < self.sell_target and self.enable_shorting:
                if not self.enable_ma:
                    self.long = False
                    self.sl = self.sell_target * (1 + self.stoploss)
                    self.open_position(self.sell_target, ts)
                # candle must open below ma
                elif self.current_candle.open < ma:
                    self.long = False
                    # sell price cannot be above ma
                    price = min(self.sell_target, ma)
                    self.sl = price * (1 + self.stoploss)
                    self.open_position(price, ts)

        # in a position and stoploss is hit
        if self.entry_price is not None:
            # close long
            if candle.low < self.sl and self.long:
                self.close_positions(self.sl)
            # close short
            elif candle.high > self.sl and not self.long:
                self.close_positions(self.sl)

        # update day candle
        c = self.current_candle
        self.current_candle.low = min(c.low, candle.low)
        self.current_candle.high = max(c.high, candle.high)
        self.current_candle.close = candle.close
        self.current_candle.volume += candle.volume

    def open_position(self, price: float, ts: arrow.Arrow):
        self.trade_cnt += 1
        self.entry_price = price
        self.buy_target = None
        self.sell_target = None

        if self.logger is not None:
            self.logger.log(
                {
                    "event": "open position",
                    "side": "long" if self.long else "short",
                    "open": self.current_candle.open,
                    "entry": f"{self.entry_price:.2f}",
                },
                self.last_start,
            )

    def close_positions(self, price: float):
        # not holding a position
        if self.entry_price is None:
            if len(self.benchmark) > len(self.balance_hist):
                self.balance_hist.append(self.balance)
            return

        pos_return = price / self.entry_price - 1
        if not self.long:
            pos_return = self.entry_price / price - 1

        # fees & slippage on entry and exit
        pos_return -= self.impact * 2

        # simulate leverage
        self.balance += pos_return * self.balance * self.leverage
        self.balance_hist.append(self.balance)
        self.entry_price = None

        if self.logger is not None:
            chg = np.diff(self.balance_hist) / self.balance_hist[:-1]

            self.logger.log(
                {
                    "event": "close position",
                    "price": price,
                    "return": f"{pos_return*100:.2f}%",
                    "balance": self.balance,
                    "max drawdown": f"{max_drawdown(chg)*100:.2f}%",
                },
                self.last_start,
            )

    def new_day(self, candle: OHLCV):
        self.last_start = candle.datetime.floor("day")

        self.current_candle = OHLCV(
            ts=candle.ts,
            datetime=candle.datetime,
            open=candle.open,
            high=candle.high,
            low=candle.low,
            close=candle.close,
            volume=0,
        )
