# Simple Cryptocurrency Breakout Strategy

Catch breakouts by opening positions based on previous day's range. Popularized by Larry Williams.

## Strategy

1. Check previous day for positive return
2. Set limit order based on previous day's range
3. Close position at end of day

### Fetch historical data

Fetch 5min historical data from Binance. Uses public endpoints so keys are not requied

```bash
npm run fetch-historical
```

### To do

Day candles should be UTC and not local tz
