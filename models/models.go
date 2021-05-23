package models

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"os"
	"time"

	"github.com/go-numb/go-ftx/rest/private/account"
	"github.com/go-numb/go-ftx/rest/private/fills"
)

type Configuration struct {
	Key        string  `json:"key"`
	Secret     string  `json:"secret"`
	SubAccount string  `json:"subAccount"`
	Ticker     string  `json:"ticker"`
	LongK      float64 `json:"longK"`
	ShortK     float64 `json:"shortK"`
	CanShort   bool    `json:"canShort"`
	MaWindow   int     `json:"maWindow"`
	UseMA      bool    `json:"useMa"`
	StopLoss   float64 `json:"stoploss"`
	Leverage   int     `json:"leverage"`
	AutoStart  bool    `json:"autostart"`
	WebpushKey string  `json:"webpushKey"`
}

func (config *Configuration) LoadConfig() error {
	jsonFile, err := os.Open("config.json")
	if err != nil {
		return err
	}

	defer jsonFile.Close()

	byteValue, err := ioutil.ReadAll(jsonFile)
	if err != nil {
		return err
	}

	err = json.Unmarshal(byteValue, config)
	if err != nil {
		return err
	}

	// Only override if key is not set
	if key := os.Getenv("FTX_KEY"); key != "" && config.Key == "" {
		config.Key = key
	}
	if secret := os.Getenv("FTX_SECRET"); secret != "" && config.Secret == "" {
		config.Secret = secret
	}
	if webpushKey := os.Getenv("TRADER_WEBPUSH_KEY"); webpushKey != "" && config.WebpushKey == "" {
		config.WebpushKey = webpushKey
	}

	return config.Validate()
}

func (config *Configuration) Validate() error {
	if config.Key == "" || config.Secret == "" {
		msg := "config key and secret cannot be empty"
		return errors.New(msg)
	}

	if config.Ticker == "" {
		return errors.New("ticker cannot be empty")
	}

	if config.LongK <= 0 || config.ShortK <= 0 {
		return errors.New("k must be greater than 0")
	}

	if config.Leverage < 1 {
		return errors.New("leverage must be 1 or greater")
	}

	if config.StopLoss*float64(config.Leverage) > 0.4 {
		return errors.New("config too risky; reduce stoploss or leverage")
	}

	return nil
}

type AccountInfo struct {
	Collateral        float64            `json:"collateral"`
	FreeCollateral    float64            `json:"freeCollateral"`
	TotalAccountValue float64            `json:"totalAccountValue"`
	TotalPositionSize float64            `json:"totalPositionSize"`
	Leverage          float64            `json:"leverage"`
	Positions         []account.Position `json:"positions"`
}

type AccountInfoResponse struct {
	Collateral        float64            `json:"collateral"`
	FreeCollateral    float64            `json:"freeCollateral"`
	TotalAccountValue float64            `json:"totalAccountValue"`
	TotalPositionSize float64            `json:"totalPositionSize"`
	Positions         []account.Position `json:"positions"`
	Fills             *[]fills.Fill      `json:"fills"`
}

type Target struct {
	Last        float64   `json:"last"`
	LastTime    time.Time `json:"lastTime"`
	LongTarget  float64   `json:"longTarget"`
	ShortTarget float64   `json:"shortTarget"`
	CanLong     bool      `json:"canLong"`
	CanShort    bool      `json:"canShort"`
	Open        float64   `json:"open"`
	Ticker      string    `json:"ticker"`
}
