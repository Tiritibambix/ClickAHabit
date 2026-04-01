package web

import (
	"net/http"
	"strconv"

	"github.com/aceberg/ClickAHabit/internal/db"
	"github.com/gin-gonic/gin"
)

func addHandler(c *gin.Context) {
	var idStr string
	var resp int

	tab := c.Param("tab")
	idStr = c.Param("id")
	ID, err := strconv.Atoi(idStr)
	allChecks = db.Select(appConfig.DBPath, tab)

	if err == nil {
		for _, check := range allChecks {
			if ID == check.ID {
				check.Count = check.Count + 1
				resp = check.Count
				db.Update(appConfig.DBPath, tab, check, check.ID)
				break
			}
		}
	}

	c.IndentedJSON(http.StatusOK, resp)
}

// delHandler resets count to 0 instead of deleting the entry
func delHandler(c *gin.Context) {

	tab := c.Param("tab")
	IDstr := c.Param("id")
	ID, err := strconv.Atoi(IDstr)

	if err == nil {
		allChecks = db.Select(appConfig.DBPath, tab)
		for _, check := range allChecks {
			if ID == check.ID {
				check.Count = 0
				db.Update(appConfig.DBPath, tab, check, check.ID)
				break
			}
		}
	}

	c.IndentedJSON(http.StatusOK, "ok")
}