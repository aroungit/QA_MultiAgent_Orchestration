# QA Agentic Orchestration – Implementation Plan (v1 Baseline)

**Status:** Draft – pending approval
**Scope:** Implements `QA_Agentic_Orchestration_architecture.md` v1 baseline only. Items in `enhancements.md` are explicitly out of scope.
**Sequencing:** Backend is built and validated end-to-end (via API calls / scripts) before frontend work begins, per phase group. Each phase ends with a checkpoint that should be verified before moving on.

---

## Phase 0 – Project Scaffolding & Tooling

**Goal:** Establish repo structure, tooling, and shared conventions before any feature code.

- Monorepo layout (npm/pnpm workspaces):
  - `apps/api` – Fastify service
  - `apps/web` – Next.js + Mantine UI
  - `packages/orchestrator` – LangGraph workflow + agents
  - `packages/jev` – TypeSafe AI JEV integration
  - `packages/playwright-executor` – test generation + execution
  - `packages/shared` – shared TS types (RunState, DTOs, enums)
- Root tooling: TypeScript project references, ESLint, Prettier, Vitest/Jest, `.env.example`.
- `workspace/` directory convention + `.gitignore` for run artifacts.
- SQLite chosen driver (`better-sqlite3` or `drizzle-orm` + migrations tool, e.g. `drizzle-kit` or `knex`).

**Checkpoint:** `npm run build` succeeds across workspaces; empty Fastify server boots; empty Next.js app boots.

---

## BACKEND

## Phase 1 – Data Layer (SQLite)

**Goal:** Persist run lifecycle metadata per architecture §8.

- Define schema/migrations for: `runs`, `run_inputs`, `run_files`, `hitl_decisions`, `jeve_results`.
- Migration runner + seed script.
- Repository layer (`packages/shared` or `apps/api/db`) with typed CRUD functions: `createRun`, `getRun`, `updateRunStatus`, `addRunFile`, `recordHitlDecision`, `recordJeveResult`.
- Workspace filesystem helper: creates `workspace/<runId>/{inputs,requirements,testcases,tests,execution}/` on run creation.

**Checkpoint:** Unit tests for repository layer against an in-memory/temp SQLite DB.

---

## Phase 2 – Provider Factory (LLM & Embeddings)

**Goal:** Config-driven provider/model resolution, no hard-coded logic in workflow (architecture §7).

- `.env` schema + validation (zod) for API keys: `GROQ_API_KEY`, `COHERE_API_KEY`, `OPENROUTER_API_KEY`, `VOYAGE_API_KEY`, `JINA_API_KEY`, `MISTRAL_API_KEY`.
- LLM provider factory: unified `chat(messages, options)` interface with adapters for Groq, Cohere, OpenRouter.
- Embeddings provider factory: unified `embed(texts)` interface with adapters for Voyage, Jina, Mistral.
- Default/fallback config resolution when run doesn't specify provider/model.

**Checkpoint:** Adapter unit tests with mocked HTTP calls; a small script that round-trips one prompt through each configured LLM provider.

---

## Phase 3 – JEV Module (TypeSafe AI / RLCD)

**Goal:** Pre-LLM calibrated gating (architecture §6).

- Define decision types: `structure_ok`, `no_pii_secrets`, `content_quality`, `testable_requirement`.
- `config/jevConfig.ts`: enabled checks + threshold bands (auto-accept / flag / reject), overridable via `.env`.
- `evaluateInput(rawText, files)` → `{ valid, decisions[], probabilities, normalizedInput, errors? }`.
- Persist result via `jeve_results` repository from Phase 1.

**Checkpoint:** Unit tests covering accept / flag / reject paths with synthetic inputs (incl. PII and placeholder samples).

---

## Phase 4 – LangGraph Orchestrator Skeleton

**Goal:** Implement `RunState` typed graph with all nodes as no-op/stubs first, wiring conditional edges (architecture §5).

