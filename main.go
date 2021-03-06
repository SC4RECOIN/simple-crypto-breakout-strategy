package main

import (
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/trader"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/webapp"
	"github.com/labstack/gommon/log"
)

func main() {
	config := models.Configuration{}
	if err := config.LoadConfig(); err != nil {
		log.Fatal(err)
	}

	trader := trader.StartTrader(config)
	webapp.Start(trader)
}
