[![Main-Docker](https://github.com/Tiritibambix/ClickAHabit/actions/workflows/main-docker.yml/badge.svg)](https://github.com/Tiritibambix/ClickAHabit/actions/workflows/main-docker.yml)

<h1><a href="https://github.com/aceberg/clickahabit">
    <img src="https://raw.githubusercontent.com/aceberg/clickahabit/main/assets/logo.png" width="35" />
</a>Click A Habit</h1>

Daily habit tracker and counter

> ⚠️ **Disclaimer**
> This is a fork of [aceberg/ClickAHabit](https://github.com/aceberg/ClickAHabit), which is no longer maintained.
> All changes from the original version have been vibe coded. Use at your own risk.

- [Quick start](#quick-start)
- [Config](#config)
- [Options](#options)
- [Local network only](#local-network-only)
- [Changes from original](#changes-from-original)
- [Thanks](#thanks)

![Screenshot](https://raw.githubusercontent.com/aceberg/ClickAHabit/main/assets/Screenshot.png)
<details>
  <summary>More Themes</summary>
  <img src="https://raw.githubusercontent.com/aceberg/ClickAHabit/main/assets/Screenshot1.png">
  <img src="https://raw.githubusercontent.com/aceberg/ClickAHabit/main/assets/Screenshot2.png">
</details>

## Quick start

```sh
docker run --name clickahabit \
-e "TZ=Europe/Paris" \
-v ~/.dockerdata/ClickAHabit:/data/ClickAHabit \
-p 8852:8852 \
tiritibambix/clickahabit
```
Or use [docker-compose.yml](docker-compose.yml)

## Config

Configuration can be done through config file or environment variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| HOST | Listen address | 0.0.0.0 |
| PORT | Port for web GUI | 8852 |
| THEME | Any theme name from https://bootswatch.com in lowercase or [additional](https://github.com/aceberg/aceberg-bootswatch-fork) (emerald, grass, sand) | united |
| COLOR | Background color: light or dark | light |
| BTNWIDTH | Adjust buttons to theme | 195px |
| TZ | Set your timezone for correct time | "" |

## Options

| Key | Description | Default |
| --- | ----------- | ------- |
| -d | Path to config dir | /data/ClickAHabit |
| -n | Path to local JS and Themes ([node-bootstrap](https://github.com/aceberg/my-dockerfiles/tree/main/node-bootstrap)) | "" |

## Local network only

By default, this app pulls themes, icons and fonts from the internet. But in some cases it may be useful to have a setup independent from the global network. A separate [image](https://github.com/aceberg/my-dockerfiles/tree/main/node-bootstrap) exists with all necessary modules and fonts.

```sh
docker run --name node-bootstrap       \
    -v ~/.dockerdata/icons:/app/icons  \
    -p 8850:8850                       \
    aceberg/node-bootstrap
```
```sh
docker run --name clickahabit \
    -v ~/.dockerdata/ClickAHabit:/data/ClickAHabit \
    -p 8852:8852 \
    tiritibambix/clickahabit -n "http://$YOUR_IP:8850"
```
Or use [docker-compose](docker-compose-local.yml)

## Changes from original

### Stats page — reworked

The statistics page has been significantly extended:

- **KPI cards**: active days, total clicks, average per active day / week / month / year, best month, best day of week
- **Year heatmap**: unchanged from original
- **Charts**: monthly evolution (bar + avg line), yearly evolution, breakdown by day of week — all using real aggregated data computed server-side
- **Multi-habit comparison**: select multiple habits via checkboxes, compare their individual curves and a global average on the same chart (monthly or yearly view)

### GitHub Actions workflow

- Replaced deprecated `c-py/action-dotenv-to-setenv` action with a native shell step
- Updated all actions to current versions
- Simplified to `latest` tag only, amd64 build

## Thanks

- All go packages listed in [dependencies](https://github.com/aceberg/clickahabit/network/dependencies)
- [Bootstrap](https://getbootstrap.com/)
- Themes: [Free themes for Bootstrap](https://bootswatch.com)
- Favicon and logo: [Flaticon](https://www.flaticon.com/icons/)
- Original project: [aceberg/ClickAHabit](https://github.com/aceberg/ClickAHabit)