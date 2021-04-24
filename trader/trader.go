package trader

import (
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/exchange"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/go-numb/go-ftx/rest/private/account"
)

type Trader struct {
	config   models.Configuration
	exchange exchange.FTX
	target   *float64
}

func New(config models.Configuration) Trader {
	ftx := exchange.New(config)

	trader := Trader{
		config:   config,
		exchange: ftx,
	}

	ftx.GetTrades(trader.PrintTrades)
	go ftx.Subscribe()

	return trader
}

func (t *Trader) PrintTrades(price float64) {
	fmt.Println("New trade for trader: ", price)
}

func (t *Trader) GetPositions() []account.Position {
	return t.exchange.AccountInfo.Positions
}
