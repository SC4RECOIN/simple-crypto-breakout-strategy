package main

import (
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/go-numb/go-ftx/auth"
	"github.com/go-numb/go-ftx/rest"
	"github.com/go-numb/go-ftx/rest/private/account"
	"github.com/labstack/gommon/log"
)

func main() {
	config := models.Configuration{}
	if err := config.LoadConfig(); err != nil {
		log.Fatal(err)
	}

	// sub-account
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

	// account information
	info, err := client.Information(&account.RequestForInformation{})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%+v\n", info)
}
