package main

import (
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/exchange"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/labstack/gommon/log"
)

func main() {
	config := models.Configuration{}
	if err := config.LoadConfig(); err != nil {
		log.Fatal(err)
	}

	ftx := exchange.New(config)
	fmt.Printf("%+v\n", ftx.AccountInfo)
}
