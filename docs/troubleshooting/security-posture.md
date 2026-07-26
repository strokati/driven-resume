# Security posture

This document records Reeesume's dependency-audit policy, currently-open advisories, and the triage process for new findings.

## Audit policy

- **CI gates on `npm audit --audit-level=high`** — see `.github/workflows/ci.yml`. High/critical findings block the build.
- **Moderate and low are advisory** — reviewed per PR but do not block.

## Pinned versions (server runtime)

| Package                 | Pinned             | Reason                                                                                            |
| ----------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `next`                  | 16.2.12            | Stable patch line covering multiple 16.x advisories                                               |
| `next-auth`             | 5.0.0-beta.32      | Fixes the `@auth/core` criticals (getToken throw, homoglyph bypass, OAuth state cookie confusion) |
| `@auth/core` (override) | 0.41.3             | Forces the fixed @auth/core even where next-auth's range is wider                                 |
| `@hono/node-server`     | 2.0.12 (override)  | Fixes path-traversal and serveStatic bypass in Prisma's dev server                                |
| `hono`                  | 4.12.32 (override) | Fixes XSS in `cx()` and request-context bleed                                                     |
| `postcss`               | 8.5.23 (override)  | Fixes `</style>` XSS in CSS stringify output                                                      |
| `sharp`                 | 0.35.3 (override)  | Fixes inherited libvips CVEs                                                                      |
| `valibot`               | 1.4.2 (override)   | Fixes `record()` flatten-throws issue in Prisma's dev server                                      |

## Currently-open advisories

### `brace-expansion` (high, dev-only)

`eslint-plugin-jsx-a11y` and `eslint-plugin-react` (via `eslint-config-next`) depend on `minimatch@3.x`, which in turn depends on `brace-expansion@^1.1.7`. The advisory (`<=5.0.7`) covers that 1.x line.

- **Impact:** DoS via exponential-time expansion of attacker-controlled `{...}` glob patterns. Triggered only when ESLint processes a glob supplied by an attacker.
- **Exposure:** Dev-only. ESLint never runs in production. Our repo's lint config files are not user-controlled.
- **Why not force-fix:** `npm audit fix --force` would bump the eslint plugins across a major version, likely breaking lint. The advisory's threat model doesn't apply to this codebase.
- **When to revisit:** When `eslint-config-next` releases a version that bumps its `minimatch` dep. Check quarterly.

## Triage checklist for new advisories

1. Run `npm audit --audit-level=low` to get the full list.
2. For each finding:
   - **Is it in a runtime path?** (Look at `npm ls <pkg>` — does it trace back to something the Next.js server actually imports at runtime, or only to dev/test/build tooling?)
   - **Does the advisory's preconditions match our usage?** Many advisories require attacker-controlled input that doesn't reach the vulnerable code path in this app.
3. If runtime-reachable: add an `overrides` entry in `package.json` with the patched version, run `npm install`, verify `npm run type-check && npm run lint && npm test` still pass.
4. If dev-only and not exploitable in our threat model: add a note to the **Currently-open advisories** section above with rationale. Do not block the build.
5. Commit `package.json` + `package-lock.json` together with a `chore(deps): ...` message.

## Related

- [data-and-privacy/security.md](../data-and-privacy/security.md) — CSRF posture, session cookie flags, and same-origin enforcement.
