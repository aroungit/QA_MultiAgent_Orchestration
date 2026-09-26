# QA Agent Platform

Multi-agent QA orchestration platform (LangGraph + Fastify + Next.js/Mantine + Playwright).

See [QA_Agentic_Orchestration_architecture.md](QA_Agentic_Orchestration_architecture.md) for architecture and [plan.md](plan.md) for the phased implementation plan.

## Layout

- `apps/api` – Fastify REST API
- `apps/web` – Next.js + Mantine UI
- `packages/shared` – shared TS types/DTOs
- `packages/orchestrator` – LangGraph workflow + agents
- `packages/jev` – TypeSafe AI JEV integration
- `packages/playwright-executor` – test generation + execution

## Setup

```bash
npm install
copy .env.example .env
npm run build
```

All configuration (API keys, ports, feature flags, `WEB_PUBLIC_API_URL`) lives in the single root `.env` file — `apps/api` and `apps/web` both read from it, there is no per-app `.env` file.

## Dev

```bash
npm run dev:api
npm run dev:web
```

Web UI runs at http://localhost:3000, API at http://localhost:4000 (both configurable via `.env`).

## Using the UI

1. Open **New Run**, paste requirements text (optionally attach `.md/.txt/.json/.yaml/.pdf/.docx` files), pick an LLM/embeddings provider, and submit.
2. If input validation (JEV) rejects it, the errors are shown inline on the same page.
3. Otherwise you're redirected to the **Run Detail** page, which polls for live status and shows a HITL panel (with download links + comments + Approve/Reject) at each gate: requirements, test cases, and — if enabled — generated automation code.
4. Once execution finishes, the same page shows the pass/fail summary and links to the HTML/Allure/JSON/JUnit reports.
5. **Runs** (home page) lists all runs with a status filter; **Trends** shows a pass/fail chart across completed runs.

## Test

```bash
npm test
```

Runs all Vitest suites (backend unit/integration tests + a `apps/web` component smoke test using Testing Library/jsdom).

