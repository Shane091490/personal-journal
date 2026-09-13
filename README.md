# Personal Journal

A mobile-friendly text journal: write free-form entries, search past entries by keyword, and jump to any day via the calendar.

## Screenshot
<img width="1903" height="886" alt="Screenshot_2026-09-13_13-36-23" src="https://github.com/user-attachments/assets/7b225467-6591-476c-ab7c-5fc7be4911bf" />


## Stack

- **web** — Nginx
- **app** — Node.js/Express API
- **db** — PostgreSQL

## Deployment

```
git clone https://github.com/Shane091490/personal-journal.git
cp .env.example .env   # edit POSTGRES_PASSWORD and JWT_SECRET, or keep the generated .env as-is
docker compose up --build
```

Visit http://localhost:8081 (or whatever `WEB_PORT` you set). The first account you register becomes the admin account.

## Data

- **Export**: sidebar → Data → Export JSON, downloads all of your entries.
- **Import**: sidebar → Data → Import JSON. This *replaces* your existing entries after a confirmation step.
