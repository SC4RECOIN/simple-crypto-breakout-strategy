# Simple Cryptocurrency Breakout Strategy

Catch breakouts by opening positions based on previous day's range. Popularized by Larry Williams.

## Strategy

1. Check previous day for positive return
2. Set limit order based on previous day's range
3. Close position at end of day

See `config.ts` for strategy configuration

### Fetch historical data

Fetch 5min historical data from Binance. Uses public endpoints so keys are not required.  
Specify trading pairs in `config.ts`.

```bash
npm run fetch-historical
```

### Run backtest

Run backtest with config parameters in `config.ts`.  
Be sure to fetch historical data first.

```bash
npm run backtest
```
