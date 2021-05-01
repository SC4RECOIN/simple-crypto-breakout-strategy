import pandas as pd
import numpy as np
import arrow
from tqdm import tqdm
from empyrical import max_drawdown, annual_return
import matplotlib.pyplot as plt

from models import OHLCV


class Trader(object):
    def __init__(
        self, k=0.6, stoploss=0.02, leverage=1, trading_free=0.0004, slippage=0.0007
    ):
        self.k = k
        self.stoploss = stoploss
        self.leverage = leverage
        self.impact = slippage + trading_free
        self.last_start = None

        self.balance = 10000
        self.balance_hist = []
        self.benchmark = []
        self.trade_cnt = 0

        self.target = None
        self.sl = None
        self.current_candle = None
        self.entry_price = None

    def print_stats(self, plot=True):
        chg = np.diff(self.balance_hist) / self.balance_hist[:-1]
        b = np.diff(self.benchmark) / self.benchmark[:-1]
        r = self.balance_hist[-1] / self.balance_hist[0] - 1

        print(f"\ntrades:\t\t\t{self.trade_cnt}")
        print(f"max drawdown:\t\t{max_drawdown(chg)*100:.3f}%")
        print(f"return:\t\t\t{r*100:.3f}%")
        print(f"annual return:\t\t{annual_return(chg, annualization=365)*100:.3f}%")

        # benchmark
        print(f"benchmark max drawdown:\t{max_drawdown(b)*100:.3f}%")
        bench = self.benchmark[-1] / self.benchmark[0] - 1
        print(f"benchmark return:\t{(bench)*100:.3f}%")
        print(f"benchmark annual:\t{annual_return(b, annualization=365)*100:.3f}%")

        if plot:
            plt.plot(self.balance_hist, label="portfolio value")
            plt.legend()
            plt.show()

    def backtest(self, df: pd.DataFrame):
        self.new_day(df.iloc[0])
        for idx, candle in tqdm(df.iterrows(), total=len(df)):
            self.report_candle(OHLCV(**candle))

    def report_candle(self, candle: OHLCV):
        ts = candle.datetime

        # new day
        if (ts - self.last_start).days > 0:
            self.close_positions(candle.open)
            self.balance_hist.append(self.balance)
            self.benchmark.append(candle.close)

            # calculate new target
            c = self.current_candle
            r = (c.high - c.low) * self.k
            self.target = c.close + r
            self.sl = self.target * (1 - self.stoploss)

            self.new_day(candle)

        # not in position and target is set
        if self.entry_price is None and self.target is not None:
            if candle.high > self.target:
                self.open_position(self.target)

        # in a position and stoploss is hit
        if self.entry_price is not None and candle.low < self.sl:
            self.close_positions(self.sl)

        # update day candle
        c = self.current_candle
        self.current_candle.low = min(c.low, candle.low)
        self.current_candle.high = max(c.high, candle.high)
        self.current_candle.close = candle.close
        self.current_candle.volume += candle.volume

    def open_position(self, price: float):
        self.trade_cnt += 1
        self.entry_price = price
        self.target = None

    def close_positions(self, price: float):
        # not holding a position
        if self.entry_price is None:
            return

        pos_return = price / self.entry_price - 1

        # fees & slippage on entry and exit
        pos_return -= self.impact * 2

        # simulate leverage
        self.balance += pos_return * self.balance * self.leverage
        self.entry_price = None

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
