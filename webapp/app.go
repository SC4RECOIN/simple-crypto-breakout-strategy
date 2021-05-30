package webapp

import (
	"fmt"
	"sync"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/models"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/notifications"
	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/trader"
	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

var (
	once     sync.Once
	app      *fiber.App
	t        *trader.Trader
	notifier *notifications.Notifications
)

func Start(ftxTrader *trader.Trader, n *notifications.Notifications) {
	t = ftxTrader
	notifier = n
	once.Do(start)
}

func start() {
	app = fiber.New()
	app.Use(cors.New())

	app.Get("/active", func(c *fiber.Ctx) error {
		return c.JSON(&fiber.Map{"active": t.IsActive()})
	})

	app.Post("/active", func(c *fiber.Ctx) error {
		req := models.SetActiveRequest{}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(&fiber.Map{
				"success": false,
				"error":   err,
			})
		}

		t.SetActive(req.Active)
		return c.JSON(&fiber.Map{"active": req.Active})
	})

	app.Get("/account-info", func(c *fiber.Ctx) error {
		info, err := t.GetAccountInfo()
		if err != nil {
			c.Status(500)
			return c.JSON(errMsg(err))
		}

		return c.JSON(info)
	})

	app.Get("/open-orders", func(c *fiber.Ctx) error {
		orders, err := t.GetOpenOrders()
		if err != nil {
			c.Status(500)
			return c.JSON(errMsg(err))
		}

		return c.JSON(orders)
	})

	app.Get("/positions", func(c *fiber.Ctx) error {
		positions, err := t.GetPositions()
		if err != nil {
			c.Status(500)
			return c.JSON(errMsg(err))
		}

		return c.JSON(positions)
	})

	app.Get("/last-price", func(c *fiber.Ctx) error {
		price, err := t.LastPrice()
		if err != nil {
			c.Status(500)
			return c.JSON(errMsg(err))
		}

		return c.JSON(&fiber.Map{"price": price})
	})

	app.Get("/target", func(c *fiber.Ctx) error {
		return c.JSON(t.GetTarget())
	})

	app.Post("/close-all", func(c *fiber.Ctx) error {
		if err := t.CloseAll(); err != nil {
			c.Status(500)
			return c.JSON(errMsg(err))
		}

		return c.JSON(&fiber.Map{"message": "all orders and positions closed"})
	})

	// Push notifications
	app.Post("/save-subscription", func(c *fiber.Ctx) error {
		req := webpush.Subscription{}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(&fiber.Map{
				"success": false,
				"error":   err,
			})
		}

		if notifier != nil {
			notifier.SetPushSubscription(&req)
		}

		return c.JSON(&fiber.Map{"success": true})
	})

	// React dashboard
	app.Static("/", "./dashboard/build")

	if err := app.Listen(":4000"); err != nil {
		fmt.Println("failed to start web app:", err)
	}
}

func errMsg(err error) map[string]string {
	return map[string]string{"error": err.Error()}
}
