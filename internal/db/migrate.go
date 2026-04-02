package db

import (
	"log"
	"strings"
)

// Migrate adds columns introduced after the initial schema.
// Uses ALTER TABLE directly and silently ignores "duplicate column" errors
// so it is safe to run on every startup.
func Migrate(path string) {
	migrations := []string{
		`ALTER TABLE checks ADD COLUMN COST REAL DEFAULT 0`,
		`ALTER TABLE weeks  ADD COLUMN COST REAL DEFAULT 0`,
	}

	mu.Lock()
	dbx := connect(path)
	for _, stmt := range migrations {
		_, err := dbx.Exec(stmt)
		if err != nil && !strings.Contains(err.Error(), "duplicate column") {
			log.Println("ERROR: migrate:", err)
		}
	}
	mu.Unlock()
}
