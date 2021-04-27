from binance.client import Client
from dataclasses import dataclass, asdict
from datetime import datetime
import pandas as pd
import pathlib
import os


@dataclass
class OHLCV:
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


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
                time=datetime.fromtimestamp(c[0] / 1000),
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


if __name__ == "__main__":
    df = fetch_hist("ETHUSDT", "2021-04-01")
    print(f"length: {len(df)}")
