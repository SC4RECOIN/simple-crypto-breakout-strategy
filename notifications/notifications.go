package notifications

import (
	"encoding/json"
	"fmt"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/SherClockHolmes/webpush-go"
)

type Notifications struct {
	pushSubscription *webpush.Subscription
	webpushKey       *string
}

func New(key *string) *Notifications {
	return &Notifications{
		webpushKey: key,
	}
}

func (n *Notifications) SetPushSubscription(subscription *webpush.Subscription) {
	n.pushSubscription = subscription
}

func (n *Notifications) SendWebPush(message models.PushMessage) {
	if n.pushSubscription == nil {
		fmt.Printf("no active subscription")
		return
	}

	if n.webpushKey == nil && *n.webpushKey != "" {
		fmt.Printf("missing private key for webpush")
		return
	}

	msgBytes, err := json.Marshal(message)
	if err != nil {
		fmt.Println("error sending push notification", err)
		return
	}

	resp, err := webpush.SendNotification(msgBytes, n.pushSubscription, &webpush.Options{
		VAPIDPublicKey:  "BG12KsHIfuMdRqATtRAlE3_8Vfpp7fn68e143bbwJYrON49qLKf4hy5vnti6XKUIlanJ0VOnTT9m4tOrU-RL-h8",
		VAPIDPrivateKey: *n.webpushKey,
		TTL:             30,
	})
	if err != nil {
		fmt.Printf("error sending webpush notification")
	}
	defer resp.Body.Close()
}
