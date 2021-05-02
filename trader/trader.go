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

	open      *float64
	target    *float64
	lastPrice *float64
	lastTime  *time.Time
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
	c, err := t.exchange.GetLastDay()
	if err != nil {
		log.Fatal(err)
	}

	tRange := (c.High - c.Low) * t.config.K
	target := c.Close + tRange
	t.target = &target
	t.open = &c.Close

	// don't close positions if app starting mid-day
	if appStart && len(t.exchange.AccountInfo.Positions) > 0 {
		fmt.Println("trader already in position; order will not be placed")
		return
	}

	// a position has been open and closed already
	fills, err := t.exchange.GetFills()
	if err != nil {
		log.Fatal(err)
	}

	if appStart && len(*fills) > 0 {
		fmt.Println("trader already entered position today; order will not be placed")
		return
	}

	fmt.Println("closing all positions")
	t.exchange.CloseAll()

	if !t.active {
		fmt.Println("trader not active; order will not be placed")
		return
	}

	snapshot, err := t.exchange.GetMarket()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("target: $%.2f\tcurrent ask: $%.2f\n", target, snapshot.Ask)

	if snapshot.Ask > target {
		fmt.Println("current price is above target; order will not be placed")
		return
	}

	fmt.Printf("opening stop-market order for $%.2f\n", target)
	if err = t.exchange.PlaceTrigger(target); err != nil {
		fmt.Println("error placing order:", err.Error())
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
			fmt.Println("stoploss order has been missed; sending order based on target:", *t.target)
			pos := positions[0]
			t.exchange.SetStoploss(*t.target, pos.NetSize)
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
		Last:     *t.lastPrice,
		LastTime: *t.lastTime,
		Target:   *t.target,
		Open:     *t.open,
		Ticker:   t.config.Ticker,
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
