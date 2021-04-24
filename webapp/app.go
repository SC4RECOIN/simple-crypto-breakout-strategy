package webapp

import (
	"fmt"
	"sync"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/trader"
	"github.com/gofiber/fiber/v2"
)

var (
	once sync.Once
	app  *fiber.App
	t    *trader.Trader
)

func Start(ftxTrader *trader.Trader) {
	t = ftxTrader
	once.Do(start)
}

func start() {
	app = fiber.New()

	app.Get("/heartbeat", func(c *fiber.Ctx) error {
		return c.SendString("active")
	})

	app.Get("/account-info", func(c *fiber.Ctx) error {
		return c.JSON(t.GetAccountInfo())
	})

	app.Get("/open-orders", func(c *fiber.Ctx) error {
		orders, err := t.GetOpenOrders()
		if err != nil {
			return err
		}

		return c.JSON(orders)
	})

	if err := app.Listen(":4000"); err != nil {
		fmt.Println("failled to start web app:", err)
	}
}
