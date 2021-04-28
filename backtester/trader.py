import pandas as pd
import arrow

from models import OHLCV


class Trader(object):
    def __init__(self, k, stoploss):
        self.k = k
        self.stoploss = stoploss
        self.last_start = None

        self.target = None
        self.current_candle = None

    def backtest(self, df: pd.DataFrame):
        self.new_day(df.iloc[0])
        for idx, candle in df.iterrows():
            self.report_candle(OHLCV(**candle))

    def report_candle(self, candle: OHLCV):
        ts = arrow.get(candle.time)

        # new day
        if (ts - self.last_start).days > 0:
            print(self.current_candle)
            exit()

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
