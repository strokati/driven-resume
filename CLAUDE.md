# Reeesume — Project Instructions

## What This App Does

**Reeesume** is a private, local-first career management web app for job seekers who want full control over their professional narrative.

### Core Concept

The app has a strict split between permanent career data and temporary output documents:

- **Master Resume** — a structured, unlimited, private database of the user's entire career history. Never sent to anyone. The single source of truth. Contains 11 sections: Contact Information, Target Title, Professional Summary, Work Experience, Education, Skills & Interests, Certifications, Awards & Scholarships, Projects, Volunteering & Leadership, Publications.
- **Job Application** — a self-contained package: one vacancy + one custom resume + one cover letter (optional) + status tracking. Nothing is shared between applications.
- **Custom Resume** — belongs to exactly one application. Built from master data, tailored by AI, edited by user, versioned (multiple drafts, one marked active), exported as PDF/DOCX.
- **Cover Letter** — belongs to exactly one application. AI-drafted, user-edited, tone-selectable (Professional / Confident & Direct / Warm & Narrative), versioned.
- **Application Tracker** — dashboard table/Kanban across all applications with columns: Job Position, Company, Min Salary, Max Salary, Location, Status, Date Saved, Deadline, Date Applied, Follow Up, Excitement (1–5 stars).
- **AI layer** — reads job postings, surfaces relevant master data, drafts resume content and cover letters, runs ATS checks. Always labelled as suggestions; never silently modifies master data.

### Key Product Rules

- AI suggestions are labeled: Blue = original master data, Orange = AI-suggested, Green = manually edited.
- Every AI entry point is visible but disabled (with a status message) when no AI provider is configured or the app is offline.
- Editing a custom resume **never** touches the MasterResume or any other application's resume.
- "Mark as Ready" flags the active draft version. The tracker shows a "Resume ready" badge.

---

## Deployment Modes

Controlled by the `AUTH_MODE` environment variable.

| Mode             | `AUTH_MODE` | Auth                                 | Use case                        |
| ---------------- | ----------- | ------------------------------------ | ------------------------------- |
| **Local Docker** | `none`      | No login screen — app opens directly | Single machine, personal use    |
| **Self-hosted**  | `email_otp` | Passwordless OTP to `ALLOWED_EMAIL`  | VPS/server, multi-device access |

**Local mode:** `userId` is always `"local-user"`. A user record is auto-created on first request.

**Self-hosted OTP flow:**

1. User visits app → Login page: "Enter your email"
2. Server checks email matches `ALLOWED_EMAIL` env var
3. Generates 6-digit OTP, stores hashed in DB with 10-min TTL
4. Sends OTP via Nodemailer/SMTP
5. User enters code → Auth.js session cookie set
6. Session valid for `SESSION_DURATION_DAYS` (default: 30)

No passwords are ever set or stored.

---

## Tech Stack

| Layer                | Choice                                                              |
| -------------------- | ------------------------------------------------------------------- |
| Framework            | **Next.js 15** (App Router, React 19, TypeScript)                   |
| Styling              | **Tailwind CSS** + **shadcn/ui**                                    |
| Rich text editor     | **Tiptap**                                                          |
| Drag and drop        | **@dnd-kit**                                                        |
| Forms + validation   | **React Hook Form** + **Zod**                                       |
| Client data fetching | **TanStack Query**                                                  |
| ORM                  | **Prisma**                                                          |
| Database             | **PostgreSQL 16**                                                   |
| Auth                 | **Auth.js v5** (Email OTP provider; disabled when `AUTH_MODE=none`) |
| Email                | **Nodemailer** (direct SMTP, no third-party dependency)             |
| AI                   | **Vercel AI SDK** (unified across all providers + streaming)        |
| File parsing         | **pdf-parse** + **mammoth** (PDF/DOCX import)                       |
| PDF export           | **Puppeteer** (headless Chrome, WYSIWYG accuracy)                   |
| DOCX export          | **docx** (npm)                                                      |
| Dev email catch      | **Mailpit** (Docker sidecar, optional)                              |

