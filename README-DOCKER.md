# K-Vault Docker Runtime Guide

This repository now supports two deployment modes:

1. Cloudflare Pages + Functions (existing mode)
2. Docker self-host mode (new)

## Quick Start (Docker)

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill at least these required values in `.env`:

- `CONFIG_ENCRYPTION_KEY`
- `SESSION_SECRET`
- `BASIC_USER` / `BASIC_PASS` (optional, set both to enable login)
- one bootstrap storage config (for example Telegram: `TG_BOT_TOKEN` + `TG_CHAT_ID`)
- optional settings store mode:
  - default: `SETTINGS_STORE=sqlite`
  - Redis mode: set `SETTINGS_STORE=redis` and `SETTINGS_REDIS_URL`

3. Start services:

```bash
docker compose up -d --build
```

4. Open:

- Legacy UI: `http://<host>:8080/`
- Vue3 App: `http://<host>:8080/app/`

### Optional: start with local Redis settings store

If you prefer Redis for basic app settings (also compatible with Upstash/KVrocks protocol):

1. Set in `.env`:
   - `SETTINGS_STORE=redis`
   - `SETTINGS_REDIS_URL=redis://redis:6379`
2. Start compose with Redis profile:

```bash
docker compose --profile redis up -d --build
```

## Architecture

- `api`: Node.js Hono backend (`server/`)
  - SQLite metadata (`storage_configs`, `files`, `sessions`, `chunk_uploads`)
  - Settings store abstraction:
    - `sqlite` (`app_settings` table)
    - `redis` (Upstash / Redis / KVrocks compatible via Redis protocol)
  - Encrypted storage secrets (`CONFIG_ENCRYPTION_KEY`)
  - Multi-backend adapters: Telegram / R2 / S3 / Discord / HuggingFace
- `web`: Nginx static host + reverse proxy
  - `/api/*` -> backend
  - `/upload` -> backend
  - `/file/*` -> backend
  - `/app/*` -> Vue3 SPA
  - `/` and other legacy pages -> static legacy HTML

Persistent data is stored in Docker volume `kvault_data` (and `kvault_redis` when Redis profile is enabled).

## Important Environment Variables

| Variable | Description |
| :--- | :--- |
| `CONFIG_ENCRYPTION_KEY` | Required. Encrypt/decrypt dynamic storage secrets in SQLite |
| `SESSION_SECRET` | Session/signature secret |
| `BASIC_USER` / `BASIC_PASS` | Admin login credentials (set both to enable auth) |
| `UPLOAD_MAX_SIZE` | Global upload limit (bytes), default 100MB |
| `UPLOAD_SMALL_FILE_THRESHOLD` | Switch threshold for direct/chunk upload |
| `CHUNK_SIZE` | Chunk size in bytes |
| `DEFAULT_STORAGE_TYPE` | Bootstrap storage type |
| `SETTINGS_STORE` | `sqlite` (default) or `redis` for basic app settings |
| `SETTINGS_REDIS_URL` | Redis URL, for Upstash/Redis/KVrocks (required if `SETTINGS_STORE=redis`) |
| `SETTINGS_REDIS_PREFIX` | Redis key prefix, default `k-vault` |
| `SETTINGS_REDIS_CONNECT_TIMEOUT_MS` | Redis connect/ping timeout (ms), default `5000` |
| `TG_BOT_TOKEN` + `TG_CHAT_ID` | Telegram bootstrap storage |
| `R2_*` / `S3_*` / `DISCORD_*` / `HF_*` | Optional bootstrap configs for other backends |

## Deployment Notes

- Legacy and Vue3 frontends coexist in Docker mode.
- Existing Cloudflare deployment flow remains unchanged.
- In Docker mode, Cloudflare runtime quotas do not apply to the Node runtime itself.
- Secrets must come from environment variables; do not hard-code.
- New image workflow is available at `.github/workflows/docker-image.yml`:
  - PR: build only
  - main/tag push: build and push `k-vault-api` + `k-vault-web` images to GHCR
- Default image names:
  - `ghcr.io/<your-org-or-user>/k-vault-api`
  - `ghcr.io/<your-org-or-user>/k-vault-web`
- If your repository is private, make sure GitHub Packages visibility/permissions allow your target platform to pull images.

## Platform Compatibility Notes

### Vercel

- Not recommended for current Docker runtime architecture.
- Main blockers are runtime and persistence model mismatch.
  - Serverless function request body limit (4.5MB) conflicts with K-Vault upload flow.
  - Function file system is read-only except temporary `/tmp`, which does not fit persistent SQLite + chunk files.
- If deploying to Vercel, only static frontend hosting is practical without major backend refactor.

### Zeabur

- Suitable.
- Supports Dockerfile/image-based deployment (Compose file is not directly supported as-is).
- Recommended: deploy both `api` and `web` services, mount persistent volume for `/app/data`.

### ClawCloud

- Suitable with container deployment flow.
- Can migrate from Compose model to platform services.
- Recommended: create separate services for backend and web (or adapt compose), and bind persistent storage for `/app/data`.

### NAS (e.g. fnOS / Feiniu NAS)

- Usually suitable when Docker/Compose is available.
- Requirements: enable Docker/Compose, import `docker-compose.yml`, map persistent volume, and expose port 8080 (or custom `WEB_PORT`).

## Local Development

- Backend:

```bash
npm --prefix server install
npm --prefix server run dev
```

- Frontend:

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Vue app runs under `/app/` in production build. Legacy pages are copied into the frontend image to keep feature parity during migration.

