# Deploy AI Video Studio

One server runs three containers: **Caddy** (HTTPS on ports 80/443, certificate from Let's Encrypt), **web** (Next.js)
and **worker** (AI jobs and video renders). Web and worker share `./data`: the SQLite database, every picture, voice
and video, and the system's shared AI keys. Back that folder up (see below).

## 1. The server

- A VPS with **4 vCPU and 8 GB RAM** or more. A one-minute episode takes a few minutes to render and uses every core
  while it does. 2 vCPU works, slowly.
- Disk: 40 GB to start. Media grows with every episode (roughly 20–50 MB per finished episode).
- Ubuntu 24.04 or Debian 12 with Docker: `curl -fsSL https://get.docker.com | sh`.
- A domain or subdomain whose **DNS A record points at the server's IP**, and ports **80 and 443 open** (Caddy needs
  both to get the certificate).

## 2. First start

```bash
git clone <this repository> ai-video-studio && cd ai-video-studio
cp .env.example .env
nano .env            # set DOMAIN=studio.example.com and ACME_EMAIL=you@example.com
docker compose up -d --build
docker compose ps    # web shows "healthy" after about 30 s
```

Then, **right away**, open `https://<DOMAIN>/signup` and create your account. **The first account to sign up becomes
the system admin**, owns the first workspace ("Studio chính") and is the only one who may set the shared AI keys. Do
this before you share the address with anyone.

After signing in:

1. **Cài đặt › Hệ thống**: enter the shared AI keys (writing model and pictures). Every workspace you allow will use
   them, and you pay for what they use.
2. **Cài đặt › Workspace**: invite your team (one link per person, valid 7 days).
3. Anyone may sign up and gets an empty workspace of their own. It has **no AI** until its owner enters its own keys
   (Cài đặt › Kết nối AI) or you switch on "Dùng khoá chung" for it in **Cài đặt › Hệ thống**.

## 3. Moving an existing install to the server

Copy the whole `data/` folder (with the app stopped on the old machine) into the repository folder on the server
before the first `docker compose up`. Accounts, workspaces, projects, media and the shared keys come along; sign in
with your existing account.

## 4. Backups

```bash
docker compose exec web node scripts/backup.mjs
```

This writes `data/backups/<time>/` with `app.db` (a consistent copy, safe while the app runs), `settings.json` (the
shared AI keys) and `media.tar.gz`, and keeps the newest 7 (`AVS_BACKUP_KEEP` changes that). Copy that folder off the
server: a backup on the same disk does not survive a lost disk.

Every night at 03:00, from the server's crontab (`crontab -e`):

```cron
0 3 * * * cd /root/ai-video-studio && docker compose exec -T web node scripts/backup.mjs >> data/backups/backup.log 2>&1
```

**Restore:**

```bash
docker compose down
cp data/backups/<time>/app.db data/app.db
rm -f data/app.db-wal data/app.db-shm
cp data/backups/<time>/settings.json data/settings.json   # if the backup has one
tar -xzf data/backups/<time>/media.tar.gz -C data          # replaces data/media
docker compose up -d
```

## 5. Updating

```bash
git pull
docker compose up -d --build
```

Database migrations run by themselves when the new version starts (they only ever add). Back up first.

## 6. Checks and logs

- `https://<DOMAIN>/api/v1/health` answers `{"ok":true,"worker":true}`. `worker:false` means jobs are not being picked
  up: `docker compose logs worker`.
- `docker compose logs -f web worker caddy`.
- A render that fails with Chrome errors usually needs more shared memory (`shm_size` in `docker-compose.yml`).

## Security notes

- Passwords are hashed with scrypt; sessions are httpOnly, SameSite=Lax cookies, marked Secure over HTTPS. A session
  lasts 30 days; signing out ends it.
- Every query is scoped to the signed-in person's workspace; media files are served only to their workspace.
- The web container is published on `127.0.0.1:3300` only; the internet reaches it through Caddy.
- `data/settings.json` and the database hold API keys: keep `data/` and its backups private.
- There is no password reset by email yet. To reset a password, the admin runs a one-off command on the server (ask
  the developer), or the person signs up again with another email.
