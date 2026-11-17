[![Main-Docker](https://github.com/Tiritibambix/ClickAHabit/actions/workflows/main-docker.yml/badge.svg)](https://github.com/Tiritibambix/ClickAHabit/actions/workflows/main-docker.yml)

[![Main-Docker - AMD64 Only](https://github.com/Tiritibambix/ClickAHabit/actions/workflows/main-docker-amd64-only.yml/badge.svg)](https://github.com/Tiritibambix/ClickAHabit/actions/workflows/main-docker-amd64-only.yml)

<h1><a href="https://github.com/aceberg/clickahabit">
    <img src="https://raw.githubusercontent.com/aceberg/clickahabit/main/assets/logo.png" width="35" />
</a>Click A Habit</h1>

Daily habit tracker and counter

> ⚠️ **Disclaimer**
> This is a fork of [aceberg/ClickAHabit](https://github.com/aceberg/ClickAHabit), which is no longer maintained.
> The upstream Docker image has not been updated in ~2 years and does not reflect the current source code.
> All changes from the original version have been vibe coded. Use at your own risk.

- [Quick start](#quick-start)
- [Migration from aceberg/clickahabit](#migration-from-acebergclickahabit)
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

## Migration from aceberg/clickahabit

This image uses `sqlite.db` instead of `sqlite1.db`. Migration is automatic on first startup: if `sqlite.db` does not exist but `sqlite1.db` does, it will be copied automatically.

If you are switching from `aceberg/clickahabit`, just point your volume to the same data directory and start the container — no manual action required.

## Config

Configuration can be done through config file or environment variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| HOST | Listen address | 0.0.0.0 |
| PORT | Port for web GUI | 8852 |
| THEME | Accent color: `emerald`, `blue`, `indigo`, `violet`, `rose`, `red`, `orange`, `amber`, `teal`, `slate` | emerald |
| COLOR | Default color mode: light or dark (anyone can also flip this per-browser with the sun/moon button in the navbar) | light |
| BTNWIDTH | Deprecated / no-op. Habit tiles now lay out on a responsive grid, so button width is no longer configurable. Kept only so old config files keep loading. | 195px |
| TZ | Set your timezone for correct time | "" |

## Options

| Key | Description | Default |
| --- | ----------- | ------- |
| -d | Path to config dir | /data/ClickAHabit |
| -n | Path to local JS and Themes ([node-bootstrap](https://github.com/aceberg/my-dockerfiles/tree/main/node-bootstrap)) | "" |

## Local network only

By default, this app pulls Bootstrap, Bootstrap Icons and Chart.js from the internet. But in some cases it may be useful to have a setup independent from the global network. A separate [image](https://github.com/aceberg/my-dockerfiles/tree/main/node-bootstrap) exists with all necessary modules and fonts. As of the UI redesign below, this app only needs the plain `bootstrap` and `bootstrap-icons` npm packages (Bootswatch is no longer used), so make sure the local assets image bundles those.

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

### Bug fixes

- **Reset today**: "Reset today's counter" now sets count to 0 instead of deleting the entry — the habit stays visible
- **Past date entries**: navigating to a past date no longer triggers plan reinitialization, preserving existing counts

### Stats page — reworked

- **KPI cards**: active days, total clicks, average per active day / week / month / year, best month, best day of week
- **Year heatmap**: preserved from original
- **Charts**: monthly evolution (bar + avg/active day line), yearly evolution, breakdown by day of week — computed server-side
- **Habit fusion**: select multiple habits via checkboxes and merge them into a single stat view — combined KPIs, heatmap and charts

### UI — full redesign

- Dropped Bootswatch; the whole app now runs on a custom design system layered on Bootstrap's own semantic CSS variables (`--bs-*`), so every component (navbar, buttons, cards, forms, tables, modal) is consistently themed instead of depending on whichever of the 28 third-party themes was picked
- Accent color replaces the old theme picker: 10 curated colors (emerald, blue, indigo, violet, rose, red, orange, amber, teal, slate), each tuned separately for light and dark mode for proper contrast
- A sun/moon button in the navbar lets anyone flip light/dark instantly for their own browser (saved in `localStorage`), on top of the server-wide default in Config
- Habit buttons are now proper tiles on a responsive auto-fit grid (no more fixed-width `btn-group` hack, no more overflow on long habit names — they truncate with an ellipsis instead)
- Active page is now highlighted in the navbar
- Fixed: the right-click habit context menu could appear off-target after scrolling the page (it used scroll-relative coordinates with `position: fixed`)
- Fixed: duplicate entries in the Theme/Color dropdowns on the Config page
- Fixed: broken-image icon shown when a habit or the icon-preview had no icon set
- Added a confirmation prompt before deleting a habit from the Plan page
- Fixed a leftover French label ("Fusion") in the Stats merge panel
- Config page cleaned up: accent swatches, grouped settings, version shown in the About card
- Responsive habit tiles and nav on mobile, no fixed button width to fight with

### GitHub Actions workflow

- Replaced deprecated `c-py/action-dotenv-to-setenv` with a native shell step
- Updated all actions to current versions
- Simplified to `latest` tag

## Thanks

- All go packages listed in [dependencies](https://github.com/aceberg/clickahabit/network/dependencies)
- [Bootstrap](https://getbootstrap.com/)
- Themes: [Free themes for Bootstrap](https://bootswatch.com)
- Favicon and logo: [Flaticon](https://www.flaticon.com/icons/)
- Original project: [aceberg/ClickAHabit](https://github.com/aceberg/ClickAHabit)