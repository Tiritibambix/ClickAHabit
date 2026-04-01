package web

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/aceberg/ClickAHabit/internal/models"
)

// StatData - enriched statistics returned as JSON
type StatData struct {
	Name          string
	Group         string
	DTotal        int
	CTotal        int
	AvgPerDay     float64
	AvgPerWeek    float64
	AvgPerMonth   float64
	DowCounts     map[string]int     // day of week -> total count
	DowDays       map[string]int     // day of week -> number of days tracked
	MonthlyTotals []MonthPoint       // sorted list of month -> total count
	YearlyTotals  []YearPoint        // sorted list of year -> total count
}

// MonthPoint - one month data point
type MonthPoint struct {
	Label string // "2024-03"
	Count int
	Days  int
	Avg   float64
}

// YearPoint - one year data point
type YearPoint struct {
	Label string // "2024"
	Count int
	Days  int
	Avg   float64
}

var dowOrder = []string{"Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"}

func statsData(c *gin.Context) {
	key := c.Param("key")
	stat, ok := statsMap[key]

	if !ok {
		c.IndentedJSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	data := buildStatData(stat)
	c.IndentedJSON(http.StatusOK, data)
}

func buildStatData(stat models.Stat) StatData {
	var data StatData

	data.Name = stat.Name
	data.Group = stat.Group
	data.DTotal = stat.DTotal
	data.CTotal = stat.CTotal

	// Maps for aggregation
	dowCounts := make(map[string]int)
	dowDays := make(map[string]int)
	monthCounts := make(map[string]int)
	monthDays := make(map[string]int)
	yearCounts := make(map[string]int)
	yearDays := make(map[string]int)

	// Track unique days for averages
	trackedDays := make(map[string]bool)

	for _, check := range stat.Checks {
		t, err := time.Parse("2006-01-02", check.Date)
		if err != nil {
			continue
		}

		dow := dayOfWeekLabel(t)
		month := t.Format("2006-01")
		year := strconv.Itoa(t.Year())

		dowCounts[dow] += check.Count
		monthCounts[month] += check.Count
		yearCounts[year] += check.Count

		// Count unique days per bucket
		if !trackedDays[check.Date] {
			trackedDays[check.Date] = true
			dowDays[dow]++
			monthDays[month]++
			yearDays[year]++
		}
	}

	data.DowCounts = dowCounts
	data.DowDays = dowDays

	// Averages
	if stat.DTotal > 0 {
		data.AvgPerDay = float64(stat.CTotal) / float64(stat.DTotal)
	}
	if stat.DTotal > 0 {
		// weeks spanned
		data.AvgPerWeek = data.AvgPerDay * 7
	}
	if stat.DTotal > 0 {
		data.AvgPerMonth = data.AvgPerDay * 30.44
	}

	// Monthly sorted list
	var monthKeys []string
	for k := range monthCounts {
		monthKeys = append(monthKeys, k)
	}
	sort.Strings(monthKeys)

	for _, k := range monthKeys {
		days := monthDays[k]
		count := monthCounts[k]
		avg := 0.0
		if days > 0 {
			avg = float64(count) / float64(days)
		}
		data.MonthlyTotals = append(data.MonthlyTotals, MonthPoint{
			Label: k,
			Count: count,
			Days:  days,
			Avg:   avg,
		})
	}

	// Yearly sorted list
	var yearKeys []string
	for k := range yearCounts {
		yearKeys = append(yearKeys, k)
	}
	sort.Strings(yearKeys)

	for _, k := range yearKeys {
		days := yearDays[k]
		count := yearCounts[k]
		avg := 0.0
		if days > 0 {
			avg = float64(count) / float64(days)
		}
		data.YearlyTotals = append(data.YearlyTotals, YearPoint{
			Label: k,
			Count: count,
			Days:  days,
			Avg:   avg,
		})
	}

	return data
}

func dayOfWeekLabel(t time.Time) string {
	switch t.Weekday() {
	case time.Monday:
		return "Mo"
	case time.Tuesday:
		return "Tu"
	case time.Wednesday:
		return "We"
	case time.Thursday:
		return "Th"
	case time.Friday:
		return "Fr"
	case time.Saturday:
		return "Sa"
	case time.Sunday:
		return "Su"
	}
	return "??"
}
