package web

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/aceberg/ClickAHabit/internal/models"
)

// MultiRequest - list of keys sent by the client
type MultiRequest struct {
	Keys []string `json:"keys"`
}

// MultiResult - fused stat + heatmap
type MultiResult struct {
	Stat    StatData      `json:"Stat"`
	HeatMap []HeatMapData `json:"HeatMap"`
}

func statsMulti(c *gin.Context) {
	var req MultiRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Keys) == 0 {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Merge all checks from selected habits into one fake stat
	var merged models.Stat
	merged.Name  = "Fusion"
	merged.Group = ""

	for _, key := range req.Keys {
		stat, ok := statsMap[key]
		if !ok {
			continue
		}
		merged.Checks = append(merged.Checks, stat.Checks...)
		merged.DTotal += stat.DTotal
		merged.CTotal += stat.CTotal
	}

	result := MultiResult{
		Stat:    buildStatData(merged),
		HeatMap: generateHeatMap(merged.Checks),
	}

	c.IndentedJSON(http.StatusOK, result)
}

func sortStrings(s []string) {
	for i := 1; i < len(s); i++ {
		key := s[i]
		j := i - 1
		for j >= 0 && s[j] > key {
			s[j+1] = s[j]
			j--
		}
		s[j+1] = key
	}
}

func mean(vals []float64) float64 {
	if len(vals) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range vals {
		sum += v
	}
	return sum / float64(len(vals))
}