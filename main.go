package main

import (
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/notifications"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/trader"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/webapp"
)

func main() {
	config := models.Configuration{}
	if err := config.LoadConfig(); err != nil {
		fmt.Println("error loading config", err)
		return
	}

	notifier := notifications.New(&config.WebpushKey)
	trader := trader.StartTrader(config, notifier)
	webapp.Start(trader, notifier)
}
