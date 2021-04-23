package models

import (
	"encoding/json"
	"io/ioutil"
	"os"
)

type Configuration struct {
	Key        string `json:"key"`
	Secret     string `json:"secret"`
	SubAccount string `json:"subAccount"`
	Ticker     string `json:"ticker"`
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

	return json.Unmarshal(byteValue, config)
}