---

## First-Time Bootstrap (run once)

```bash
# 1. Create Next.js app
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git

# 2. Core dependencies
npm install prisma @prisma/client
npm install next-auth@beta @auth/prisma-adapter
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google @ai-sdk/mistral
npm install @tanstack/react-query zod react-hook-form @hookform/resolvers
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-bullet-list @tiptap/extension-bold
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install nodemailer pdf-parse mammoth docx puppeteer
npm install -D @types/nodemailer @types/pdf-parse

# 3. shadcn/ui
npx shadcn@latest init

# 4. Prisma init
npx prisma generate
npx prisma migrate dev --name init

# 5. Start dev stack
docker compose -f docker-compose.dev.yml up -d
npm run dev
```

---

## Development Commands

```bash
npm run dev               # Next.js dev server → http://localhost:3000
npm run build             # Production build
npm run lint              # ESLint
npm run type-check        # tsc --noEmit

npx prisma studio         # Prisma GUI → http://localhost:5555
npx prisma migrate dev    # Apply schema changes (creates migration)
npx prisma generate       # Regenerate client after schema edit
npx prisma migrate reset  # ⚠ Wipe + re-seed (dev only — blocked by settings)
npx prisma db seed        # Run prisma/seed.ts

docker compose up                          # Production (local mode)
docker compose -f docker-compose.dev.yml up  # Dev (+ Mailpit on :8025)
docker compose down                        # Stop all containers
docker compose logs -f app                 # Tail app logs
```

---

## Pre-commit Hooks

