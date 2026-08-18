# Security Policy

## Reporting a Vulnerability

Please report vulnerabilities privately to **vadym@strokati.com**.

Include a description, reproduction steps, and affected version/commit if known. You will receive an acknowledgement within 7 days. Please do not open public issues for security problems.

## Supported Versions

Only the latest commit on `main` is supported. This is a personal, self-hosted project without LTS branches.

## Deployment Modes and Auth

Reeesume ships in two modes controlled by `AUTH_MODE`:

| Mode        | `AUTH_MODE` | Auth                                | Intended for            |
| ----------- | ----------- | ----------------------------------- | ----------------------- |
| Local       | `none`      | None — app opens directly           | Single personal machine |
| Self-hosted | `email_otp` | Passwordless OTP to `ALLOWED_EMAIL` | Internet-facing VPS     |

**Running `AUTH_MODE=none` on an internet-facing server exposes all data to anyone who can reach the port.** The app fails closed at boot since #71: in production, an unset or invalid `AUTH_MODE` aborts startup.

## Security Model Notes

- **Single-user by design.** The data model is per-user, but the intended deployment serves exactly one person. Multi-user operation is not a design goal.
- **AI provider API keys** are entered in Settings, encrypted at rest (AES-256-GCM), and never returned to the client in plaintext (masked only).
- **AI calls** go directly from the Next.js server to the configured provider. There is no intermediary backend. With Ollama, no data leaves the machine.
- **Custom AI provider base URLs** are user-configurable and unrestricted. This is intentional (self-hosted admin use), but be aware the server will make requests to whatever URL is configured.
- **File uploads** (resume import) are limited to 5 MB and parsed with `pdf-parse`/`mammoth`. Downloaded exports are generated server-side, never served from user-supplied paths.
- **Dependencies** are pinned exactly (`.npmrc` `save-exact`), the lockfile is enforced via `npm ci`, and both CI and the Dockerfile fail the build on high/critical `npm audit` findings.

## Disclosure Timeline

- Report received → acknowledgement within 7 days
- Fix or mitigation targeted within 30 days for high severity, 90 days otherwise
- Public credit given if desired
