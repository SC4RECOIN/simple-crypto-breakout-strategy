from binance.client import Client
from dataclasses import asdict
import pandas as pd
import numpy as np
import pathlib
import os
import arrow
from empyrical import max_drawdown
from scipy.optimize import minimize

from trader import Trader
from models import OHLCV
from logger import Logger


def fetch_hist(pair: str, start: str, use_cache=True) -> pd.DataFrame:
    path = f"data/candles_{pair}.pkl"
    if use_cache and os.path.exists(path):
        return pd.read_pickle(path)

    print(f"fetching historical data from binance ({pair})...")
    client = Client("", "")
    inv = Client.KLINE_INTERVAL_1MINUTE
    history = client.get_historical_klines(pair, inv, start)

    history = [
        asdict(
            OHLCV(
                ts=c[0],
                datetime=arrow.get(c[0]),
                open=float(c[1]),
                high=float(c[2]),
                low=float(c[3]),
                close=float(c[4]),
                volume=float(c[5]),
            )
        )
        for c in history
    ]

    df = pd.DataFrame(history)
    pathlib.Path("data").mkdir(exist_ok=True)
    df.to_pickle(path, protocol=4)

    return df


def find_optimal_params(df: pd.DataFrame):
    def run_backtest(params):
        trader = Trader(*params)
        trader.backtest(df)
        chg = np.diff(trader.balance_hist) / trader.balance_hist[:-1]
        return -max_drawdown(chg)

    return minimize(
        run_backtest,
        [0.8, 0.03],
        method="SLSQP",
        options={"eps": 0.001},
        bounds=((0.1, 1), (0.005, 0.1)),
    ).x


if __name__ == "__main__":
    df = fetch_hist("BTCUSDT", "2020-06-01")

    time_2021_01 = 1609502400000
    time_2021_06 = 1622548800000
    time_2021_08 = 1633089600000
    time_2022_01 = 1640995200000
    time_2022_03 = 1646092800000

    df = df[df["ts"] > time_2021_06]

    values = [
        {
            0: 8,
            0.03: 6,
            0.06: 5,
            0.09: 3,
            0.12: 2,
            0.15: 1,
            0.18: 0.5,
        },
    ]

    for value in values:

        logger = Logger()
        trader = Trader(
            long_k=0.65,
            short_k=0.6,
            stoploss=0.02,
            ma_window=34,
            leverage=4,
            enable_shorting=True,
            enable_ma=True,
            dist_to_lev=value,
            logger=logger,
        )

        trader.backtest(df, True)
        trader.print_stats(plot=True)
