package web

import (
	"html/template"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"

	"github.com/aceberg/ClickAHabit/internal/check"
	"github.com/aceberg/ClickAHabit/internal/conf"
	"github.com/aceberg/ClickAHabit/internal/db"
	"github.com/aceberg/ClickAHabit/internal/yaml"
)

// Gui - start web server
func Gui(dirPath, nodePath string) {

	confPath := dirPath + "/config.yaml"
	check.Path(confPath)

	appConfig = conf.Get(confPath)

	appConfig.DirPath = dirPath
	appConfig.DBPath = dirPath + "/sqlite.db"
	appConfig.ConfPath = confPath
	appConfig.NodePath = nodePath

	// Migrate sqlite1.db -> sqlite.db if needed
	oldDB := dirPath + "/sqlite1.db"
	_, errNew := os.Stat(appConfig.DBPath)
	_, errOld := os.Stat(oldDB)
	if errOld == nil && errNew != nil {
		// sqlite.db does not exist but sqlite1.db does: copy it
		log.Println("INFO: migrating sqlite1.db to sqlite.db")
		data, err := os.ReadFile(oldDB)
		if err == nil {
			err = os.WriteFile(appConfig.DBPath, data, 0644)
			if err != nil {
				log.Println("ERROR: migration failed:", err)
			} else {
				log.Println("INFO: migration done")
			}
		}
	}

	check.Path(appConfig.DBPath)

	log.Println("INFO: starting web gui with config", appConfig.ConfPath)

	db.Create(appConfig.DBPath)
	allChecks = db.Select(appConfig.DBPath, "checks")
	allPlans = yaml.Read(appConfig.DirPath + "/plan.yaml")

	address := appConfig.Host + ":" + appConfig.Port

	log.Println("=================================== ")
	log.Printf("Web GUI at http://%s", address)
	log.Println("=================================== ")

	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	templ := template.Must(template.New("").ParseFS(templFS, "templates/*"))
	router.SetHTMLTemplate(templ) // templates

	router.StaticFS("/fs/", http.FS(pubFS)) // public

	router.GET("/", indexHandler)                // index.go
	router.GET("/add/:tab/:id", addHandler)      // add-del.go
	router.GET("/config/", configHandler)        // config.go
	router.GET("/date/:tab/:date", dateHandler)  // date.go
	router.GET("/del/:tab/:id", delHandler)      // add-del.go
	router.GET("/plan/", planHandler)            // plan.go
	router.GET("/planedit/:id", editHandler)     // plan-edit.go
	router.GET("/plandel/:id", planDel)          // plan.go
	router.GET("/stats/:tab/:id", statsHandler)  // stats.go
	router.GET("/smore/:key", statsMore)         // stats-more.go
	router.GET("/sdata/:key", statsData)         // stats-data.go
	router.POST("/sdata-multi", statsMulti)      // stats-multi.go
	router.GET("/update/:tab/:date", updatePlan) // update.go

	router.POST("/config/", saveConfigHandler) // config.go
	router.POST("/planedit/", savePlanHandler) // plan-edit.go

	err := router.Run(address)
	check.IfError(err)
}
