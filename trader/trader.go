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
}

func StartTrader(config models.Configuration) *Trader {
	ftx := exchange.New(config)
	now := time.Now().UTC()

	trader := Trader{
		config:    config,
		exchange:  ftx,
		lastClose: now.Truncate(24 * time.Hour),
		active:    config.AutoStart,
	}

	trader.NewDay()
	ftx.GetTrades(trader.NewTrade)
	go ftx.Subscribe()

	return &trader
}

func (t *Trader) NewTrade(price float64, ts time.Time) {
	timeDelta := ts.Sub(t.lastClose)
	t.lastPrice = &price

	if timeDelta > time.Hour*24 {
		fmt.Println("new day")
		t.lastClose = t.lastClose.Add(time.Hour * 24)
		t.NewDay()
	}
}

func (t *Trader) NewDay() {
	fmt.Println("closing all positions")
	t.exchange.CloseAll()

	c, err := t.exchange.GetLastDay()
	if err != nil {
		log.Fatal(err)
	}

	tRange := (c.High - c.Low) * t.config.K
	target := c.Close + tRange
	t.target = &target
	t.open = &c.Close

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

func (t *Trader) GetAccountInfo() *models.AccountInfo {
	t.exchange.UpdateAccountInfo()
	return t.exchange.AccountInfo
}

func (t *Trader) GetOpenOrders() (*orders.ResponseForOpenTriggerOrders, error) {
	return t.exchange.GetOpenOrders()
}

func (t *Trader) LastPrice() (float64, error) {
	if t.lastPrice != nil {
		return *t.lastPrice, nil
	}

	return 0, errors.New("last price not available")
}

func (t *Trader) GetTarget() *models.Target {
	return &models.Target{
		Last:   *t.lastPrice,
		Target: *t.target,
		Open:   *t.open,
		Ticker: t.config.Ticker,
	}
}

func (t *Trader) IsActive() bool {
	return t.active
}

func (t *Trader) SetActive(value bool) {
	t.active = value
}

func (t *Trader) CloseAll() error {
	return t.exchange.CloseAll()
}
