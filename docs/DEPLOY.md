# Deploy AI Video Studio

One server runs four containers: **Caddy** (HTTPS on ports 80/443, certificate from Let's Encrypt), **web** (Next.js),
**worker** (AI jobs and video renders) and **postgres** (the database, in the `pgdata` Docker volume). Web and worker
share `./data`: every picture, voice and video, and the system's shared AI keys. Back up both (see below).

To use a managed Postgres (Neon, Supabase, RDS…) instead of the container, set `DATABASE_URL` in `.env` and remove the
`postgres` service (and its `depends_on`) from `docker-compose.yml`.

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
nano .env            # set DOMAIN=studio.example.com, ACME_EMAIL=you@example.com and POSTGRES_PASSWORD=<long random>
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

## Object storage (optional): Cloudflare R2, S3

By default every picture, voice and video lives in `./data/media` on the server's disk. To keep them in a bucket
instead (needed when the disk does not last, as on Cloudflare Containers, Fly or Render, or to run more than one
worker), set in `.env`:

```bash
S3_BUCKET=avs-media
S3_ENDPOINT=https://<account id>.r2.cloudflarestorage.com   # R2; leave empty for AWS S3
S3_REGION=auto                                              # R2; the bucket's region on AWS
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

`./data/media` then works as a cache: the worker fetches what a job needs before it runs and stores what it made
afterwards; the web app uploads what people add and serves files it does not have through 15-minute signed links.
For an install that already has media, upload it once: `docker compose run --rm web npm run media:upload`.
The bucket stays private; nothing in it is public.

## 3. Moving an existing install to the server

Copy the whole `data/` folder (with the app stopped on the old machine) into the repository folder on the server, and
dump the old database into the new one:

```bash
docker compose up -d postgres
# on the old machine: pg_dump -Fc "$DATABASE_URL" > avs.dump   (then copy avs.dump to the server)
docker compose exec -T postgres pg_restore -U avs -d avs --no-owner < avs.dump
docker compose up -d --build
```

An install from before the move to Postgres has its data in `data/app.db` (SQLite). Import it once instead of the
pg_restore above: `docker compose run --rm web npx tsx scripts/sqlite-to-postgres.ts /data/app.db`.

Accounts, workspaces, projects, media and the shared keys come along; sign in with your existing account.

## 4. Backups

```bash
./scripts/backup.sh
```

This writes `data/backups/<time>/` with `db.dump` (pg_dump, consistent while the app runs), `settings.json` (the shared
AI keys, from before they moved into the database) and `media.tar.gz`, and keeps the newest 7 (`AVS_BACKUP_KEEP` changes that). Copy that folder off the server:
a backup on the same disk does not survive a lost disk. With a managed Postgres, rely on its backups for the database.

Every night at 03:00, from the server's crontab (`crontab -e`):

```cron
0 3 * * * cd /root/ai-video-studio && ./scripts/backup.sh >> data/backups/backup.log 2>&1
```

**Restore:**

```bash
docker compose stop web worker
docker compose exec -T postgres pg_restore -U avs -d avs --clean --if-exists --no-owner < data/backups/<time>/db.dump
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
- `data/settings.json` and the database hold API keys: keep `data/`, the `pgdata` volume and the backups private. The
  postgres container is not published outside Docker's network.
- There is no password reset by email yet. To reset a password, the admin runs a one-off command on the server (ask
  the developer), or the person signs up again with another email.
