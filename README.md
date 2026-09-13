# Personal Journal

A mobile-friendly text journal: write free-form entries, browse a 70-day heatmap of how often you write, search past entries by keyword, and jump to any day via the calendar. Installable as a PWA on desktop and mobile.

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

## Features

Core journaling

    Free-form entries — write, edit, and delete plain-text journal entries, each timestamped.
    Backdated entries — select a past day on the calendar and add an entry for that day instead of "now."
    Calendar navigation — a month calendar marks which days have entries; click a day to filter the entry list to it. 
    Keyword search — search-as-you-type across all your entries, with result snippets; clicking a result jumps to that entry's date.
Data ownership

    • Export — download all your entries as a JSON file.
    • Import — upload a JSON file to replace your current entries, gated behind a confirmation step warning it's destructive.
Accounts & access

    • Registration/login — username + password auth (bcrypt-hashed), session held via an HTTP-only JWT cookie.
    • First-user-is-admin — the very first account registered on a fresh instance automatically becomes admin.
    • Admin user management — admins can view all users (with entry counts and join dates), promote/demote admin status, reset any user's password, and delete accounts — with safeguards preventing an admin from demoting, deleting, or otherwise acting on their own account.
UI/UX

    • Light/dark theme toggle
    • Mobile-friendly responsive layout
    • PWA support — installable to home screen/desktop
Infrastructure

    • Dockerized stack — Nginx (serves the built frontend + reverse-proxies /api), Node/Express API, and PostgreSQL.

