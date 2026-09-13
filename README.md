# Personal Journal

A mobile-friendly text journal: write free-form entries, browse a 70-day heatmap of how often you write, search past entries by keyword, and jump to any day via the calendar.

## Stack

- **web** — Nginx, serves the built React (Vite) frontend and reverse-proxies `/api` to the app container.
- **app** — Node.js/Express API, cookie-based JWT auth.
- **db** — PostgreSQL, schema created automatically from `db/init.sql` on first boot.

## Running

```
cp .env.example .env   # edit POSTGRES_PASSWORD and JWT_SECRET, or keep the generated .env as-is
docker compose up --build
```

Visit http://localhost:8081 (or whatever `WEB_PORT` you set). The first account you register becomes the admin account.

## Data

- **Export**: sidebar → Data → Export JSON, downloads all of your entries.
- **Import**: sidebar → Data → Import JSON. This *replaces* your existing entries after a confirmation step.

## Development (without Docker)

```
# terminal 1
cd server && npm install && PGHOST=localhost npm start

# terminal 2
cd client && npm install && npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:3000`.
