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

## UI Correction Observations – 2026-09-27

These observations refine the existing frontend phases and should be implemented incrementally with validation after each slice.

- Rework the frontend so users can both enter requirements and review generated outputs in a clearer staged experience. Requirements and test cases should be viewable directly in the UI and downloadable as Markdown, JSON, and Excel where applicable.
- Replace the current left navigation emphasis on screens with a guided stage view that explains the workflow order, highlights the active agent, and shows where each high-level subtask happens.
- Add a user-facing light/dark theme toggle.
- Move LLM and embeddings provider selection out of the New Run form into a Settings area, so provider configuration is managed separately from run submission.
- Introduce rate-limit handling in the UI: when an LLM provider fails because of rate limiting, prompt the user with a decision dialog so they can switch to another configured provider.

---

## Enhancement Wave – Guided Review UX and Regeneration Loop

**Status:** Proposed – pending approval
**Scope:** Incremental enhancement pass on top of the implemented v1 baseline.
**Execution rule:** Implement one enhancement phase at a time, validate it, and pause for approval before the next phase.

### Enhancement 1 – App Shell Navigation, Branding, and Discoverability

**Goal:** Fix the blocked left rail, restore reliable navigation actions, and make the shell easier to understand.

- Make the left navigation independently scrollable so guided-flow cards remain accessible on shorter screens and during long run detail pages.
- Ensure `Insights` and `Settings` nav actions remain clickable in both desktop and mobile layouts.
- Add a visible branded logo/mark that communicates multiple agents collaborating on one QA flow.
- Keep the current top stage strip visual style, but connect Stage 1-5 cards with directional arrows so the workflow reads as a single progression.
- Replace the top-level `Run {id}` heading with user-facing wording such as `QA review workflow` or `Current orchestration run`, while keeping the run id as a secondary reference below it.
- Surface a direct, obvious entry point to the trends dashboard from the shell and run detail context.

**Checkpoint:** Manual UI validation on desktop and laptop-height viewports confirms that the navbar scrolls, `Insights` and `Settings` navigate correctly, the branding is visible, and the trends entry point is discoverable.

### Enhancement 2 – Expandable Stage Panels and Review Ergonomics

**Goal:** Make dense run detail content easier to navigate without losing the current high-value stage overview.

- Convert each major stage pane on the run detail page into an expandable/collapsible section.
- Preserve the current Stage 1-5 overview at the top, but allow each detailed pane below to be expanded only when needed.
- Default expansion behavior should prioritize the active or waiting-for-review stage while letting completed stages collapse cleanly.
- Keep artifact download links and structured previews available inside each expanded pane.

**Checkpoint:** A run with requirements, test cases, automation, and execution data can be reviewed with only one stage expanded at a time and without excessive vertical scrolling.

### Enhancement 3 – Trends Dashboard Visibility and Run History Clarity

**Goal:** Make the insights experience visible, actionable, and understandable from the main workflow.

- Upgrade the existing trends page into an explicit `Trend Dashboard` presentation, not just a generic trends screen.
- Add summary cards or a headline section so the page immediately communicates pass/fail movement and recent run outcomes.
- Improve naming in runs history and run detail surfaces so internal ids are secondary to user-understandable labels.
- Review the home/history view and related labels to ensure users can find past runs and jump into the dashboard without relying on implementation knowledge.

**Checkpoint:** A first-time user can identify where to find historical runs and where to open the trend dashboard within one click from the main shell.

### Enhancement 4 – HITL Rejection Feedback Loop and Regeneration

**Goal:** Turn human rejection into actionable regeneration instead of a terminal dead-end.

- Extend the HITL decision model so rejection feedback is preserved as structured regeneration context, not only as an end-state comment.
- When requirements are rejected, Agent 1 must read the human feedback from the run context and regenerate requirements accordingly.
- When test cases are rejected, Agent 2 must read the human feedback from the run context and regenerate test cases accordingly.
- When automation is rejected, Agent 3 must read the human feedback from the run context and regenerate Playwright specs accordingly.
- Update the orchestration flow so a rejection can loop back to the owning agent stage instead of ending the run immediately.
- Persist regeneration history clearly enough for the UI to show what feedback was given and what was regenerated in response.

