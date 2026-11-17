package web

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/aceberg/ClickAHabit/internal/check"
	"github.com/aceberg/ClickAHabit/internal/conf"
	"github.com/aceberg/ClickAHabit/internal/models"
)

// Accents - selectable accent palette, kept in sync with the
// data-accent rules in public/css/index.css
var Accents = []models.Accent{
	{Key: "emerald", Label: "Emerald", Hex: "#15803d"},
	{Key: "blue", Label: "Blue", Hex: "#2563eb"},
	{Key: "indigo", Label: "Indigo", Hex: "#4338ca"},
	{Key: "violet", Label: "Violet", Hex: "#7c3aed"},
	{Key: "rose", Label: "Rose", Hex: "#be123c"},
	{Key: "red", Label: "Red", Hex: "#b91c1c"},
	{Key: "orange", Label: "Orange", Hex: "#c2410c"},
	{Key: "amber", Label: "Amber", Hex: "#a16207"},
	{Key: "teal", Label: "Teal", Hex: "#0f766e"},
	{Key: "slate", Label: "Slate", Hex: "#334155"},
}

func isValidAccent(key string) bool {
	for _, a := range Accents {
		if a.Key == key {
			return true
		}
	}
	return false
}

func configHandler(c *gin.Context) {
	var guiData models.GuiData

	guiData.Config = appConfig
	guiData.Accents = Accents

	file, err := pubFS.ReadFile("public/version")
	check.IfError(err)
	version := string(file)
	guiData.Version = version[8:]

	c.HTML(http.StatusOK, "header.html", guiData)
	c.HTML(http.StatusOK, "config.html", guiData)
}

func saveConfigHandler(c *gin.Context) {

	appConfig.Host = c.PostForm("host")
	appConfig.Port = c.PostForm("port")
	appConfig.Color = c.PostForm("color")

	theme := c.PostForm("theme")
	if isValidAccent(theme) {
		appConfig.Theme = theme
	}

	conf.Write(appConfig)

	log.Println("INFO: writing new config to", appConfig.ConfPath)

	c.Redirect(http.StatusFound, "/config")
}
