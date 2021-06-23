package models

type Side string

const (
	Buy  Side = "buy"
	Sell Side = "sell"
)

type ChannelID string

const (
	TradeTargetsChannel ChannelID = "C025RJLNZRR"
	LogChannel          ChannelID = "C02645PU23B"
	OrderFilledChannel  ChannelID = "C025NF17L0M"
)
