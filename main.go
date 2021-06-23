package main

import (
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/trader"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/webapp"
)

func main() {
	config := models.Configuration{}
	if err := config.LoadConfig(); err != nil {
		fmt.Println("error loading config", err)
		return
	}

	trader := trader.StartTrader(config)
	webapp.Start(trader)
}
