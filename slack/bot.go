package slack

import (
	"fmt"
	"os"
	"sync"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
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

func (c *slackBot) TargetNotification(side models.Side, target float64) {
	message := fmt.Sprintf("Setting %s target for %.2f\n", side, target)
	c.PostMessage(models.TradeTargetsChannel, message)
}
