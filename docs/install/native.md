# Install from Source (Node.js, No Docker for the App)

> **Docker is recommended.** Use this guide only if you cannot or don't want to use Docker for the app container. See [docker.md](docker.md) for the easier path.

You'll still use Docker for the database (the simplest option), or you can run your own Postgres.

---

## What you'll need

- **Node.js** 20.0 or newer — download from [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  # Install and use Node 20 via nvm
  nvm install 20 && nvm use 20
  ```
- **npm** 10 or newer — ships with Node.js.
- **Git** — see [system-requirements.md](system-requirements.md).
- **PostgreSQL 16** running somewhere — pick ONE of:
  - **Easiest:** run just the database in Docker (instructions below).
  - **Or:** install Postgres natively ([postgresql.org/download](https://www.postgresql.org/download/)).
  - **Or:** use a managed Postgres (Neon, Supabase, Railway, etc.) and put the connection string in `DATABASE_URL`.
- **Google Chrome** installed — needed by Puppeteer for PDF export. On macOS and Windows, [install Chrome](https://www.google.com/chrome/) if you don't have it. On Linux, install the Chromium system packages Puppeteer expects (the Docker route handles this for you, which is why we recommend Docker).

---

## Step 1 — Get the code

```bash
# Download the project
git clone https://github.com/strokati/reeesume.git

# Move into the project folder
cd reeesume
```

---

## Step 2 — Start the database

Pick the option that matches your PostgreSQL choice:

### Option A — Database in Docker (recommended)

This starts only the database and Mailpit (a local email catch service for testing). The app itself runs natively.

```bash
# Start the dev database + Mailpit in the background
docker compose -f docker-compose.dev.yml up -d
```

The database runs on `localhost:5432`. Mailpit's web UI is at [http://localhost:8025](http://localhost:8025) — useful if you later switch to self-hosted mode and want to test OTP emails locally.

### Option B — Native or managed Postgres

Make sure your Postgres is running and you have a connection string. You'll paste it into `DATABASE_URL` in Step 3.

---

## Step 3 — Configure environment

```bash
# Copy the example settings file to .env
cp .env.example .env
```

Open `.env` in a text editor.

### For Option A (Docker dev database)

The default `DATABASE_URL` works as-is:

```env
DATABASE_URL="postgresql://reeesume:reeesume@localhost:5432/reeesume"
AUTH_MODE=none
```

### For Option B (native or managed Postgres)

Replace `DATABASE_URL` with your connection string:

```env
# Example: managed Postgres
DATABASE_URL="postgresql://user:password@your-host:5432/your-db?sslmode=require"
AUTH_MODE=none
```

`AUTH_MODE=none` works for local single-user use. For multi-device or login-screen setup, follow [docker-self-hosted.md](docker-self-hosted.md) — the same env vars apply.

---

## Step 4 — Install dependencies

```bash
# Install all npm packages (1–3 minutes)
npm install
```

The project uses `save-exact` in `.npmrc`, so all dependencies are pinned to specific versions. This is a security measure — see `CLAUDE.md` → "Dependency Security" for context.

---

## Step 5 — Set up the database schema

```bash
# Create all tables in the database (run once after install, and after every git pull that touches prisma/schema.prisma)
npx prisma migrate dev --name init
```

You should see output like:

```
Your database is now in sync with your Prisma schema.
Running generate... ✔
```

---

## Step 6 — Start the dev server

```bash
# Start Next.js in dev mode with hot reload
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev` rebuilds on every file save, so changes appear instantly. Use this for everyday use if you don't mind the slight startup delay.

---

## Production build (optional)

For a faster, leaner runtime (no hot reload, no source maps):

```bash
# Build the production bundle
npm run build

# Start the production server
npm run start
```

Open [http://localhost:3000](http://localhost:3000).

---

## Useful commands

| Command                  | What it does                                                            |
| ------------------------ | ----------------------------------------------------------------------- |
| `npm run dev`            | Start dev server with hot reload                                        |
| `npm run build`          | Production build                                                        |
| `npm run start`          | Start production server (after `build`)                                 |
| `npm run lint`           | Run ESLint                                                              |
| `npm run type-check`     | TypeScript type check                                                   |
| `npx prisma studio`      | Open the database GUI at [http://localhost:5555](http://localhost:5555) |
| `npx prisma migrate dev` | Apply schema changes (run after `git pull`)                             |
| `npx prisma generate`    | Regenerate the Prisma client after editing `schema.prisma`              |

---

## Stopping the app

Press `Ctrl+C` in the terminal where `npm run dev` is running.

If you started the dev database (Option A), stop it separately:

```bash
# Stop the dev database and Mailpit
docker compose -f docker-compose.dev.yml down
```

Your data persists in the `postgres_data_dev` Docker volume across restarts.

---

## Next steps

The app is running. Configure an AI provider and create your first application:

→ [Getting started: first-run walkthrough](../getting-started/first-run.md)

---

## Troubleshooting

Native install issues usually fall into one of these buckets. Full guide: [troubleshooting/common-issues.md](../troubleshooting/common-issues.md).

- **`PrismaClientInitializationError`** — the database isn't running. Start it (Option A: `docker compose -f docker-compose.dev.yml up -d db`).
- **`PUPPETEER_EXECUTABLE_PATH not found` or PDF export fails** — Chrome isn't installed or Puppeteer can't find it. Install Chrome, or use Docker mode where Chromium is bundled.
- **Node version mismatch** — verify `node --version` returns 20+. Use `nvm use 20` if you have multiple Node versions.
- **`npm install` fails with audit errors** — the project fails installs on high/critical CVEs. Update the offending package or pin to a clean version.