**Checkpoint:** An end-to-end test proves that a rejected stage with reviewer comments re-enters the owning agent node, produces a replacement artifact set, and returns to the same HITL gate for re-review.

### Enhancement 5 – Validation, Tests, and Controlled Rollout

**Goal:** Land the enhancement wave safely and keep the workflow supportable.

- Add targeted frontend tests for navbar scroll behavior, clickable navigation actions, and collapsible stage panes.
- Add orchestrator/API tests for rejection-driven regeneration across requirements, test cases, and automation phases.
- Verify that trends/dashboard routes remain reachable after the shell changes.
- Update README or operator notes if the rejection/regeneration lifecycle changes the expected reviewer workflow.

**Checkpoint:** Focused test suite passes for the touched UI and orchestration slices before moving to the next enhancement phase.

### Enhancement 6 – Execution Report Reliability and Human Test Data Preservation

**Goal:** Fix execution-report trustworthiness and ensure human-supplied example data survives into generated test cases and automation.

- Fix the Playwright execution harness so generated config files remain available for the full worker lifecycle and do not cause worker-bootstrap failures or misleading all-tests-failed reports.
- Prevent stale and regenerated `*.spec.ts` revisions in the same run workspace from being executed together unless that behavior is explicitly intended; execution should target the approved artifact set only.
- Update execution/reporting logic so infrastructure failures are surfaced distinctly from genuine assertion failures, making HTML/JSON reports easier to interpret.
- Extend the requirements and test case schemas to preserve human-provided example values, comments, notes, or explicit test data as structured fields instead of compressing them into free-text descriptions.
- Update Agent 1 prompts/parsing so raw requirement comments and embedded example data are extracted into the new structured fields when present.
- Update Agent 2 so generated test cases carry forward the preserved human test data and expose it in a reviewable/downloadable form.
- Update Agent 3 so generated Playwright specs prefer approved structured test data over invented placeholder credentials, names, amounts, or labels.
- Update the review UX and downloadable artifacts where needed so reviewers can confirm which human-supplied data was preserved and used during automation generation.
- Add focused regression tests for both slices: Playwright execution/report generation under failure conditions, and schema/prompt coverage proving that human-provided comments or test data survive requirements → test cases → automation artifacts.

**Checkpoint:** A targeted run proves that Playwright reports no longer fail due to missing generated config artifacts, and a sample requirement containing explicit human-supplied test data is traceably preserved in requirements, test cases, and generated Playwright code.

---

## Proposed Approval Sequence For This Enhancement Wave

1. Approve Enhancement 1 to fix shell usability and branding first.
2. Approve Enhancement 2 to add collapsible stage panes after the shell is stable.
3. Approve Enhancement 3 to improve trend dashboard visibility and history clarity.
4. Approve Enhancement 4 to implement rejection-driven regeneration in the orchestrator and UI.
5. Approve Enhancement 5 for final hardening and regression coverage.
6. Approve Enhancement 6 to harden Playwright execution reporting and preserve human-supplied test data through all generation stages.
- Ensure automation scripts execute after approval and that execution results remain clearly visible in the UI once available.
- Add a footer with the copyright text: `2026 Aroun AI labs`.

### Recommended Implementation Order

- Update the application shell first: guided sidebar, footer, theme toggle, and Settings entry point.
- Move provider configuration into Settings and wire New Run to consume the saved selections.
- Improve requirements/test case review screens to make authored and generated artifacts easier to inspect before download.
- Add rate-limit dialog handling around run creation and HITL resume flows.
- Refine post-approval automation and execution-result presentation.
- Fix execution-harness/report reliability and then extend the schemas/prompts so human-supplied test data persists through requirements, test cases, and automation generation.

---

## Explicitly Out of Scope (see `enhancements.md`)

Dockerized workers, async job queues, multi-project/multi-tenant, auth/RBAC, advanced RAG/embeddings retrieval, additional LLM providers, JEV gating beyond input stage, observability stack, audit logs, retention policies.

---

## Next Step

Awaiting approval of this plan. Once approved, implementation will proceed **Phase 0 → Phase 9 (backend)**, checkpoint for review, then **Phase 10 → Phase 15 (frontend)**.
