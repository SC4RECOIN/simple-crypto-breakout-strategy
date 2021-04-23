package exchange

import (
	"context"
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/go-numb/go-ftx/auth"
	"github.com/go-numb/go-ftx/realtime"
	"github.com/go-numb/go-ftx/rest"
	"github.com/go-numb/go-ftx/rest/private/account"
)

type FTX struct {
	config      models.Configuration
	client      *rest.Client
	unsubscribe context.CancelFunc

	AccountInfo *models.AccountInfo
	LastPrice   float64
}

func New(config models.Configuration) FTX {
	// rest client
	client := rest.New(
		auth.New(
			config.Key,
			config.Secret,
			auth.SubAccount{
				UUID:     1,
				Nickname: config.SubAccount,
			},
		),
	)

	// use sub-account
	client.Auth.UseSubAccountID(1)

	ftx := FTX{
		config: config,
		client: client,
	}

	// fetch account info
	ftx.UpdateAccountInfo()

	return ftx
}

func (ftx *FTX) Subscribe() {
	ctx, cancel := context.WithCancel(context.Background())
	ftx.unsubscribe = cancel
	c := ftx.config

	ch := make(chan realtime.Response)
	go realtime.Connect(ctx, ch, []string{"trades"}, []string{c.Ticker}, nil)
	go realtime.ConnectForPrivate(ctx, ch, c.Key, c.Secret, []string{"fills"}, nil, c.SubAccount)

	for {
		select {
		case v := <-ch:
			switch v.Type {
			case realtime.TRADES:
				for _, trade := range v.Trades {
					fmt.Println("New trade: ", trade.Price)
					ftx.LastPrice = trade.Price
				}

			case realtime.FILLS:
				price := v.Fills.Price
				size := v.Fills.Size
				fmt.Printf("Order fill:\tprice: %.2f\tsize: %f.4f\tnotional: %.2f\n", price, size, price*size)
			}
		}
	}
}

func (ftx *FTX) UnSubscribe() {
	ftx.unsubscribe()
}

func (ftx *FTX) UpdateAccountInfo() {
	info, err := ftx.client.Information(&account.RequestForInformation{})
	if err != nil {
		fmt.Printf("Error fetching account info: %v\n", err)
		return
	}

	ftx.AccountInfo = &models.AccountInfo{
		Collateral:        info.Collateral,
		FreeCollateral:    info.FreeCollateral,
		TotalAccountValue: info.TotalAccountValue,
		TotalPositionSize: info.TotalPositionSize,
		Leverage:          info.Leverage,
		Positions:         info.Positions,
	}
}
