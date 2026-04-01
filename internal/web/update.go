package web

import (
	// "log"
	"net/http"
	"sync"

	// "github.com/aceberg/ClickAHabit/internal/db"
	"github.com/gin-gonic/gin"
)

var mu sync.Mutex

func updatePlan(c *gin.Context) {
	var resp int

	mu.Lock()

	tab  := c.Param("tab")
	date := c.Param("date")
	today := setToday()

	// Only initialise checks for today, never rewrite past dates
	if date == today {
		if tab == "checks" {
			setChecksForDate(date) // today.go
		} else {
			setWeeklyForDate(date) // weeks.go
		}
	}

	mu.Unlock()

	c.IndentedJSON(http.StatusOK, resp)
}
