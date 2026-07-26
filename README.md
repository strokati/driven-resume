# Reeesume

**Tailor your resume to each job vacancy**

Reeesume is an open-source, self-hosted tool that uses AI to tailor your resume and cover letter to each job vacancy. It runs on your own machine — your career database lives in your own PostgreSQL, AI calls go directly from the app to your chosen provider, and you can pick anything from OpenAI to fully-local Ollama.

[Quick Start](#quick-start) · [Features](#features) · [Self-Hosting](#self-hosting)

---

## Features

**AI Workflow**

- **Vacancy analysis** — paste any job posting and get a structured breakdown: responsibilities, must-haves, ATS keywords, and a match preview against your profile
- **Resume tailoring** — AI picks which experiences and skills are most relevant, with reasoning for every include/exclude decision
- **ATS score check** — score your tailored resume 0–100 with HIGH/MED/LOW priority fixes and keyword coverage gaps
- **Cover letter generation** — full cover letter drafted from your resume and the posting; choose tone: Professional, Confident & Direct, or Warm & Narrative
- **Bullet rephrasing** — select any bullet or paragraph, AI rewrites it for stronger impact in-place
- **Resume import** — upload a PDF or DOCX and AI extracts and structures it into your career database automatically
- **10 AI providers** — OpenAI, Anthropic, Google Gemini, Mistral, Groq, xAI, Cohere, z.ai, Ollama (fully offline), custom endpoint. API keys stored in your local database, never in `.env`

**Career Database**

- **MasterResume** — your permanent private career database with 11 sections: Work Experience, Education, Skills, Projects, Certifications, Awards, Volunteering, Publications, and more. Unlimited entries, never exported or shared
- **Multi-language resumes** — maintain separate resumes in different languages (English, German, French, and more) for different job markets
- **Resume import** — bootstrap your database by uploading an existing PDF or DOCX

**Applications**

- **Per-application packages** — each application gets its own tailored resume, cover letter, and tracking. Changes in one never affect another
- **Application Tracker** — sortable table and Kanban board with status (Saved → Applied → Screening → Interview → Offer), salary range, deadline, follow-up date, and excitement rating (1–5 stars)

**Export & Templates**

- **PDF export** — WYSIWYG via headless Chrome (Puppeteer); what you see is what you get
- **DOCX export** — for recruiters who require Word format
- **4 built-in templates** — ATS Simple, Professional Classic, Modern Minimal, International/German-style

**Privacy & Control**

- All data stored locally in PostgreSQL — nothing sent to any cloud service
- AI calls go directly from the app to your chosen provider — no intermediary backend
- For zero data leaving your machine, use [Ollama](https://ollama.com/) as your AI provider
- Two deployment modes: local (no login) or self-hosted with passwordless email OTP

---

## Quick Start

**Requirements:** Docker + Docker Compose

```bash
# Clone and start
git clone https://github.com/strokati/reeesume.git
cd reeesume
cp .env.example .env
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) — no login required.

Data persists in a named Docker volume (`postgres_data`) across restarts.

---

## Documentation

Full documentation lives in [`docs/`](docs/README.md). Key entry points:

| Guide                                                          | What it covers                                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Install guides](docs/README.md#choose-your-path)              | Docker (local), Docker (self-hosted), and native Node.js paths                                |
| [First-run walkthrough](docs/getting-started/first-run.md)     | 5-minute tour: configure AI, build resume, export PDF                                         |
| [AI providers](docs/getting-started/ai-providers.md)           | Setting up cloud providers or [Ollama for offline AI](docs/getting-started/ollama-offline.md) |
| [Where is my data?](docs/data-and-privacy/where-is-my-data.md) | File paths, Docker volumes, backup procedures                                                 |
| [Troubleshooting](docs/troubleshooting/common-issues.md)       | Common issues and the [FAQ](docs/troubleshooting/faq.md)                                      |

AI provider API keys are configured in **Settings → AI Providers** inside the app — never in `.env`. See [docs/getting-started/ai-providers.md](docs/getting-started/ai-providers.md).

---

## Self-Hosting

For multi-device access with email-based authentication:

```bash
cp .env.example .env
```

Edit `.env`:

```env
AUTH_MODE=email_otp
ALLOWED_EMAIL=you@example.com
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.com

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=you@example.com
SMTP_PASS=your-password
SMTP_FROM=Reeesume <you@example.com>
```

```bash
docker compose up --build
```

On first visit, enter your email. A 6-digit OTP is sent to `ALLOWED_EMAIL`. No passwords are ever set or stored.

---

## Development Setup

**Requirements:** Node.js 20+, Docker

```bash
# Start database + Mailpit (email catch at http://localhost:8025)
docker compose -f docker-compose.dev.yml up -d

cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev   # → http://localhost:3000
```

**Useful commands:**

```bash
npm run dev               # Dev server with hot reload
npm run build             # Production build
npm run lint              # ESLint
npm run type-check        # TypeScript check

npx prisma studio         # Database GUI → http://localhost:5555
npx prisma migrate dev    # Apply schema changes
npx prisma generate       # Regenerate Prisma client
```

---

## Tech Stack

| Layer       | Choice                                        |
| ----------- | --------------------------------------------- |
| Framework   | Next.js 15 (App Router, React 19, TypeScript) |
| Database    | PostgreSQL 16 + Prisma                        |
| Auth        | Auth.js v5 (email OTP)                        |
| AI          | Vercel AI SDK (streaming, 10 providers)       |
| Styling     | Tailwind CSS + shadcn/ui                      |
| Editor      | Tiptap                                        |
| Drag & drop | @dnd-kit                                      |
| Data fetch  | TanStack Query                                |
| PDF export  | Puppeteer (headless Chrome)                   |
| Deployment  | Docker + Docker Compose                       |

---

## Environment Variables

| Variable                | Required | Default                 | Description                                 |
| ----------------------- | -------- | ----------------------- | ------------------------------------------- |
| `DATABASE_URL`          | ✅       | —                       | PostgreSQL connection string                |
| `AUTH_MODE`             | ✅       | `none`                  | `none` (local) or `email_otp` (self-hosted) |
| `ALLOWED_EMAIL`         | OTP only | —                       | The only email address that may log in      |
| `NEXTAUTH_SECRET`       | OTP only | —                       | Random secret (`openssl rand -base64 32`)   |
| `NEXTAUTH_URL`          | OTP only | `http://localhost:3000` | Public app URL                              |
| `SMTP_HOST`             | OTP only | `localhost`             | SMTP server hostname                        |
| `SMTP_PORT`             | OTP only | `1025`                  | SMTP port                                   |
| `SMTP_USER`             | OTP only | —                       | SMTP username                               |
| `SMTP_PASS`             | OTP only | —                       | SMTP password                               |
| `SMTP_FROM`             | OTP only | —                       | From address for OTP emails                 |
| `SESSION_DURATION_DAYS` | —        | `30`                    | Auth session lifetime in days               |

AI provider API keys are configured in **Settings → AI Providers** inside the app and stored in the database. They are never read from environment variables.

See [`.env.example`](.env.example) for the full annotated list.

---

## Contributing

Contributions are welcome — bug fixes, features, documentation, or translations.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/new-feature`)
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`git commit -m 'feat: add new feature'`)
4. Push and open a Pull Request

Other ways to help: star the repository, report bugs, or suggest features.

---

## License

This project is licensed under the **GNU General Public License v3.0**.

You are free to use, study, and modify this software for personal use. If you distribute a modified version — including as a hosted service — you must release the full source code of your modified version under the same GPL v3 license.

See the [LICENSE](LICENSE) file for the full license text.
