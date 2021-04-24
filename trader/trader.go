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
	active    bool

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
		active:    config.AutoStart,
	}

	trader.NewDay()
	ftx.GetTrades(trader.NewTrade)
	ftx.Subscribe()
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

	if !t.active {
		fmt.Println("trader not active; orders will not be placed")
		return
	}

	fmt.Printf("opening stop-market order for $%.2f\n", target)
	if err = t.exchange.PlaceTrigger(target); err != nil {
		fmt.Println("error placing order:", err.Error())
	}
}

func (t *Trader) GetPositions() []account.Position {
	return t.exchange.AccountInfo.Positions
}
