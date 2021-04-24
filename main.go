package main

import (
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/trader"
	"github.com/labstack/gommon/log"
)

// let to goroutine run indefinetly
func blockForever() {
	select {}
}

func main() {
	config := models.Configuration{}
	if err := config.LoadConfig(); err != nil {
		log.Fatal(err)
	}

	trader := trader.New(config)
	fmt.Println("Positions: ", trader.GetPositions())
	blockForever()
}
