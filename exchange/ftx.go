package exchange

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/go-numb/go-ftx/auth"
	"github.com/go-numb/go-ftx/realtime"
	"github.com/go-numb/go-ftx/rest"
	"github.com/go-numb/go-ftx/rest/private/account"
	"github.com/go-numb/go-ftx/rest/private/orders"
	"github.com/go-numb/go-ftx/rest/public/markets"
)

type FTX struct {
	config      models.Configuration
	client      *rest.Client
	unsubscribe context.CancelFunc
	listener    func(price float64, ts time.Time)

	AccountInfo *models.AccountInfo
	LastPrice   *float64
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

	// default listener
	listener := func(price float64, ts time.Time) {
		fmt.Println("New trade:", price, ts)
	}

	ftx := FTX{
		config:   config,
		client:   client,
		listener: listener,
	}

	// fetch account info
	ftx.UpdateAccountInfo()
	fmt.Println("account loaded")
	fmt.Printf("total position size: $%.2f\n", ftx.AccountInfo.TotalPositionSize)
	fmt.Printf("total account value: $%.2f\n", ftx.AccountInfo.TotalAccountValue)
	fmt.Printf("free collateral:     $%.2f\n", ftx.AccountInfo.FreeCollateral)

	// update leverage if not correct
	if ftx.AccountInfo.Leverage != float64(config.Leverage) {
		client.Leverage(&account.RequestForLeverage{
			Leverage: config.Leverage,
		})
	}

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
					ftx.LastPrice = &trade.Price
					ftx.listener(trade.Price, trade.Time)
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

func (ftx *FTX) GetTrades(cb func(price float64, ts time.Time)) {
	ftx.listener = cb
}

func (ftx *FTX) CloseAll() error {
	_, err := ftx.client.CancelAll(&orders.RequestForCancelAll{})
	if err != nil {
		return errors.New("failed to cancel open orders")
	}

	ftx.UpdateAccountInfo()

	for _, pos := range ftx.AccountInfo.Positions {
		_, err := ftx.client.PlaceOrder(&orders.RequestForPlaceOrder{
			Market:     pos.Future,
			Side:       "sell",
			Type:       "market",
			Size:       pos.Size,
			ReduceOnly: true,
		})

		if err != nil {
			return fmt.Errorf("failed to close position: %+v", pos)
		}
	}

	return nil
}

func (ftx *FTX) PlaceTrigger(target float64) error {
	_, err := ftx.client.PlaceTriggerOrder(&orders.RequestForPlaceTriggerOrder{
		Market:       ftx.config.Ticker,
		Side:         "buy",
		Type:         "stop",
		TriggerPrice: target,
		Size:         0,
	})

	if err != nil {
		return fmt.Errorf("failed to create trigger order for: %f", target)
	}

	return nil
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

func (ftx *FTX) GetLastDay() (*markets.Candle, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.Add(-24 * time.Hour).Unix()

	candles, err := ftx.client.Candles(&markets.RequestForCandles{
		ProductCode: ftx.config.Ticker,
		Resolution:  86400,
		Limit:       3,
	})

	if err != nil {
		return nil, err
	}

	for _, candle := range *candles {
		if candle.StartTime.Unix() == yesterday {
			return &candle, nil
		}
	}

	err = fmt.Errorf("Failed to get last day price: %v", yesterday)
	return nil, err
}
