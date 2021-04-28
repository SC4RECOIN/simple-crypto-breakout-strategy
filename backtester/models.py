from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class OHLCV:
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
