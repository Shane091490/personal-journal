# Personal Journal

A mobile-friendly text journal: write free-form entries, search past entries by keyword, and jump to any day via the calendar. Installable as a PWA on desktop and mobile.

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

    • Rich text entries — write, edit, and delete entries with formatting (bold/italic/underline/strike, headings, lists, blockquotes, links), each timestamped.
    • Photo attachments — attach up to 4 photos per entry; they're rendered below the entry text.
    • Backdated entries — select a past day on the calendar and add an entry for that day instead of "now."
    • Calendar navigation — a month calendar marks which days have entries; click a day to filter the entry list to it.
    • Keyword search — search-as-you-type across all your entries, with result snippets; clicking a result jumps to that entry's date.

Data ownership

    • Export — download all your entries (including photos, embedded as base64) as a single JSON file.
    • Import — upload a JSON file to replace your current entries and photos, gated behind a confirmation step warning it's destructive.

Accounts & access

    • Registration/login — email + password auth (bcrypt-hashed), session held via an HTTP-only JWT cookie.
    • First-user-is-admin — the very first account registered on a fresh instance automatically becomes admin, and registration is then disabled until an admin re-enables it.
    • Single sign-on (OIDC) — optionally authenticate against any standards-compliant OpenID Connect provider (Google, Okta, Auth0, Keycloak, Authentik, etc.) alongside the built-in login. Configured entirely from the UI (admin → SSO settings) and stored in the database — no environment variables to set. The client secret is encrypted at rest.
    • Admin user management — admins can view all users (with entry counts and join dates), create accounts directly, promote/demote admin status, reset any user's password, toggle registration on/off, and delete accounts — with safeguards preventing an admin from demoting, deleting, or otherwise acting on their own account.

UI/UX

    • Light/dark theme toggle
    • Mobile-friendly responsive layout
    • PWA support — installable to home screen/desktop

Infrastructure

    • Dockerized stack — Nginx (serves the built frontend, reverse-proxies /api, and serves uploaded photos), Node/Express API, and PostgreSQL.
