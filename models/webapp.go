package models

type SetActiveRequest struct {
	Active bool `json:"active"`
}

type PushMessage struct {
	Title string `json:"title"`
	Body  string `json:"body"`
}
