# Common Issues

Every issue follows the same format: **Symptom → Cause → Fix**. Jump to the category you need.

- [Installation / Docker](#installation--docker)
- [Database](#database)
- [PDF export / Puppeteer](#pdf-export--puppeteer)
- [AI operations](#ai-operations)
- [Auth (self-hosted mode)](#auth-self-hosted-mode)
- [Updates / migrations](#updates--migrations)

Still stuck? See the [FAQ](faq.md) or open an issue on GitHub with: your OS, Docker/Node version, app version (git SHA from `git rev-parse --short HEAD`), and the relevant log lines.

---

## Installation / Docker

### Port 3000 already in use

**Symptom:** `docker compose up` fails with `Bind for 0.0.0.0:3000 failed: port is already allocated`.

**Cause:** Another process is using port 3000 — often another Node dev server, a stopped-but-not-removed container, or macOS ControlCenter.

**Fix:** Find the process and stop it, OR change the port Reeesume uses.

```bash
# Find what's holding port 3000
lsof -i :3000
```

If it's a stale Docker container:

```bash
# List all containers (running and stopped)
docker ps -a | grep 3000
docker rm -f <container-id>
```

Or change the port in `docker-compose.yml`:

```yaml
app:
  ports:
    - '3001:3000' # host port 3001 → container port 3000
```

Then access the app at `http://localhost:3001`.

---

### `docker compose up --build` fails with network error

**Symptom:** Build fails with messages like `failed to solve: failed to compute cache key: ... not found` or `network error` during dependency install.

**Cause:** First build needs internet to pull base images and npm packages.

**Fix:**

1. Check your connection: `curl -I https://registry.npmjs.org`.
2. If behind a corporate proxy, set `HTTP_PROXY` and `HTTPS_PROXY` in your shell before running `docker compose up`.
3. Retry the build.

---

### Build fails on `npm audit --audit-level=high`

**Symptom:** The Docker build dies during the `npm ci` step with output containing `npm audit` and a list of vulnerabilities.

**Cause:** The Dockerfile runs `npm audit --audit-level=high` and fails the build if any high or critical CVE is found. This is a deliberate security policy (see `CLAUDE.md` → "Dependency Security").

**Fix:**

1. Read the audit output to identify the offending package.
2. Try `npm update <package>` to pull a patched version.
3. If no patched version exists yet, pin to a clean version (if known) or wait for upstream to release a fix.
4. In a genuine emergency (production down), you can bypass with a code change to the Dockerfile — but this defeats the security policy. Prefer waiting or patching upstream.

---

### `permission denied` errors on Linux

**Symptom:** `docker compose` commands fail with `permission denied while trying to connect to the Docker daemon socket`.

**Cause:** Your user isn't in the `docker` group.

**Fix:** Add yourself to the group (one-time setup):

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the group change without logging out (or log out and back in)
newgrp docker
```

See Docker's [Linux postinstall guide](https://docs.docker.com/engine/install/linux-postinstall/) for the full setup.

---

## Database

### `PrismaClientInitializationError` on app start

**Symptom:** App crashes on startup with `PrismaClientInitializationError: Can't reach database server`.

**Cause:** The database isn't running.

**Fix:** Start the database:

```bash
# For Docker installs — start just the db service in the background
docker compose up -d db

# Verify it's healthy
docker compose ps
```

For native installs, make sure your Postgres is running (Docker dev sidecar, system service, or external host).

---

### `Relation does not exist` after `git pull`

**Symptom:** App starts but errors on first request with messages like `relation "applications" does not exist`.

**Cause:** New code expects tables that don't exist yet — schema migrations didn't apply.

**Fix:**

```bash
# For native installs — apply pending migrations
npx prisma migrate dev
```

For Docker installs, migrations run automatically via the compose `command:` field. If they didn't, check the logs:

```bash
# Look for migration-related lines
docker compose logs app | grep -i migrate
```

---

### Lost data after `docker compose down`

**Symptom:** Restarted the app and your data is gone.

**Cause:** You ran `docker compose down -v` (the `-v` flag removes volumes). Plain `docker compose down` preserves data.

**Fix:** Restore from backup — see [data-and-privacy/backup-restore.md](../data-and-privacy/backup-restore.md#restore-procedure). If you have no backup, the data is gone.

Going forward, never use `down -v` unless you specifically want to wipe the volume.

---

## PDF export / Puppeteer

### PDF export fails with "No usable sandbox"

**Symptom:** Clicking Export → PDF throws an error mentioning `No usable sandbox` or `chrome crashed`.

**Cause:** Chromium's sandbox requires specific kernel capabilities that some Linux hosts don't grant by default. macOS and Windows hosts don't hit this.

**Fix:** The recommended path is to use the Docker install, which bundles a Chromium with the right setup. If you're running natively on Linux, you may need to:

- Run the Next.js process with appropriate capabilities, OR
- Set Puppeteer to run Chromium with `--no-sandbox` (security trade-off — only do this on a trusted single-user machine)

---

### PDF export looks different from preview

**Symptom:** The exported PDF doesn't match the live preview in the editor.

**Cause:** Rare. The preview and the export both use Puppeteer, so they should match. If they don't, it's usually a font issue (the container doesn't have a font you have locally).

**Fix:** The PDF is the source of truth — that's what you'll send. If the difference is unacceptable, file a bug with both screenshots.

---

### `PUPPETEER_EXECUTABLE_PATH not found` (native install)

**Symptom:** PDF export fails with `PUPPETEER_EXECUTABLE_PATH not found` or `Cannot find Chrome`.

**Cause:** Native install doesn't have Chrome installed where Puppeteer expects it.

**Fix:** Install [Google Chrome](https://www.google.com/chrome/). Puppeteer auto-detects the standard install locations on macOS and Windows. On Linux, install Chromium via your package manager and set `PUPPETEER_EXECUTABLE_PATH` to its binary path.

Or: use the Docker install, which bundles Chromium.

---

## AI operations

### AI button is disabled with "No provider configured"

**Symptom:** AI buttons are visible but greyed out, with tooltip text "Configure AI provider in Settings".

**Cause:** No AI provider is configured.

**Fix:** Add one — see [getting-started/ai-providers.md](../getting-started/ai-providers.md).

---

### `401 Unauthorized` from AI provider

**Symptom:** AI operation fails with `401 Unauthorized` or `Invalid API key`.

**Cause:** Wrong API key, key was revoked, or the key doesn't have permission for the model you selected.

**Fix:** Re-enter the API key in Settings → AI Providers. Verify the key works against the provider's API directly (e.g. `curl` with the key).

---

### `429 Rate limit` from AI provider

**Symptom:** AI operation fails with `429 Too Many Requests`.

**Cause:** Too many calls in a short window. Free tiers (Groq, Mistral free, Gemini free) have aggressive limits.

**Fix:**

1. Wait a minute and retry.
2. Upgrade to a paid tier of the same provider.
3. Switch to a different provider for high-volume operations.
4. Use Ollama for unlimited (if slower) local inference.

---

### Ollama: "Connection refused"

**Symptom:** AI operation with Ollama fails with `Connection refused` or `fetch failed`.

**Cause:** Ollama isn't running on your machine.

**Fix:**

```bash
# Check if Ollama is listening
curl http://localhost:11434/api/tags
```

If you get `Connection refused`, start Ollama:

- **macOS:** open the Ollama app from Applications.
- **Linux:** `ollama serve` or `systemctl start ollama`.
- **Windows:** open the Ollama app from the Start menu.

See [getting-started/ollama-offline.md](../getting-started/ollama-offline.md) for full setup.

---

### Ollama from Docker: "Connection refused at localhost:11434"

**Symptom:** Reeesume runs in Docker, Ollama runs on your host. AI calls fail with connection errors.

**Cause:** Inside the Docker container, `localhost` refers to the container itself — not your host machine where Ollama is running.

**Fix:** Change the Ollama server URL in Settings → AI Providers:

- **Docker Desktop (macOS, Windows):** `http://host.docker.internal:11434`
- **Docker Engine (Linux):** use `--network=host` mode on the Reeesume container, OR add `extra_hosts: ["host.docker.internal:host-gateway"]` to the `app` service in `docker-compose.yml`, OR use your machine's LAN IP (e.g. `http://192.168.1.100:11434`).

---

### AI output is poor quality or hallucinated

**Symptom:** AI returns generic text, invents tech keywords, or misreads your resume.

**Cause:** Usually the model is too small for the task. 7B-parameter models routinely hallucinate; large complex prompts need a strong model.

**Fix:**

1. Switch to a larger / smarter model. For cloud providers, that's typically the paid tier.
2. For Ollama, try `llama3.1:70b` or `qwen2.5:32b` instead of 7-8B models.
3. For cover letters and full-vacancy analysis, use Anthropic Claude Sonnet or OpenAI GPT-4 class.
4. Verify your prompt is well-structured — garbage in, garbage out.

---

## Auth (self-hosted mode)

### OTP email never arrives

**Symptom:** You entered your email on the login page, but no code arrives in your inbox.

**Cause:** SMTP misconfiguration. The most common causes: wrong SMTP host, wrong port (587 vs 465 vs 25), wrong credentials, or the recipient inbox is filtering the email.

**Fix:**

```bash
# Tail the app logs, filtered for SMTP and OTP lines
docker compose logs -f app | grep -iE "smtp|mail|otp"
```

Common log clues:

- `EAUTH` — wrong SMTP username or password.
- `ECONNREFUSED` — wrong SMTP host or port.
- `Message sent` but no email arrives — recipient inbox is filtering. Check spam / junk.

For local testing, point SMTP at Mailpit:

```bash
# In .env, set SMTP host to localhost and port to 1025
SMTP_HOST=localhost
SMTP_PORT=1025
```

Then check the Mailpit web UI at [http://localhost:8025](http://localhost:8025) to see the OTP emails.

---

### `Email not allowed` error

**Symptom:** Login page shows "Email not allowed" when you enter your address.

**Cause:** The email you entered doesn't match `ALLOWED_EMAIL` in `.env`.

**Fix:** Enter the exact email from `ALLOWED_EMAIL`. Or update `ALLOWED_EMAIL` in `.env` and restart the app.

---

### Session expires too quickly

**Symptom:** You have to log in every few days.

**Cause:** `SESSION_DURATION_DAYS` is set low (or you're past the default 30-day window).

**Fix:** Bump the value in `.env`:

```env
SESSION_DURATION_DAYS=90
```

Restart the app: `docker compose up -d`.

---

## Updates / migrations

### App won't start after `git pull`

**Symptom:** App was working, you pulled new code, now it crashes on startup.

**Cause:** Likely a schema migration didn't apply, or a new dependency wasn't installed.

**Fix:**

```bash
# For native installs — install deps and apply migrations
npm install
npx prisma migrate dev
npm run dev
```

```bash
# For Docker installs — rebuild and check logs
docker compose up --build -d
docker compose logs -f app
```

Look for missing-table errors (apply migrations) or import errors (install deps).

---

### Stored AI keys unreadable after update

**Symptom:** AI operations fail with `NEXTAUTH_SECRET is required for API key encryption` or stored keys don't work after an update.

**Cause:** `NEXTAUTH_SECRET` was changed between updates. The encryption key is derived from this value, so old ciphertext can't be decrypted with the new key.

**Fix:** Re-enter your AI provider API keys in Settings → AI Providers. Going forward, keep `NEXTAUTH_SECRET` stable across updates.
