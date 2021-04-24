package trader

import (
	"fmt"
	"log"
	"time"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/exchange"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/go-numb/go-ftx/rest/private/account"
)

type Trader struct {
	config    models.Configuration
	exchange  exchange.FTX
	lastClose time.Time

	target    *float64
	lastPrice *float64
}

func StartTrader(config models.Configuration) {
	ftx := exchange.New(config)
	now := time.Now().UTC()

	trader := Trader{
		config:    config,
		exchange:  ftx,
		lastClose: now.Truncate(24 * time.Hour),
	}

	trader.NewDay()
	ftx.GetTrades(trader.PrintTrades)
	ftx.Subscribe()
}

func (t *Trader) PrintTrades(price float64, ts time.Time) {
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

	fmt.Println("opening stop-market order for ", target)
}

func (t *Trader) GetPositions() []account.Position {
	return t.exchange.AccountInfo.Positions
}
