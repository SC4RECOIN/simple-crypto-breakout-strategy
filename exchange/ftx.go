package exchange

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/slack"
	"github.com/go-numb/go-ftx/auth"
	"github.com/go-numb/go-ftx/realtime"
	"github.com/go-numb/go-ftx/rest"
	"github.com/go-numb/go-ftx/rest/private/account"
	"github.com/go-numb/go-ftx/rest/private/fills"
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
				slack.LogInfo(fmt.Sprintf("order fill:\tprice: %.2f\tsize: %.4f\n", v.Fills.Price, v.Fills.Size))

			case realtime.ORDERS:
				slack.LogInfo(fmt.Sprintf("Order filled:\t%.2f filled @ %.2f\t%v", v.Orders.FilledSize, v.Orders.AvgFillPrice, time.Now()))

			case realtime.ERROR:
				fmt.Printf("websocker err: %v\n", v.Results)

				// ws has be unsubscribed; reconnect
				fmt.Println("attempting to reconnect in 1Min", time.Now())
				ftx.UnSubscribe()
				time.AfterFunc(time.Minute, ftx.Subscribe)
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

		side := models.Buy
		if pos.Side == string(models.Buy) {
			side = models.Sell
		}

		_, err := ftx.client.PlaceOrder(&orders.RequestForPlaceOrder{
			Market:     pos.Future,
			Side:       string(side),
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
func (ftx *FTX) PlaceTrigger(target float64, side models.Side) (*orders.ResponseForPlaceTriggerOrder, error) {
	ftx.UpdateAccountInfo()

	collateral := ftx.AccountInfo.FreeCollateral * float64(ftx.config.Leverage)
	size := collateral / target

	resp, err := ftx.client.PlaceTriggerOrder(&orders.RequestForPlaceTriggerOrder{
		Market:       ftx.config.Ticker,
		Side:         string(side),
		Type:         "stop",
		TriggerPrice: target,
		Size:         size,
	})

	if err != nil {
		err := fmt.Errorf("failed to create trigger order for: $%.2f\t%v", target, err)
		slack.LogError(err)
		return nil, err
	}

	slack.OrderNotification(resp)
	return resp, nil
}

func (ftx *FTX) UpdateAccountInfo() {
	info, err := ftx.client.Information(&account.RequestForInformation{})
	if err != nil {
		fmt.Printf("Error fetching account info: %v\n", err)
		return
	}

	// filter out positions that have been closed
	positions := []account.Position{}
	for _, pos := range info.Positions {
		if pos.Size > 0 {
			positions = append(positions, pos)
		}
	}

	ftx.AccountInfo = &models.AccountInfo{
		Collateral:        info.Collateral,
		FreeCollateral:    info.FreeCollateral,
		TotalAccountValue: info.TotalAccountValue,
		TotalPositionSize: info.TotalPositionSize,
		Leverage:          info.Leverage,
		Positions:         positions,
	}
}

// GetLastDay will fetch yesterday's DAY candle
// used for calculating buy targets
func (ftx *FTX) GetLastDay() (*markets.Candle, float64, error) {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	yesterday := today.Add(-24 * time.Hour).Unix()

	candles, err := ftx.client.Candles(&markets.RequestForCandles{
		ProductCode: ftx.config.Ticker,
		Resolution:  86400,
		Limit:       ftx.config.MaWindow + 1,
	})

	if err != nil {
		return nil, 0, err
	}

	closeSum := 0.0
	for i, candle := range *candles {
		closeSum += candle.Close

		if candle.StartTime.Unix() == yesterday {
			// history endpoint returned incorrect number of candles
			if i+1 != ftx.config.MaWindow {
				return nil, 0, fmt.Errorf("failed to caculate MA: %d candles", i+1)
			}

			ma := closeSum / float64(ftx.config.MaWindow)
			return &candle, ma, nil
		}
	}

	return nil, 0, fmt.Errorf("failed to get last day price: %v", yesterday)
}

// UpdateStoploss creates a stoploss for an order
func (ftx *FTX) SetStoploss(stopPrice, size float64, side models.Side) (*orders.ResponseForPlaceTriggerOrder, error) {
	if size == 0 {
		return nil, errors.New("Cannot set stoploss for order size of 0")
	}

	resp, err := ftx.client.PlaceTriggerOrder(&orders.RequestForPlaceTriggerOrder{
		Market:       ftx.config.Ticker,
		Side:         string(side),
		Type:         "stop",
		TriggerPrice: stopPrice,
		Size:         size,
		ReduceOnly:   true,
	})

	if err != nil {
		slack.LogError(fmt.Errorf("error setting stop loss: %v", err))
		return nil, err
	}

	slack.OrderNotification(resp)
	return resp, nil
}

func (ftx *FTX) GetMarket() (*markets.Market, error) {
	resp, err := ftx.client.Markets(&markets.RequestForMarkets{
		ProductCode: ftx.config.Ticker,
	})

	if err != nil || len(*resp) == 0 {
		return nil, fmt.Errorf("failed to get snapshot for %s", ftx.config.Ticker)
	}

	markets := *resp
	return &markets[0], nil
}

func (ftx *FTX) GetOpenOrders() (*orders.ResponseForOpenTriggerOrders, error) {
	return ftx.client.OpenTriggerOrders(&orders.RequestForOpenTriggerOrders{})
}

func (ftx *FTX) GetPositions() (*account.ResponseForPositions, error) {
	return ftx.client.Positions(&account.RequestForPositions{ShowAvgPrice: true})
}

// GetFills returns all fills since start of day
func (ftx *FTX) GetFills() (*[]fills.Fill, error) {
	now := time.Now().UTC()
	startOfDay := now.Truncate(24 * time.Hour)

	// avoid getting fills for eod closes
	start := startOfDay.Add(5 * time.Minute)

	resp, err := ftx.client.Fills(&fills.Request{
		ProductCode: ftx.config.Ticker,
		Start:       start.Unix(),
	})

	if err != nil {
		return nil, err
	}

	fills := []fills.Fill(*resp)
	return &fills, nil
}
