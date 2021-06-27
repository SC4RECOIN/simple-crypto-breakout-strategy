package main

import (
	"encoding/json"
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/slack"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/trader"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/webapp"
)

func main() {
	config := models.Configuration{}
	if err := config.LoadConfig(); err != nil {
		fmt.Println("error loading config", err)
		return
	}

	configCpy := config
	configCpy.Secret = ""
	if s, err := json.MarshalIndent(configCpy, "", "\t"); err == nil {
		msg := fmt.Sprintf("Config loaded:\n```%s```", string(s))
		slack.LogInfo(msg)
	}

	trader := trader.StartTrader(config)
	webapp.Start(trader)
}
