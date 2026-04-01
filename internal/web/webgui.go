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

	// Auto-migrate sqlite1.db -> sqlite.db
	oldDB := dirPath + "/sqlite1.db"
	_, errNew := os.Stat(appConfig.DBPath)
	_, errOld := os.Stat(oldDB)
	if errOld == nil && errNew != nil {
		log.Println("INFO: migrating sqlite1.db to sqlite.db")
		data, err := os.ReadFile(oldDB)
		if err == nil {
			if err = os.WriteFile(appConfig.DBPath, data, 0644); err != nil {
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
	router.SetHTMLTemplate(templ)

	router.StaticFS("/fs/", http.FS(pubFS))

	router.GET("/", indexHandler)
	router.GET("/add/:tab/:id", addHandler)
	router.GET("/config/", configHandler)
	router.GET("/date/:tab/:date", dateHandler)
	router.GET("/del/:tab/:id", delHandler)
	router.GET("/plan/", planHandler)
	router.GET("/planedit/:id", editHandler)
	router.GET("/plandel/:id", planDel)
	router.GET("/stats/:tab/:id", statsHandler)
	router.GET("/smore/:key", statsMore)
	router.GET("/sdata/:key", statsData)
	router.POST("/sdata-multi", statsMulti)
	router.GET("/update/:tab/:date", updatePlan)

	router.POST("/config/", saveConfigHandler)
	router.POST("/planedit/", savePlanHandler)

	err := router.Run(address)
	check.IfError(err)
}
