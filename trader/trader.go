package trader

import (
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/exchange"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/go-numb/go-ftx/rest/private/orders"
)

type Trader struct {
	config    models.Configuration
	exchange  exchange.FTX
	lastClose time.Time
	active    bool

	open        *float64
	longTarget  *float64
	shortTarget *float64
	canLong     bool
	canShort    bool
	lastPrice   *float64
	lastTime    *time.Time
}

// StartTrader will configure trader, set targets,
// subscribe to ws, and send orders if active
func StartTrader(config models.Configuration) *Trader {
	ftx := exchange.New(config)
	now := time.Now().UTC()

	trader := Trader{
		config:    config,
		exchange:  ftx,
		lastClose: now.Truncate(24 * time.Hour),
		active:    config.AutoStart,
		canLong:   !config.UseMA,
		canShort:  !config.UseMA,
	}

	trader.NewDay(true)
	ftx.GetTrades(trader.NewTrade)
	go ftx.Subscribe()

	// periodically check that stoplosses are in place
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			trader.CheckForStoploss()
		}
	}()

	return &trader
}

// NewTrade is called by the ws trade feed and
// updates the last price and checks for a new day
func (t *Trader) NewTrade(price float64, ts time.Time) {
	timeDelta := ts.Sub(t.lastClose)
	t.lastPrice = &price
	t.lastTime = &ts

	if timeDelta > time.Hour*24 {
		fmt.Println("new day")
		t.lastClose = t.lastClose.Add(time.Hour * 24)

		// wait a minute for historical data to update
		newDay := func() { t.NewDay(false) }
		time.AfterFunc(30*time.Second, newDay)
	}
}

// NewDay will close all positions and set the
// buy target. `appStart` can be set to `true` if
// the app is just starting and shouldn't close all positions
func (t *Trader) NewDay(appStart bool) {
	// get yesterdays candle
	c, ma, err := t.exchange.GetLastDay()
	if err != nil {
		log.Fatal(err)
	}

	// long or short depending on ma
	if t.config.UseMA {
		t.canLong = c.Close > ma
		t.canShort = c.Close < ma
	}

	tRange := c.High - c.Low

	// long target
	longTarget := c.Close + tRange*t.config.LongK
	t.longTarget = &longTarget

	// short target
	shortTarget := c.Close - tRange*t.config.ShortK
	t.shortTarget = &shortTarget

	t.open = &c.Close

	// don't close positions if app starting mid-day
	if appStart && len(t.exchange.AccountInfo.Positions) > 0 {
		fmt.Println("trader already in position; orders will not be placed")
		return
	}

	// a position has been open and closed already
	fills, err := t.exchange.GetFills()
	if err != nil {
		log.Fatal(err)
	}

	if appStart && len(*fills) > 0 {
		fmt.Println("trader already entered position today; orders will not be placed")
		return
	}

	fmt.Println("closing all positions")
	t.exchange.CloseAll()

	if !t.active {
		fmt.Println("trader not active; orders will not be placed")
		return
	}

	snapshot, err := t.exchange.GetMarket()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("long target: $%.2f\tshort target: $%.2f\tcurrent ask: $%.2f\n\n", longTarget, shortTarget, snapshot.Ask)

	if snapshot.Ask > longTarget || snapshot.Ask < shortTarget {
		fmt.Println("current price is past target; orders will not be placed")
		return
	}

	if t.canLong {
		fmt.Printf("opening stop-market order for long at $%.2f\n", longTarget)
		if err = t.exchange.PlaceTrigger(longTarget, models.Buy); err != nil {
			fmt.Println("error placing order:", err.Error())
		}
	}

	if t.canShort {
		fmt.Printf("opening stop-market order for short at $%.2f\n", shortTarget)
		if err = t.exchange.PlaceTrigger(shortTarget, models.Sell); err != nil {
			fmt.Println("error placing order:", err.Error())
		}
	}
}

// CheckForStoploss check if positions have a corresponding
// stoploss. A position may not have a stoploss if a fill is
// missed by the websocket or fails in some other way.
func (t *Trader) CheckForStoploss() {
	t.exchange.UpdateAccountInfo()
	positions := t.exchange.AccountInfo.Positions

	if len(positions) > 0 {
		// check if there is an open order
		orders, err := t.GetOpenOrders()
		if err != nil {
			fmt.Println("an error occured fetching open orders for stoploss check")
			return
		}
		if len(*orders) == 0 {
			fmt.Println("stoploss order has been missed; sending order based on target")
			pos := positions[0]

			if pos.Side == string(models.Buy) {
				t.exchange.SetStoploss(*t.longTarget, pos.NetSize, models.Sell)
			} else {
				t.exchange.SetStoploss(*t.shortTarget, pos.NetSize, models.Buy)
			}
		}
	}

}

func (t *Trader) GetAccountInfo() (*models.AccountInfoResponse, error) {
	t.exchange.UpdateAccountInfo()

	recentFills, err := t.exchange.GetFills()
	if err != nil {
		return nil, err
	}

	resp := &models.AccountInfoResponse{
		Collateral:        t.exchange.AccountInfo.Collateral,
		FreeCollateral:    t.exchange.AccountInfo.FreeCollateral,
		TotalAccountValue: t.exchange.AccountInfo.TotalAccountValue,
		TotalPositionSize: t.exchange.AccountInfo.TotalPositionSize,
		Positions:         t.exchange.AccountInfo.Positions,
		Fills:             recentFills,
	}

	return resp, nil
}

func (t *Trader) GetOpenOrders() (*[]orders.OpenTriggerOrder, error) {
	resp, err := t.exchange.GetOpenOrders()
	if err != nil {
		return nil, err
	}

	orders := []orders.OpenTriggerOrder(*resp)
	return &orders, nil
}

func (t *Trader) LastPrice() (float64, error) {
	if t.lastPrice != nil {
		return *t.lastPrice, nil
	}

	return 0, errors.New("last price not available")
}

func (t *Trader) GetTarget() *models.Target {
	return &models.Target{
		Last:        *t.lastPrice,
		LastTime:    *t.lastTime,
		LongTarget:  *t.longTarget,
		ShortTarget: *t.shortTarget,
		CanLong:     t.canLong,
		CanShort:    t.canShort,
		Open:        *t.open,
		Ticker:      t.config.Ticker,
	}
}

func (t *Trader) IsActive() bool {
	return t.active
}

// SetActive will turn the trader on/off
func (t *Trader) SetActive(value bool) {
	t.active = value
}

func (t *Trader) CloseAll() error {
	return t.exchange.CloseAll()
}