- Port `RunState`, `RunStatus`, `Phase` types into `packages/shared`.
- Build graph with nodes: `ingest_input → jeve_validate → agent1_requirements → hitl_requirements → agent2_testcases → hitl_testcases → agent3_automation → hitl_automation → execute_tests → finalize_run`.
- Conditional edges: JEV validity branch, HITL approve/reject branch, execution success/failure branch.
- Checkpointing/persistence so a run can pause at `waiting_hitl` and resume later (LangGraph checkpointer backed by SQLite or file-based store).
- Stub node implementations return canned data to validate graph wiring end-to-end.

**Checkpoint:** Integration test drives a run through all stub nodes including a pause/resume cycle.

---

## Phase 5 – Agent 1: Requirements Extraction

**Goal:** Replace `agent1_requirements` stub with real LLM-backed logic (architecture §4.2).

- Prompt template + parser producing `requirements.json` (normalized, IDs, traceability) and `summary.md`.
- Write artifacts to `workspace/<runId>/requirements/`, register in `run_files`.
- Set run to `waiting_hitl` / `hitl_requirements`.

**Checkpoint:** Given sample raw requirements text, produces valid `requirements.json` conforming to schema; validated with a schema test (zod/ajv).

---

## Phase 6 – Agent 2: Test Case Generation

**Goal:** Implement `agent2_testcases` (architecture §4.4).

- Consumes approved `requirements.json`.
- Produces `testcases.json` (`testCaseId`, `title`, `preconditions`, `steps[]`, `expectedResults[]`, `traceability`, priority, tags) and `testcases_summary.md`.
- Save to `workspace/<runId>/testcases/`, register files, set `waiting_hitl` / `hitl_testcases`.

**Checkpoint:** Schema-validated test cases generated from Phase 5 output; traceability IDs match requirement IDs.

---

## Phase 7 – Agent 3: Playwright Test Generation

**Goal:** Implement `agent3_automation` (architecture §4.6).

- Consumes approved `testcases.json`.
- Generates `.spec.ts` files under `workspace/<runId>/tests/`.
- Config flag `enableHITLAutomation`: if true → `waiting_hitl` / `hitl_automation`; else proceed directly.

**Checkpoint:** Generated spec files are syntactically valid TypeScript (compile check) and reference selectors/steps traceable to test cases.

---

## Phase 8 – Playwright Executor & Reporting

**Goal:** Implement `execute_tests` node (architecture §9).

- Run generated tests locally via Playwright Test runner (synchronous, v1 scope).
- Configure reporters: HTML, JSON, JUnit XML, Allure; capture videos/traces/screenshots-on-failure.
- Persist outputs to `workspace/<runId>/execution/`, register in `run_files` with correct `type`.
- Aggregate `{ total, passed, failed }` summary into run record; set `completed`/`failed`.
- `finalize_run` node aggregates final state.

**Checkpoint:** Sample generated spec runs end-to-end producing all four report formats plus at least one screenshot/video/trace artifact.

---

## Phase 9 – Fastify REST API

**Goal:** Expose orchestrator + JEV + data layer via HTTP (architecture §3.2).

Endpoints:
- `POST /runs` – create run (text + files + provider/model config), triggers JEV then LangGraph start.
- `GET /runs` – list runs (for trends/history).
- `GET /runs/:id` – run detail/status/current phase.
- `POST /runs/:id/hitl/:phase` – approve/reject with comments; resumes LangGraph on approve.
- `GET /runs/:id/artifacts/:type` – download/view artifact (summary md, json, excel export, reports).
- `GET /runs/:id/execution/summary` – execution stats.
- `GET /trends` – aggregated pass/fail counts over time across runs.
- File upload handling (`multipart/form-data`) → save to `workspace/<runId>/inputs/`.
- Excel export utility for requirements/test cases (e.g., `exceljs`).

Cross-cutting:
- Input validation (zod) on all routes.
- Centralized error handling; no sensitive data (API keys, PII) in logs (architecture §10).
- CORS config for Next.js dev origin.

