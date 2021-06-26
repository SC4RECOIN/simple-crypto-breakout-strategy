package slack

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/go-numb/go-ftx/rest/private/orders"
	"github.com/slack-go/slack"
)

type slackBot struct {
	client *slack.Client
	sent   map[string]struct{}
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
				sent:   make(map[string]struct{}),
			}
		}
	})
	return &bot
}

// reset map of sent messages
func (c *slackBot) reset() {
	c.sent = make(map[string]struct{})
}

func (c *slackBot) PostMessage(channelID models.ChannelID, message string) {
	// message was already sent
	if _, ok := c.sent[message]; ok {
		return
	}

	if _, _, err := c.client.PostMessage(
		string(channelID),
		slack.MsgOptionText(message, false),
	); err != nil {
		fmt.Printf("Error sending slack message: %v\nMessage: %s\n", err.Error(), message)
		return
	}

	c.sent[message] = struct{}{}
	fmt.Println("Slack message sent: ", message)
}

func OrderNotification(order *orders.ResponseForPlaceTriggerOrder) {
	orderStr := "error marshaling order"
	if s, err := json.MarshalIndent(order, "", "\t"); err != nil {
		orderStr = string(s)
	}

	message := fmt.Sprintf("Sending %s trigger order for $%.2f\n>%s\n", order.Side, order.TriggerPrice, orderStr)
	DefaultClient().PostMessage(models.TradeTargetsChannel, message)
}

func OrderFilled(message string) {
	DefaultClient().PostMessage(models.OrderFilledChannel, message)
}

func NewDay() {
	DefaultClient().reset()
	DefaultClient().PostMessage(models.LogChannel, "New day")
}
