# Personal Journal

A mobile-friendly text journal: write free-form entries, search past entries by keyword, and jump to any day via the calendar.

## Stack

- **web** — Nginx
- **app** — Node.js/Express API
- **db** — PostgreSQL

## Running

```
cp .env.example .env   # edit POSTGRES_PASSWORD and JWT_SECRET, or keep the generated .env as-is
docker compose up --build
```

Visit http://localhost:8081 (or whatever `WEB_PORT` you set). The first account you register becomes the admin account.

## Data

- **Export**: sidebar → Data → Export JSON, downloads all of your entries.
- **Import**: sidebar → Data → Import JSON. This *replaces* your existing entries after a confirmation step.
