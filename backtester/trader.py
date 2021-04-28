import pandas as pd
import arrow

from models import OHLCV


class Trader(object):
    def __init__(self, k, stoploss):
        self.k = k
        self.stoploss = stoploss
        self.last_start = None

        self.target = None
        self.sl = None
        self.current_candle = None

    def backtest(self, df: pd.DataFrame):
        self.new_day(df.iloc[0])
        for idx, candle in df.iterrows():
            self.report_candle(OHLCV(**candle))

    def report_candle(self, candle: OHLCV):
        ts = arrow.get(candle.time)

        # new day
        if (ts - self.last_start).days > 0:
            self.close_positions()

            # calculate new target
            c = self.current_candle
            r = (c.high - c.low) * self.k
            self.target = c.close + r

            self.new_day(candle)
            exit()

    def close_positions(self):
        pass

    def new_day(self, candle: OHLCV):
        start_ts = arrow.get(candle.time)
        self.last_start = start_ts.floor("day")

        self.current_candle = OHLCV(
            time=candle.time,
            open=candle.open,
            high=candle.high,
            low=candle.low,
            close=candle.close,
            volume=0,
        )
