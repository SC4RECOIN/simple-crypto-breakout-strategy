# Simple Cryptocurrency Breakout Strategy

Catch breakouts by opening positions based on the previous day's range. Popularized by Larry Williams.

## Strategy

1. Get previous day's high and low
2. Set limit order based on previous day's range
3. Close position at end of day

## Backtest

The following are results from a backtest from `2020-01-01` to `2020-12-31` with the below config. A simple buy & hold strategy is used as a benchmark.

```json
{
  "ticker": "ETH-PERP",
  "k": 0.6,
  "stoploss": 0.02,
  "leverage": 1
}
```

| Metric                 |          |
| ---------------------- | -------- |
| Trades                 | 113      |
| Max Drawdown           | -7.230%  |
| Return                 | 304.713% |
| Benchmark Max Drawdown | -61.446% |
| Benchmark Return       | 471.245% |

The model underperforms the benchmark, however, the model is very successful in reducing downside exposure. Increasing the leverage to 2x or 3x will significantly outperform the benchmark while maintaining tolerable drawdowns in portfolio value.

## Docker

Make sure to set `secret` and `key` in `config.json` or pass as env vars.  
See `Makefile`

```bash
> docker build breakout-trader .
> docker run -p 4000:4000 breakout-trader
```

Navigate to `http://localhost:4000` for dashboard

## Dashboard

The dashboard can be used to monitor your open orders and positions. The bot can also be disable and all positions and orders can be closed manually. Supports mobile view.

| Dashhoard                            |
| ------------------------------------ |
| ![alt text](dashboard/dashboard.png) |

### V2

See the [v2 branch](https://github.com/SC4RECOIN/simple-crypto-breakout-strategy/tree/v2) for more configuration options like shorting and moving averages. This is the branch I am using and testing from but might not be ready for use and is subject to change. It also integrates with slack which I haven't made optional yet.
