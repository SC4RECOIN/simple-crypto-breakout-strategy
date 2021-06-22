package slack

import (
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
)

func LogInfo(message string) {
	DefaultClient().PostMessage(models.LogChannel, message)
}

func LogError(err error) {
	msg := fmt.Sprintf("An error occured: %v\n", err.Error())
	DefaultClient().PostMessage(models.LogChannel, msg)
}
