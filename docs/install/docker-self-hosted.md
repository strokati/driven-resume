# Install with Docker (Self-Hosted Mode)

For multi-device access or any time you want a login screen. Users log in with a 6-digit code sent to a single allowed email address — no passwords.

If you only need Reeesume on one machine, the simpler [local mode](docker.md) is recommended.

---

## What you'll need

- The [system requirements](system-requirements.md) for Docker mode
- An SMTP account that can send email — examples below use Gmail, Mailgun, or any generic SMTP service
- A public URL where the app will be reachable (e.g. `https://resume.yourdomain.com`). On a home network without a domain, you can also use your machine's local IP — but multi-device access still needs a routable address.

---

## Step 1 — Get the code

```bash
# Download the project
git clone https://github.com/strokati/reeesume.git

# Move into the project folder
cd reeesume
```

---

## Step 2 — Configure environment

```bash
# Copy the example settings to .env (your actual settings file)
cp .env.example .env
```

Now open `.env` in a text editor and set **every variable below**. Lines you must change are marked with `← change this`.

```env
# Authentication mode — turn on the login screen
AUTH_MODE=email_otp                       ← change this

# The ONLY email address that can log in
ALLOWED_EMAIL=you@example.com             ← change this

# Random secret used to sign sessions and encrypt API keys
# Generate one with: openssl rand -base64 32
NEXTAUTH_SECRET=                          ← paste output of the command above

# Public URL where users will reach the app
NEXTAUTH_URL=https://resume.yourdomain.com  ← change this

# SMTP settings (pick ONE block below — delete or comment out the others)

# Option A: Gmail (requires an App Password, NOT your regular password)
# Create one at https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=Reeesume <you@gmail.com>

# Option B: Mailgun (use your Mailgun SMTP credentials)
# SMTP_HOST=smtp.mailgun.org
# SMTP_PORT=587
# SMTP_USER=postmaster@your-mailgun-subdomain.mailgun.org
# SMTP_PASS=your-mailgun-password
# SMTP_FROM=Reeesume <noreply@your-mailgun-subdomain.mailgun.org>

# Option C: Generic SMTP (any provider — SES, Postmark, etc.)
# SMTP_HOST=your-smtp-server.com
# SMTP_PORT=587
# SMTP_USER=your-username
# SMTP_PASS=your-password
# SMTP_FROM=Reeesume <noreply@your-domain.com>

# Optional — auth session lifetime (default 30 days)
SESSION_DURATION_DAYS=30
```

### About `NEXTAUTH_SECRET`

This value signs every login session and encrypts your stored AI provider API keys. **Save it somewhere safe.** If you lose it, all current sessions are invalidated and stored API keys become unreadable — you'd need to re-enter them.

Generate one with:

```bash
# Print a random 32-character base64 secret
openssl rand -base64 32
```

Copy the output and paste it into `NEXTAUTH_SECRET`.

---

## Step 3 — Start the app

```bash
# Build the images and start the containers (first run takes 5–15 minutes)
docker compose up --build
```

First run is slow because Docker downloads base images and installs dependencies. Subsequent starts take seconds.

When the app is ready you'll see `✓ Ready in ...ms` in the terminal.

---

## Step 4 — First login

1. Open your browser at the `NEXTAUTH_URL` you set (e.g. `https://resume.yourdomain.com`).
2. You'll see a **Login** page asking for your email.
3. Enter the email you set as `ALLOWED_EMAIL`.
4. Check that inbox for a 6-digit code. **The code expires after 10 minutes.**
5. Type the code into the app.
6. You're in. The session lasts `SESSION_DURATION_DAYS` (default 30 days).

No passwords are ever set or stored.

---

## Step 5 — Behind a reverse proxy (optional)

If you want HTTPS (recommended for any internet-facing deployment), terminate TLS in a reverse proxy and forward plain HTTP to the container's port 3000. Common choices:

- **Caddy** — automatic Let's Encrypt certificates, very simple config
- **Nginx** — manual cert management via certbot
- **Traefik** — Docker-native, auto-discovery

The app does not handle TLS itself. Point the reverse proxy at `http://localhost:3000` (or whatever port you mapped in `docker-compose.yml`).

A minimal Caddyfile looks like:

```
resume.yourdomain.com {
    reverse_proxy localhost:3000
}
```

We don't cover full reverse-proxy setup here — see the official docs for [Caddy](https://caddyserver.com/docs/), [Nginx](https://nginx.org/en/docs/), or [Traefik](https://doc.traefik.io/traefik/).

---

## Security notes

- **Never commit `.env` to git.** It's already in `.gitignore` — leave it there.
- **Rotate `NEXTAUTH_SECRET` periodically** (every few months). When you do, all sessions end and API keys need re-entering.
- **OTP codes are hashed** before storage and expire after 10 minutes. Even if the database leaks, the codes are useless.
- **No passwords exist** anywhere in the system. There is nothing to leak.

---

## Troubleshooting

If OTP emails don't arrive, see [troubleshooting/common-issues.md](../troubleshooting/common-issues.md). The most common cause is SMTP misconfiguration — check the app logs:

```bash
# Tail the live app logs, filtered for SMTP-related lines
docker compose logs -f app | grep -iE "smtp|mail|otp"
```

For local development with email testing (no real SMTP needed), the project ships a [Mailpit](https://github.com/axllent/mailpit) sidecar — see `docker-compose.dev.yml` and the [native install guide](native.md).

---

## Next steps

The app is running and you're logged in. Configure an AI provider and create your first application:

→ [Getting started: first-run walkthrough](../getting-started/first-run.md)
