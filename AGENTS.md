# AGENTS

Quick context for coding agents working in this repository.

## Project at a glance
- App: AtelierMojis, a local-first web app that turns images into Slack-ready emoji (no server upload).
- Stack: React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion.
- Package manager: `pnpm` (via Corepack).

## Key tooling
- Dev server: `pnpm dev` (Vite on `http://localhost:8080`).
- Quality checks: `pnpm lint`, `pnpm fmt:check`, `pnpm test`, `pnpm build`.
- Lint/format: `oxlint` and `oxfmt` (not ESLint/Prettier).
- Tests: Vitest + Testing Library (`src/test`).

## Structure
- `src/pages`: route-level screens (`Index.tsx`, `NotFound.tsx`).
- `src/components`: UI/feature components (`ui/` contains base primitives).
- `src/lib`: image and GIF processing logic.
- `public`: static assets and favicons.
- `.github/workflows/ci.yml`: CI runs lint, format check, tests, and build.

## Conventions
- Use `@/` path alias for `src/*` imports.
- Keep changes focused; update docs when behavior/setup changes.
- Commit style is conventional prefixes (`feat:`, `fix:`, `chore:`, `docs:`).

## Agent-specific note
- Repo includes local skills under `.agents/skills` to help automation workflows.
