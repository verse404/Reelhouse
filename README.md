# Reelhouse (`v1.0.0`)

An editorial movie & cinema session discovery guide across **Melbourne (19 venues)**, **Sydney (16 venues)**, and **Shanghai · 上海 (15 venues)** — built with React 19, TypeScript, Vite, and a hardened Node.js Backend-for-Frontend (BFF).

---

## Version 1 Highlights

- **3 Cities · 50 Iconic & Major-Circuit Cinemas**:
  - **Melbourne (VIC — 19 venues)**: IMAX Melbourne, Cinema Nova, The Astor Theatre, Lido, Classic, Sun Theatre, Cameo, Palace (Kino, Como, Westgarth, Pentridge, Balwyn), Hoyts (Melbourne Central, Chadstone, Docklands), Village (Crown, Rivoli, Doncaster), Reading Burwood TITAN LUXE.
  - **Sydney (NSW — 16 venues)**: IMAX Sydney, Hayden Orpheum, Golden Age Cinema & Bar, Ritz Randwick, Dendy Newtown, Palace (Central, Norton St), Event (George St, Macquarie, Parramatta, Burwood), Hoyts (Broadway, Chatswood, EQ), Reading Rhodes TITAN LUXE, United Warriewood.
  - **Shanghai (SH · 沪 — 15 venues)**: Grand Cinema 大光明, Shanghai Film Art Center 上海影城 SHO, Cathay 国泰, Peace IMAX 和平影都, Palace LUXE (iapm, Raffles North Bund, One East), Premiere Kerry 静安百美汇, MOViE MOViE Qiantan, SFC (Grand Gateway, Century Link), UME Xintiandi, Wanda IMAX Wujiaochang, CGV Magnolia Bund, Tianshan Cinema.
- **City-Specific 3-Plate Photography Gallery**: Interactive archival & evening cinema streetscape gallery tailored to Melbourne, Sydney, and Shanghai, with **Noir** and **Ivoire** visual editions.
- **My Location & Closest Cinemas Radar**:
  - 1-click live Browser GPS (`navigator.geolocation`) with automatic city detection.
  - Instant suburb, postcode, Metro station, and street-address search (`/api/geocode`).
  - Top-4 Closest Cinemas spotlight with exact distance (`km`), next screening tonight, 1-click venue filter, and turn-by-turn Google Maps directions.
- **Smart Filters & Night-Out Tools**:
  - Rolling 7-day calendar (with Cheap Tuesday highlights and automatic 15-minute grace window hiding past sessions today).
  - Individual Film & Cinema dropdowns, Chain, Suburb, Format (`IMAX`, `35mm / 70mm`, `Dolby Atmos`, `Gold Class / LUX`), Budget (`A$` / `¥`), and `Finish By` filters.
  - Tri-platform ratings (**IMDb**, **Rotten Tomatoes**, **Douban 豆瓣**), official YouTube trailer lightbox, 1-click **Google Calendar** export, shareable deep-link URLs, and **Folio** side-by-side session comparison.
- **Automated Daily Session & Ratings Refresh**:
  - **Server Scheduler (`server/index.mjs` + `server/syncCatalog.mjs`)**: Proactively checks catalog freshness (`syncedAtIso`) on startup and every 6 hours, refreshing Shanghai (Maoyan), IMAX Melbourne, Golden Age Sydney, TMDB films, and IMDb/RT/Douban ratings daily (`24h`) while using a quota-smart `84h` window (or `< 3` remaining days trigger) for SerpApi AU venues to stay comfortably inside free monthly limits.
  - **GitHub Actions Daily Cron (`.github/workflows/daily-catalog-sync.yml`)**: Runs automatically every day at `20:15 UTC` (`07:15 AEDT` / `04:15 CST`) to commit updated session snapshots and trigger automatic Render redeployments.

---

## Quick Start (Local Development)

```bash
cp .env.example .env   # Paste your free TMDB / OMDb / MDBList / SerpApi keys
npm install
npm run build
npm start              # Serves production SPA + BFF on http://127.0.0.1:3100
```

---

## 1-Click Cloud Deployment (Render / Railway / Cloud Run)

### Option A: Render.com (Free Tier via `render.yaml`)
1. Push this repository to GitHub (`.gitignore` excludes `.env` so API keys are never committed).
2. In Render, click **New + → Blueprint** and select this repository.
3. Paste `TMDB_API_KEY`, `OMDB_API_KEY`, `MDBLIST_API_KEY`, and `SERPAPI_API_KEY` when prompted, then click **Apply**.

### Option B: Railway (`railway.json` + `Dockerfile`)
1. In Railway, click **New Project → Deploy from GitHub repo** and select this repository.
2. Add `TMDB_API_KEY`, `OMDB_API_KEY`, `MDBLIST_API_KEY`, and `SERPAPI_API_KEY` under **Variables**, then click **Settings → Networking → Generate Domain**.

### Option C: Google Cloud Run (`deploy-cloudrun.sh`)
```bash
GCP_PROJECT_ID="your-gcp-project-id" bash ./deploy-cloudrun.sh
```
