from binance.client import Client
from dataclasses import asdict
from datetime import datetime
import pandas as pd
import numpy as np
import pathlib
import os
import arrow
from empyrical import max_drawdown
from scipy.optimize import minimize

from trader import Trader
from models import OHLCV


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
    df = fetch_hist("ETHUSDT", "2017-11-01")
    df_train = df[df.ts < 1609459200000]
    df_test = df[df.ts >= 1609459200000]

    k = 0.6
    sl = 0.02
    leverage = 1
    trader = Trader(k, sl, leverage)
    trader.backtest(df_train)
    trader.print_stats(plot=False)