Git hooks are managed by the [pre-commit](https://pre-commit.com/) framework. Configuration lives in `.pre-commit-config.yaml`.

### First-time setup (run once per machine)

```bash
# Install the pre-commit tool (macOS)
brew install pre-commit

# Install commitlint packages (if not already in package.json)
npm install --save-exact --save-dev @commitlint/cli @commitlint/config-conventional @commitlint/types

# Register git hooks
pre-commit install                        # installs .git/hooks/pre-commit
pre-commit install --hook-type commit-msg # installs .git/hooks/commit-msg
```

### What runs on every commit

| Stage        | Hook                                             | What it does                         |
| ------------ | ------------------------------------------------ | ------------------------------------ |
| `pre-commit` | `trailing-whitespace`, `end-of-file-fixer`, etc. | File hygiene                         |
| `pre-commit` | `prettier --write`                               | Auto-formats staged files            |
| `pre-commit` | `eslint --fix`                                   | Lints and auto-fixes JS/TS           |
| `pre-commit` | `tsc --noEmit`                                   | Full TypeScript type-check           |
| `pre-commit` | `prisma format`                                  | Formats schema (only when changed)   |
| `commit-msg` | `commitlint --edit`                              | Validates conventional commit format |

All hooks use `language: system` and run from `node_modules` via `npx` — no remote downloads at commit time.

### Commit message format

Follows [Conventional Commits](https://www.conventionalcommits.org/). Allowed types: `feat`, `fix`, `chore`, `refactor`, `style`, `docs`, `test`, `ci`, `revert`.

```
feat(master-resume): add resume switcher dropdown
fix(ai): handle empty response from ollama
chore: update prisma to 6.2.0
```

Rules enforced by `commitlint.config.ts`:

- Subject must be lower-case
- No trailing period
- Max 100 characters

### Day-to-day commands

```bash
pre-commit run --all-files   # Run all hooks against every file (CI equivalent)
pre-commit run prettier      # Run a single hook by id
pre-commit autoupdate        # Bump pre-commit-hooks to latest revisions
```

### Bypassing hooks (use sparingly)

```bash
git commit --no-verify -m "wip: temp"   # Skip pre-commit hooks
```

Only use `--no-verify` for WIP commits on a private branch. Never bypass on `main` or before a PR merge.

---

## Directory Structure

```
src/
├── app/
│   ├── (auth)/                        # Auth routes — self-hosted mode only
│   │   └── login/
│   │       └── page.tsx               # Email input + OTP entry
│   ├── (app)/                         # Protected app routes
│   │   ├── layout.tsx                 # App shell: sidebar + topbar
│   │   ├── master-resume/
│   │   │   └── page.tsx               # Master Resume editor (all 11 sections)
│   │   ├── applications/
│   │   │   ├── page.tsx               # Vacancy/application list + "New Application"
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # Application detail (vacancy + tracking)
│   │   │       ├── resume/
│   │   │       │   └── page.tsx       # Custom Resume editor (two-panel)
│   │   │       └── cover-letter/
│   │   │           └── page.tsx       # Cover Letter editor (single-column)
│   │   ├── tracker/
│   │   │   └── page.tsx               # Application Tracker (table + Kanban toggle)
│   │   ├── templates/
│   │   │   └── page.tsx               # Template gallery + preview
│   │   └── settings/
│   │       └── page.tsx               # AI providers + privacy + general + deployment
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts               # Auth.js handler
│   │   ├── master-resume/
│   │   │   └── [...route]/route.ts    # CRUD for all 11 sections
│   │   ├── applications/
│   │   │   └── [...route]/route.ts    # Application + vacancy CRUD
│   │   ├── ai/
│   │   │   ├── analyze-vacancy/route.ts      # Stream vacancy breakdown
│   │   │   ├── resume-suggestions/route.ts   # Stream resume content suggestions
│   │   │   ├── ats-check/route.ts            # Stream ATS scores + recommendations
│   │   │   ├── cover-letter/route.ts         # Stream cover letter draft
│   │   │   ├── rephrase/route.ts             # Stream rephrase for single paragraph/bullet
│   │   │   └── import-resume/route.ts        # Parse PDF/DOCX + AI extraction
│   │   └── export/
│   │       └── route.ts               # Puppeteer PDF + docx generation
│   ├── layout.tsx                     # Root layout (fonts, providers)
│   └── page.tsx                       # Redirect: /master-resume or /login
├── components/
│   ├── ui/                            # shadcn/ui (auto-generated, do not edit)
│   ├── master-resume/                 # Section cards, forms, entry editors
│   ├── resume-editor/                 # Draft editor, suggestion panel, ATS panel
│   ├── cover-letter-editor/           # CL editor, tone selector, source labels
│   ├── tracker/                       # TrackerTable, TrackerKanban, RowDetailPanel
│   ├── ai/                            # AiProviderSelector, AiStatusBadge
│   └── shared/                        # Sidebar, Topbar, EmptyState, PageHeader, etc.
├── lib/
│   ├── ai/
│   │   ├── providers.ts               # getProvider(id, model) → AI SDK model instance
│   │   ├── operations/                # One file per AI operation
│   │   │   ├── analyze-vacancy.ts
│   │   │   ├── resume-suggestions.ts
│   │   │   ├── ats-check.ts
│   │   │   ├── cover-letter.ts
│   │   │   ├── rephrase.ts
│   │   │   └── import-resume.ts
│   │   └── prompts/                   # Prompt templates (ts string templates)
│   ├── auth/
│   │   ├── config.ts                  # Auth.js config (mode-aware)
│   │   └── otp.ts                     # generateOtp(), verifyOtp()
│   ├── db/
│   │   └── client.ts                  # Prisma singleton
│   ├── export/
│   │   ├── pdf.ts                     # renderToPdf(resumeData, templateId)
│   │   └── docx.ts                    # renderToDocx(resumeData)
│   └── utils.ts                       # cn(), formatDate(), etc.
├── hooks/                             # use-vacancy.ts, use-applications.ts, etc.
├── types/                             # Shared TS types (beyond Prisma generated)
└── server/
    ├── actions/                       # Next.js Server Actions ("use server")
    │   ├── master-resume.ts
    │   ├── applications.ts
    │   ├── resume-drafts.ts
    │   └── cover-letters.ts
    └── queries/                       # Typed Prisma query helpers (server-only)
        ├── master-resume.ts
        ├── applications.ts
        └── tracker.ts
prisma/
├── schema.prisma
└── seed.ts
```

---

## Database Models

```
User (1)
 └── MasterResume (1:1)
      ├── WorkCompany[]
      │    └── WorkRole[]
      │         └── WorkProject[]  (optional)
      ├── Education[]
      ├── Certification[]
      ├── Award[]
      ├── Project[]
      ├── VolunteeringRole[]
      ├── Publication[]
      └── Skill[]
 └── Vacancy[]
      └── Application[]
           ├── ResumeDraft[]       (versioned; isActive flag)
           ├── CoverLetterDraft[]  (versioned; isActive flag)
           └── ApplicationNote[]  (timestamped)
 └── AiProviderConfig[]            (per-user stored API keys + models)
 └── AiCallLog[]                   (audit: timestamp, provider, model, operation)
 └── OtpCode[]                     (hashed, TTL — self-hosted mode only)
 └── Session[]                     (Auth.js sessions — self-hosted mode only)
```

### Status values for `Application.status`

`saved` | `planned` | `applied` | `screening` | `interview` | `offer` | `rejected` | `on_hold`

### Status values for `ResumeDraft.status` / `CoverLetterDraft.status`

`draft` | `ready` | `exported`

---

## AI Operations

| Operation            | Trigger                           | Output                                                                                                   |
| -------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `analyze-vacancy`    | "Analyze this posting" button     | Structured: responsibilities, must-haves, nice-to-haves, ATS keywords, tone, master resume match preview |
| `resume-suggestions` | "Create Application + Resume"     | Which master data items to include/exclude + reasoning; suggested summary rewrite                        |
| `ats-check`          | "Run ATS Check" button            | Score (0-100) with sub-scores; prioritised recommendations (HIGH/MED/LOW); keyword coverage              |
| `cover-letter`       | "Write Cover Letter" button       | Full structured draft with paragraph source labels                                                       |
| `rephrase`           | "AI rephrase" on bullet/paragraph | Single rephrased text in chosen direction                                                                |
| `import-resume`      | File upload on first setup        | Structured extraction into all 11 master resume sections + enrichment suggestions                        |

All AI calls go **directly** from the Next.js server to the configured AI provider. No intermediary backend. The app has no cloud server.

### AI Provider registry (`lib/ai/providers.ts`)

Reads provider config from `AiProviderConfig` DB table (user-managed in Settings). Supported `providerId` values:
`openai` | `anthropic` | `google` | `mistral` | `groq` | `xai` | `cohere` | `zai` | `ollama` | `custom`

Ollama uses a local server URL (`http://localhost:11434` by default) — no data leaves the machine.

---

## Key Coding Conventions

### File naming

- Pages/layouts: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Components: `PascalCase.tsx` (e.g., `WorkExperienceCard.tsx`)
- Lib / hooks / utils: `kebab-case.ts` (e.g., `use-tracker.ts`)
- Server actions: `server/actions/[domain].ts`
- Query helpers: `server/queries/[domain].ts`

### Server Actions vs API Routes

- **Server Actions** (`"use server"`) — for all form mutations: create, update, delete.
- **API Route Handlers** — only for streaming AI responses and file upload/download.
- Never call Prisma directly from Client Components.

### Auth guard (use in every Server Component and Server Action)

```ts
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';

const session = await auth();
if (!session && process.env.AUTH_MODE === 'email_otp') redirect('/login');
const userId = session?.user?.id ?? 'local-user';
```

### Prisma singleton

```ts
// lib/db/client.ts
import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

### AI operation pattern

```ts
// lib/ai/operations/[name].ts
import { streamText } from 'ai';
import { getProvider } from '@/lib/ai/providers';

export async function analyzeVacancy(vacancyText: string, providerId: string, model: string) {
  const aiModel = await getProvider(providerId, model); // reads API key from DB
  return streamText({
    model: aiModel,
    system: SYSTEM_PROMPT,
    prompt: vacancyText,
  });
}
```

### Adding a shadcn component

```bash
npx shadcn@latest add [component-name]
# e.g.: npx shadcn@latest add table dialog sheet badge
```

### Zod schemas

Define in `lib/validations/[domain].ts`. Import the same schema in both Server Action (server validation) and React Hook Form (client validation).

---

## Resume Templates (v1 — built-in only)

| ID                     | Name                         | Description                                               |
| ---------------------- | ---------------------------- | --------------------------------------------------------- |
| `ats-simple`           | ATS Simple                   | Single-column, no tables/graphics. Max ATS compatibility. |
| `professional-classic` | Professional Classic         | Two-column, subtle formatting.                            |
| `modern-minimal`       | Modern Minimal               | Contemporary with accent color.                           |
| `international-de`     | International / German-style | Includes photo slot, follows DE/AT/CH conventions.        |

Templates are React components that receive a `ResumeData` prop and render HTML/CSS for Puppeteer.
No custom template creation in v1.

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable                   | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `DATABASE_URL`             | PostgreSQL connection string                        |
| `AUTH_MODE`                | `none` (local) or `email_otp` (self-hosted)         |
| `ALLOWED_EMAIL`            | The only email that can log in (self-hosted)        |
| `NEXTAUTH_SECRET`          | Random secret for Auth.js (required in self-hosted) |
| `SMTP_HOST/PORT/USER/PASS` | SMTP config for OTP email delivery                  |
| `SESSION_DURATION_DAYS`    | Auth session lifetime (default: 30)                 |

AI provider API keys are **not** environment variables — they are stored per-user in the database via the Settings UI.

---

## Dependency Security

This project uses `@tanstack/react-query` from the TanStack ecosystem. In May 2026 the `@tanstack/router` and `@tanstack/start` package families were compromised via a GitHub Actions cache-poisoning + OIDC token extraction chain. **TanStack Query was explicitly unaffected.** Mitigations are in place regardless:

### What is already enforced

- **`.npmrc`** sets `save-exact=true` — every `npm install <pkg>` writes a pinned version (no `^` or `~` ranges).
- **`package-lock.json`** must be committed. `npm ci` in the Dockerfile enforces it exactly.
- **`Dockerfile`** runs `npm audit --audit-level=high` immediately after `npm ci`. The build fails if any high/critical CVE is found in the installed tree.

### What to do when adding or updating a dependency

```bash
# Install with exact version pin (enforced by .npmrc, but be explicit)
npm install --save-exact <package>@<version>

# Check for known vulnerabilities before committing
npm audit

# Upgrade safely — review the diff before merging
npm outdated
npm update <package>
```

### What to check after any suspicious `npm install` output

- Look for unexpected `optionalDependencies` referencing GitHub URLs (e.g. `github:org/repo#commit`) — this was the IOC fingerprint in the TanStack incident.
- Run `npm audit` and review any new HIGH or CRITICAL entries immediately.
- If a dependency is compromised: pin to the last known-clean version in `package.json`, run `npm ci`, rebuild and redeploy.

---

## Custom Slash Commands

| Command             | Use when                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `/new-page`         | Scaffolding a new app page (page.tsx + loading + error + view component) |
| `/new-api-route`    | Adding a new API route handler (with auth guard + error handling)        |
| `/new-db-model`     | Adding a Prisma model + migration + query helpers                        |
| `/new-ai-operation` | Adding an AI operation (prompt + streaming route + client hook)          |
| `/new-component`    | Creating a typed React component                                         |
