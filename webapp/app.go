package webapp

import (
	"fmt"
	"sync"

	"github.com/SC4RECOIN/simple-crypto-breakout-strategy/trader"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
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
	app.Use(cors.New())

	app.Get("/active", func(c *fiber.Ctx) error {
		return c.JSON(&fiber.Map{"active": t.IsActive()})
	})

	app.Post("/active", func(c *fiber.Ctx) error {
		req := SetActiveRequest{}
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

	// React dashboard
	app.Static("/", "./dashboard/build")

	if err := app.Listen(":4000"); err != nil {
		fmt.Println("failled to start web app:", err)
	}
}

func errMsg(err error) map[string]string {
	return map[string]string{"error": err.Error()}
}