**Checkpoint:** REST-level integration tests (supertest) covering full happy path: create run → auto JEV accept → poll status → approve requirements → approve test cases → (approve automation if enabled) → execution completes → fetch trends.

---

## BACKEND MILESTONE — ⏸ Review & Approval Gate

Before starting frontend work: demo the full backend flow via REST client/Postman/curl script, confirm artifacts on disk, DB rows, and reports are correct.

---

## FRONTEND

## Phase 10 – Next.js + Mantine App Shell

**Goal:** Bootstrap UI foundation.

- Next.js app (App Router) + Mantine provider/theme.
- API client layer (typed fetch wrapper using shared DTOs from `packages/shared`).
- App layout: nav (New Run, Runs list, Trends), auth-less v1 (no RBAC per architecture).
- `.env.local` for API base URL.

**Checkpoint:** Shell renders, can hit `GET /runs` and show empty state.

---

## Phase 11 – New Run Page

**Goal:** Implement architecture §4.1 creation flow.

- Form: raw text textarea, file upload (`.md,.txt,.json,.yaml,.pdf,.docx`), provider/model selectors (LLM: Groq/Cohere/OpenRouter; Embeddings: Voyage/Jina/Mistral), `enableHITLAutomation` toggle.
- Submit → `POST /runs`; show JEV rejection errors inline if rejected.
- On success, redirect to Run Detail page.

**Checkpoint:** Can create a run through the UI and see it transition to `waiting_hitl` (requirements) or `failed` on bad input.

---

## Phase 12 – Run Detail Page & HITL Gates

**Goal:** Implement architecture §4.3, §4.5, §4.6 review UX.

- Status/phase indicator with polling or SSE/websocket for live updates.
- Requirements panel: render `summary.md`, download links (md/json/Excel), comment box, Approve/Reject buttons → `POST /runs/:id/hitl/hitl_requirements`.
- Test cases panel: same pattern for `hitl_testcases`.
- Automation panel (conditional on `enableHITLAutomation`): list generated `.spec.ts` files with code viewer, Approve/Reject → `hitl_automation`.
- Rejection flow: show terminal `rejected` state, no further actions.

**Checkpoint:** Full manual walkthrough: create run → approve requirements → approve test cases → (approve automation) → run proceeds to execution.

---

## Phase 13 – Execution Results Page

**Goal:** Implement architecture §4.7–§4.8 results UX.

- Execution summary cards (total/passed/failed).
- Links/embeds: HTML report, Allure report, JSON/JUnit downloads.
- Video/trace/screenshot gallery for failed tests.
- "Start new run" CTA.

**Checkpoint:** For a completed run, all report artifacts are viewable/downloadable from the UI.

---

## Phase 14 – Runs List & Trends Dashboard

**Goal:** Implement architecture §4.8 trends + run history.

- Runs list table: id, status, phase, created date, pass/fail counts, filters by status.
- Trend chart (Mantine charts or Recharts) plotting pass/fail counts over time using `GET /trends`.

**Checkpoint:** Dashboard reflects data from multiple completed runs seeded during backend testing.

---

## Phase 15 – End-to-End Hardening & Polish

**Goal:** Cross-cutting quality pass before calling v1 done.

- Error boundaries + toast notifications for API failures.
- Loading/empty states across all pages.
- Basic accessibility pass (labels, focus states).
- Playwright/UI smoke test (or Vitest + Testing Library) covering create-run → approve → view results.
- README updates: setup, env vars, run instructions.

**Checkpoint:** One full manual E2E run from UI create-run through viewing execution report with no console errors.

---

## Explicitly Out of Scope (see `enhancements.md`)

Dockerized workers, async job queues, multi-project/multi-tenant, auth/RBAC, advanced RAG/embeddings retrieval, additional LLM providers, JEV gating beyond input stage, observability stack, audit logs, retention policies.

---

## Next Step

Awaiting approval of this plan. Once approved, implementation will proceed **Phase 0 → Phase 9 (backend)**, checkpoint for review, then **Phase 10 → Phase 15 (frontend)**.
