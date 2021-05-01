from dataclasses import dataclass, asdict
from datetime import datetime
from arrow import Arrow


@dataclass
class OHLCV:
    ts: float
    datetime: Arrow
    open: float
    high: float
    low: float
    close: float
    volume: float
