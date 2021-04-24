package models

import (
	"encoding/json"
	"io/ioutil"
	"os"

	"github.com/go-numb/go-ftx/rest/private/account"
)

type Configuration struct {
	Key        string  `json:"key"`
	Secret     string  `json:"secret"`
	SubAccount string  `json:"subAccount"`
	Ticker     string  `json:"ticker"`
	K          float32 `json:"k"`
	StopLoss   float32 `json:"stoploss"`
	Leverage   int     `json:"leverage"`
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
