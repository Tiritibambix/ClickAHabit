package web

import (
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
)

func dateHandler(c *gin.Context) {

	tab := c.Param("tab")
	date := c.Param("date")
	today := setToday()

	if today != lastToday {
		setTodayChecks()
	}

	checks := selectChecksByDate(tab, date)

	// Enrich with HasCost from plan
	for i, c := range checks {
		for _, p := range allPlans {
			if p.Name == c.Name && p.Group == c.Group {
				checks[i].HasCost = p.HasCost
				break
			}
		}
	}

	// Sort by Name
	sort.Slice(checks, func(i, j int) bool {
		return checks[i].Name < checks[j].Name
	})

	// Sort by Place
	sort.Slice(checks, func(i, j int) bool {
		return checks[i].Place < checks[j].Place
	})

	c.IndentedJSON(http.StatusOK, checks)
}
