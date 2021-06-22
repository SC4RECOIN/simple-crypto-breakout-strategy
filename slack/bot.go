package slack

import (
	"fmt"
	"os"
	"sync"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/go-numb/go-ftx/rest/private/orders"
	"github.com/slack-go/slack"
)

type slackBot struct {
	client *slack.Client
}

var (
	bot  slackBot
	once sync.Once
)

func DefaultClient() *slackBot {
	once.Do(func() {
		if key := os.Getenv("SLACK_BOT_KEY"); key != "" {
			bot = slackBot{
				client: slack.New(key),
			}
		}
	})
	return &bot
}

func (c *slackBot) PostMessage(channelID models.ChannelID, message string) {
	if _, _, err := c.client.PostMessage(
		string(channelID),
		slack.MsgOptionText(message, false),
	); err != nil {
		fmt.Printf("Error sending slack message: %v\nMessage: %s\n", err.Error(), message)
		return
	}
	fmt.Println("Slack message sent: ", message)
}

func OrderNotification(order *orders.ResponseForPlaceTriggerOrder) {
	message := fmt.Sprintf("Sending %s trigger for $%.2f\n", order.Side, order.TriggerPrice)
	DefaultClient().PostMessage(models.TradeTargetsChannel, message)
}
