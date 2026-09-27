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

All configuration (API keys, ports, feature flags, execution defaults, `WEB_PUBLIC_API_URL`) lives in the single root `.env` file — `apps/api` and `apps/web` both read from it, there is no per-app `.env` file.

## Dev

```bash
npm run dev:api
npm run dev:web
```

Web UI runs at http://localhost:3000, API at http://localhost:4000 (both configurable via `.env`).

## Using the UI

1. Open **Settings** to choose the default LLM/embeddings providers for new runs.
2. Open **New Run**, paste requirements text (optionally attach `.md/.txt/.json/.yaml/.pdf/.docx` files), review the active settings, and submit.
3. If input validation (JEV) rejects it, the errors are shown inline on the same page.
4. Otherwise you're redirected to the **Run Detail** page, which polls for live status and shows a HITL panel (with download links + comments + Approve/Reject) at each gate: requirements, test cases, and — if enabled — generated automation code.
5. If you reject a stage, enter reviewer comments. The owning agent re-runs with that feedback, creates a new artifact revision, and returns to the same review gate with regeneration history visible in the page.
6. Once execution finishes, the same page shows the pass/fail summary and links to the HTML/Allure/JSON/JUnit reports.
7. **Runs** (home page) lists all runs with a status filter; **Trends** shows a pass/fail chart across completed runs.

## Execution Backends

Generated Playwright tests still run synchronously in the current workflow, but you can now choose the runtime backend via the root `.env` or an API-supplied run config:

- `DEFAULT_EXECUTION_BACKEND=local` keeps the existing host `npx playwright test` behavior.
- `DEFAULT_EXECUTION_BACKEND=docker` runs tests inside `PLAYWRIGHT_DOCKER_IMAGE` with the repo, generated tests, and execution output mounted into the container.

`TEST_BASE_URL` still applies to both backends.

## Test

```bash
npm test
```

Runs all Vitest suites, including focused shell/run-detail UI regressions and orchestrator/API rejection-regeneration coverage.

