# Contributing

This is a private, single-maintainer project, but issues and PRs are welcome.

## Development Setup

```bash
# 1. Install dependencies (exact pins are enforced via .npmrc)
npm ci

# 2. Copy env and adjust if needed
cp .env.example .env

# 3. Start the dev database (+ Mailpit for OTP email testing)
docker compose -f docker-compose.dev.yml up -d

# 4. Apply schema
npx prisma migrate dev

# 5. Run the app
npm run dev
```

## Before You Commit

Hooks are managed by [pre-commit](https://pre-commit.com/). After cloning:

```bash
brew install pre-commit
npm install --save-exact --save-dev @commitlint/cli @commitlint/config-conventional @commitlint/types
pre-commit install
pre-commit install --hook-type commit-msg
```

Every commit then runs: whitespace/file hygiene, Prettier, ESLint, `tsc --noEmit`, Prisma schema format, and commitlint.

Manual checks before pushing:

```bash
npm run lint
npm run type-check
npm test          # vitest
npm run e2e       # playwright (needs the dev stack running)
```

## Commit Messages

Conventional Commits, enforced by commitlint:

```
feat(master-resume): add resume switcher dropdown
fix(ai): handle empty response from ollama
```

Rules: lower-case subject, no trailing period, max 100 characters. Allowed types: `feat`, `fix`, `chore`, `refactor`, `style`, `docs`, `test`, `ci`, `revert`.

## Pull Requests

- Keep PRs small and focused; one logical change per PR.
- Reference the issue number in the description.
- New features need unit tests; bug fixes need a regression test that fails without the fix.
- CI must be green: audit, Prisma validate, type-check, lint, build, unit tests.

## Conventions

The full coding, naming, and architecture conventions live in [CLAUDE.md](CLAUDE.md) — read it before making non-trivial changes. Highlights:

- Server Actions for mutations; API route handlers only for streaming/upload/download.
- Never call Prisma from Client Components.
- Validate external input with Zod schemas from `src/lib/validations/`, shared between server and client.
- Every query and mutation must be scoped by the owning user's `userId`.
- Add dependencies with `npm install --save-exact <pkg>@<version>` and check `npm audit` before committing.
