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
	fmt.Printf("total position size: $%.2f\n", ftx.AccountInfo.TotalPositionSize)
	fmt.Printf("total account value: $%.2f\n\n", ftx.AccountInfo.TotalAccountValue)

	return ftx
}

// Subscribe will open a websocket and listen for
// trades and order fills
func (ftx *FTX) Subscribe() {
	ctx, cancel := context.WithCancel(context.Background())
	ftx.unsubscribe = cancel
	c := ftx.config

	ch := make(chan realtime.Response)
	go realtime.Connect(ctx, ch, []string{"trades"}, []string{c.Ticker}, nil)
	go realtime.ConnectForPrivate(ctx, ch, c.Key, c.Secret, []string{"fills", "orders"}, nil, c.SubAccount)

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

			case realtime.ORDERS:
				// order has been filled
				if v.Orders.RemainingSize == 0 {
					ftx.SetStoploss(v.Orders.AvgFillPrice, v.Orders.FilledSize)
				}
			}
		}
	}
}

func (ftx *FTX) UnSubscribe() {
	ftx.unsubscribe()
}

// GetTrades will add a listener to the trades websocket
func (ftx *FTX) GetTrades(cb func(price float64, ts time.Time)) {
	ftx.listener = cb
}

// CloseAll will close all open orders and positions
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

// PlaceTrigger is used for placing orders for price target
func (ftx *FTX) PlaceTrigger(target float64) error {
	ftx.UpdateAccountInfo()

	collateral := ftx.AccountInfo.FreeCollateral * float64(ftx.config.Leverage)
	size := target / collateral

	_, err := ftx.client.PlaceTriggerOrder(&orders.RequestForPlaceTriggerOrder{
		Market:       ftx.config.Ticker,
		Side:         string(models.Buy),
		Type:         "stop",
		TriggerPrice: target,
		Size:         size,
	})

	if err != nil {
		return fmt.Errorf("failed to create trigger order for: $%.2f\t%v", target, err)
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

// GetLastDay will fetch yesterday's DAY candle
// used for calculating buy targets
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

	err = fmt.Errorf("failed to get last day price: %v", yesterday)
	return nil, err
}

// UpdateStoploss creates a stoploss for a filled order
func (ftx *FTX) SetStoploss(fillPrice, fillSize float64) {
	stopPrice := fillPrice * (1 - ftx.config.StopLoss)

	if fillSize == 0 {
		fmt.Println("Cannot set stoploss for order size of 0")
		return
	}

	_, err := ftx.client.PlaceTriggerOrder(&orders.RequestForPlaceTriggerOrder{
		Market:       ftx.config.Ticker,
		Side:         string(models.Sell),
		Type:         "stop",
		TriggerPrice: stopPrice,
		Size:         fillSize,
		ReduceOnly:   true,
	})

	if err != nil {
		fmt.Printf("failed to create stoploss for %.4f fill", fillSize)
	}
}

func (ftx *FTX) GetOpenOrders() (*orders.ResponseForOpenOrder, error) {
	return ftx.client.OpenOrder(&orders.RequestForOpenOrder{})
}
