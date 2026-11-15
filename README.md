# Seeker

Helps people explore faith and find a real congregation near them, without pushing any one religion. US only for now.

- **Explore** (`/explore`): a short reflection (belief, worship style, community, service, questions) that suggests traditions worth exploring and says why. Results are capped at two per tradition so several faiths always show.
- **Traditions** (`/traditions`): plain-language explainers for 9 traditions and 29 branches, with what worship is like and first-visit etiquette.
- **Scriptures** (`/scriptures`): each tradition's sacred texts (Bible translations, Tanakh in Hebrew and English, Quran, and others), the editions congregations use, and free apps and sites to read them. Also shown on each tradition's page.
- **Find a place** (`/find`): pick a tradition/denomination and a location (street address + ZIP, city, or device location) and get nearby places of worship on a map, with service times when known. Optional "about you" preferences (age, household, size, service times, programs) sort results and produce questions to ask the congregation.
- **Find a place** also: Christianity / Judaism / Islam / Other groups, sort by best fit, distance, name or denomination, tags (denomination, association like Southern Baptist Convention, service times, programs), related places in the same association, Google/Apple Maps directions, and service times read from congregations' websites when the map has none.
- **My places** (`/my-place`): save your home congregation and favorites (kept in this browser, with a 400-day cookie copy). When travelling, the home page and My places jump straight to similar congregations at your destination.
- **Listings** (`/listing`): congregations ask to add, update or remove their listing, with "show on Seeker" and "don't update or delete automatically" settings. Reviewed in **Admin** (`/admin`, `ADMIN_PASSWORD`), which can also edit any place directly and read **Contact** (`/contact`) messages.

## Run locally

```bash
pnpm install
pnpm dev
```

Searches use `data/places.db`. Without it, the app falls back to live Overpass queries (often 30 s+). Build the local copy for some states, or all of them:

```bash
node scripts/import-places.mjs PA
```

## Data

- Places of worship: OpenStreetMap (ODbL), imported per state by `scripts/import-places.mjs` into SQLite (`node:sqlite`, Node 22.13+). Raw tags are stored; `src/lib/osm.ts` normalizes them and matches them to branches (denomination tag, else name pattern, else "same religion, denomination not listed").
- Coverage is patchy: about half of US churches in OSM have no denomination tag, few list service times or websites, and many synagogues, mosques, temples and gurdwaras are missing or untagged. Each result links to OpenStreetMap ("Fix details") and to a web search for service times.
- Livestreams: `node scripts/find-livestreams.mjs philadelphia` reads each place's own website, finds where services are streamed (fixed links like a YouTube channel's live link, Church Online, BoxCast or Vimeo events; otherwise the YouTube Live tab or Facebook videos), keeps YouTube channels only if they streamed in the last 45 days, and writes `src/lib/livestreams.json` (review the diff, then commit).
- Location lookup: Photon (city/ZIP type-ahead) and Nominatim (street address + ZIP, one lookup per entry).
- Map tiles: OpenFreeMap.

## Settings

See `.env.example`: `ADMIN_PASSWORD` turns on /admin; `SMTP_USER` + `SMTP_PASS` (a Google Workspace app password) send email alerts for messages and listing requests through Gmail (otherwise they only show in /admin). Seeker's own data (listings, messages, cached website times) is `data/seeker.db` (`SEEKER_DB`).

## Deploy (VPS)

Docker app behind the shared Caddy, like the other `*.example.com` apps.

```bash
# on the VPS, in /opt/apps/seeker
mkdir -p data && sudo chown 1000:1000 data
docker compose up -d --build
docker compose exec web node scripts/import-places.mjs   # all states, about 1-2 hours
```

Caddyfile entry:

```
seeker.example.com {
	encode zstd gzip
	reverse_proxy seeker-web:3000
}
```

Re-run the importer weekly (cron) to pick up OpenStreetMap edits.
