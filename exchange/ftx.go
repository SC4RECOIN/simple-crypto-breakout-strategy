package exchange

import (
	"context"
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/go-numb/go-ftx/realtime"
)

type FTX struct {
	config    models.Configuration
	lastPrice float64
}

func New(config models.Configuration) FTX {
	return FTX{
		config: config,
	}
}

func (ftx *FTX) Subscribe() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ch := make(chan realtime.Response)
	go realtime.Connect(ctx, ch, []string{"trades"}, []string{ftx.config.Ticker}, nil)
	go realtime.ConnectForPrivate(ctx, ch, ftx.config.Key, ftx.config.Secret, []string{"fills"}, nil)

	for {
		select {
		case v := <-ch:
			switch v.Type {
			case realtime.TRADES:
				for _, trade := range v.Trades {
					fmt.Println("New trade: ", trade.Price)
					ftx.lastPrice = trade.Price
				}

			case realtime.FILLS:
				price := v.Fills.Price
				size := v.Fills.Size
				fmt.Printf("Order fill:\tprice: %.2f\tsize: %f.4f\tnotional: %.2f\n", price, size, price*size)
			}
		}
	}
}
