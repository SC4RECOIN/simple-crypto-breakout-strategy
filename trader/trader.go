package trader

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/exchange"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/slack"
	"github.com/go-numb/go-ftx/rest/private/account"
	"github.com/go-numb/go-ftx/rest/private/orders"
)

type Trader struct {
	config    models.Configuration
	exchange  exchange.FTX
	lastClose time.Time
	nextClose time.Time
	active    bool

	open        *float64
	longTarget  *float64
	shortTarget *float64
	canLong     bool
	canShort    bool
	lastPrice   *float64
	lastTime    *time.Time

	longStopLossSize  *float64
	shortStopLossSize *float64

	tradeLock sync.Mutex
}

// StartTrader will configure trader, set targets,
// subscribe to ws, and send orders if active
func StartTrader(config models.Configuration) *Trader {
	ftx := exchange.New(config)
	now := time.Now().UTC()
	lastClose := now.Truncate(24 * time.Hour)
	nextClose := lastClose.Add(time.Hour * 24)

	trader := Trader{
		config:    config,
		exchange:  ftx,
		lastClose: lastClose,
		nextClose: nextClose,
		active:    config.AutoStart,
		canLong:   !config.UseMA,
		canShort:  !config.UseMA && config.CanShort,
	}

	// subscribe to websocket
	trader.NewDay(true)
	ftx.GetTrades(trader.NewTrade)
	go ftx.Subscribe()

	return &trader
}

// NewTrade is called by the ws trade feed and
// updates the last price and checks for a new day
func (t *Trader) NewTrade(price float64, ts time.Time) {
	t.tradeLock.Lock()
	defer t.tradeLock.Unlock()

	t.lastPrice = &price
	t.lastTime = &ts

	if ts.After(t.nextClose) {
		slack.LogInfo("new day")
		t.lastClose = t.nextClose
		t.nextClose = t.lastClose.Add(time.Hour * 24)

		// wait a minute for historical data to update
		newDay := func() { t.NewDay(false) }
		time.AfterFunc(30*time.Second, newDay)
	}

	// check if triggers should have been hit
	if t.longStopLossSize != nil && price > *t.longTarget {
		stopPrice := *t.longTarget * (1 - t.config.StopLoss)
		t.exchange.SetStoploss(stopPrice, *t.longStopLossSize, models.Sell)
		t.longStopLossSize = nil
	}
	if t.shortStopLossSize != nil && price < *t.shortTarget {
		stopPrice := *t.shortTarget * (1 + t.config.StopLoss)
		t.exchange.SetStoploss(stopPrice, *t.shortStopLossSize, models.Buy)
		t.shortStopLossSize = nil
	}
}

// NewDay will close all positions and set the
// buy target. `appStart` can be set to `true` if
// the app is just starting and shouldn't close all positions
func (t *Trader) NewDay(appStart bool) {
	// get yesterdays candle
	c, ma, err := t.exchange.GetLastDay()
	if err != nil {
		slack.LogError(err)
		return
	}

	// long or short depending on ma
	if t.config.UseMA {
		t.canLong = c.Close > ma
		t.canShort = c.Close < ma && t.config.CanShort
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
		slack.LogInfo("trader already in position; orders will not be placed")
		return
	}

	// a position has been open and closed already
	fills, err := t.exchange.GetFills()
	if err != nil {
		slack.LogError(err)
		return
	}

	if appStart && len(*fills) > 0 {
		slack.LogInfo("trader already entered position today; orders will not be placed")
		return
	}

	fmt.Println("closing all positions")
	t.exchange.CloseAll()

	if !t.active {
		slack.LogInfo("trader not active; orders will not be placed")
		return
	}

	snapshot, err := t.exchange.GetMarket()
	if err != nil {
		slack.LogError(err)
		return
	}

	fmt.Printf("long target: $%.2f\tshort target: $%.2f\tcurrent ask: $%.2f\n\n", longTarget, shortTarget, snapshot.Ask)

	if snapshot.Ask > longTarget || snapshot.Ask < shortTarget {
		slack.LogInfo("current price is past target; orders will not be placed")
		return
	}

	if t.canLong {
		fmt.Printf("opening stop-market order for long at $%.2f\n", longTarget)
		if order, _ := t.exchange.PlaceTrigger(longTarget, models.Buy); err == nil {
			t.shortStopLossSize = &order.Size
		}
	}

	if t.canShort {
		fmt.Printf("opening stop-market order for short at $%.2f\n", shortTarget)
		if order, _ := t.exchange.PlaceTrigger(shortTarget, models.Sell); err == nil {
			t.longStopLossSize = &order.Size
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

func (t *Trader) GetPositions() (*[]account.Position, error) {
	resp, err := t.exchange.GetPositions()
	if err != nil {
		return nil, err
	}

	// filter out zero sized positions
	positions := []account.Position{}
	for _, position := range []account.Position(*resp) {
		if position.Size > 0 {
			positions = append(positions, position)
		}
	}

	return &positions, nil
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
