package web

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// MultiRequest - list of keys sent by the client
type MultiRequest struct {
	Keys []string `json:"keys"`
}

// MultiStatData - all individual stats + aggregated average
type MultiStatData struct {
	Stats  []StatData  `json:"Stats"`
	Avg    Aggregated  `json:"Avg"`
}

// Aggregated - averaged data across all selected habits
type AggregatedPoint struct {
	Label string  `json:"Label"`
	Avg   float64 `json:"Avg"` // mean of per-habit monthly averages (avg/active day)
}

type Aggregated struct {
	MonthlyAvg []AggregatedPoint `json:"MonthlyAvg"`
	YearlyAvg  []AggregatedPoint `json:"YearlyAvg"`
}

func statsMulti(c *gin.Context) {
	var req MultiRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Keys) == 0 {
		c.IndentedJSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var result MultiStatData

	// Collect individual StatData for each key
	// monthAvgs[label] = list of per-habit avg values for that month
	monthAvgs := make(map[string][]float64)
	yearAvgs  := make(map[string][]float64)
	var monthOrder []string
	var yearOrder  []string
	seenMonths := make(map[string]bool)
	seenYears  := make(map[string]bool)

	for _, key := range req.Keys {
		stat, ok := statsMap[key]
		if !ok {
			continue
		}
		sd := buildStatData(stat)
		result.Stats = append(result.Stats, sd)

		for _, mp := range sd.MonthlyTotals {
			monthAvgs[mp.Label] = append(monthAvgs[mp.Label], mp.Avg)
			if !seenMonths[mp.Label] {
				seenMonths[mp.Label] = true
				monthOrder = append(monthOrder, mp.Label)
			}
		}
		for _, yp := range sd.YearlyTotals {
			yearAvgs[yp.Label] = append(yearAvgs[yp.Label], yp.Avg)
			if !seenYears[yp.Label] {
				seenYears[yp.Label] = true
				yearOrder = append(yearOrder, yp.Label)
			}
		}
	}

	// Sort month/year labels (already string-sortable: "2024-01", "2024")
	sortStrings(monthOrder)
	sortStrings(yearOrder)

	for _, label := range monthOrder {
		vals := monthAvgs[label]
		result.Avg.MonthlyAvg = append(result.Avg.MonthlyAvg, AggregatedPoint{
			Label: label,
			Avg:   mean(vals),
		})
	}
	for _, label := range yearOrder {
		vals := yearAvgs[label]
		result.Avg.YearlyAvg = append(result.Avg.YearlyAvg, AggregatedPoint{
			Label: label,
			Avg:   mean(vals),
		})
	}

	c.IndentedJSON(http.StatusOK, result)
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

func sortStrings(s []string) {
	// insertion sort — small slices, no import needed
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
