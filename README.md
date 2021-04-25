# Simple Cryptocurrency Breakout Strategy

Catch breakouts by opening positions based on previous day's range. Popularized by Larry Williams.

## Strategy

1. Check previous day for positive return
2. Set limit order based on previous day's range
3. Close position at end of day

## Docker

```bash
> docker build breakout-trader .
> docker run -p 4000:4000 breakout-trader
```
