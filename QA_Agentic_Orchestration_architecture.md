# QA Agentic Orchestration – Architecture

**System name:** `qa-agent-platform`  
**Version:** 0.1 (v1 baseline)  
**Last updated:** 2026-09-26

## 1. Overview

This system automates end‑to‑end QA workflows using a multi‑agent architecture orchestrated by LangGraph. It transforms raw requirements (text + files) into:

- Normalized, traceable requirements
- Structured test cases
- Executable Playwright tests
- Rich test execution reports (HTML, JSON, JUnit, Allure) with videos and traces

Key design principles:

- **Spec‑first & vibe‑coding friendly**: Clear contracts, JSON‑based communication, minimal LLM chatter.
- **Calibrated pre‑LLM gating**: TypeSafe AI JEV (RLCD) validates inputs before any LLM call.
- **Human‑in‑the‑loop (HITL)**: Review and approval gates between major phases via a web UI.
- **Configurable providers & models**: LLM and embeddings providers selectable per run; nothing hard‑coded.
- **Extensible**: Clear separation between v1 baseline and future enhancements.

## 2. System Context (C4 Level 1)

**Actors:**

- **QA Engineer / Tester** – primary user who creates runs, reviews artifacts, performs HITL approvals, and views reports.

**System:** `qa-agent-platform`

**External dependencies:**

- **LLM providers:** Groq, Cohere, OpenRouter  
- **Embeddings providers:** Voyage AI, Jina AI, Mistral  
- **Filesystem:** Local `workspace/` directory for inputs and artifacts  
- **Database:** SQLite for run metadata, HITL decisions, JEV results, file indexes

**High-level interactions:**

- User interacts with a **Next.js + Mantine** web UI.
- UI calls a **Fastify** backend API.
- Backend integrates:
  - **JEV (TypeSafe AI)** for RLCD‑based validation.
  - **LangGraph** for multi‑agent orchestration.
  - **Playwright** for test execution and reporting.
- Backend stores metadata in SQLite and artifacts in the filesystem.

See `diagrams.md` for the C4 Context diagram.

## 3. Containers (C4 Level 2)

Within `qa-agent-platform`:

1. **Next.js UI (Mantine)**
   - Web application for:
     - Creating runs (paste text, upload files).
     - Selecting LLM and embeddings providers/models.
     - Reviewing artifacts (requirements, test cases, tests, reports).
     - Downloading artifacts (Markdown, Text, Excel).
     - Performing HITL approve/reject actions.
     - Viewing execution summaries and trends.

2. **Fastify Service**
   - REST API backend.
   - Responsibilities:
     - Run lifecycle management (create, list, get, approve/reject).
     - File upload/download handling.
     - JEV integration (pre‑LLM validation).
     - Starting and resuming LangGraph workflows.
     - Storing/retrieving metadata from SQLite.
     - Serving execution trends data to the UI.

3. **LangGraph Orchestrator**
   - TypeScript + LangGraph stateful workflow engine.
   - Implements the multi‑agent pipeline as nodes and edges over a typed state.
   - Manages:
     - Agent 1 (Requirements)
     - Agent 2 (Test Cases)
     - Agent 3 (Automation)
     - HITL pause/resume logic
     - Playwright execution trigger

4. **JEV Module (TypeSafe AI)**
   - Uses TypeSafe AI’s JEV model trained with RLCD.
   - Provides calibrated decisions on:
     - Structure & schema validity
     - Content quality (placeholders, completeness)
     - PII / secrets detection
     - Testability of requirements
   - Decisions used to:
     - Accept / reject inputs before LLM calls.
     - Optionally route borderline cases to HITL.

5. **Playwright Executor**
   - TypeScript + Playwright.
   - Responsibilities:
     - Generate Playwright test files from structured test cases.
     - Execute tests locally.
     - Collect reports:
       - HTML
       - JSON
       - JUnit XML
       - Allure
       - Videos, traces, screenshots
     - Write outputs to `workspace/<runId>/execution/`.

6. **SQLite DB**
   - Stores:
     - `runs` – run metadata and status.
     - `run_inputs` – raw text references.
     - `run_files` – file metadata and paths.
     - `hitl_decisions` – HITL approve/reject records.
     - `jeve_results` – JEV decisions and probabilities.

7. **Workspace (Filesystem)**
   - Directory structure per run, e.g.:
     - `workspace/<runId>/inputs/`
     - `workspace/<runId>/requirements/`
     - `workspace/<runId>/testcases/`
     - `workspace/<runId>/tests/`
     - `workspace/<runId>/execution/`

See `diagrams.md` for the C4 Container diagram.

## 4. End‑to‑End Workflow (User‑Centric)

### 4.1 Create Run & Input Validation

1. User opens **New Run** in the UI.
2. Provides:
   - Raw text (requirements, user stories, etc.).
   - Optional file uploads: `.md`, `.txt`, `.json`, `.yaml`, `.pdf`, `.docx`.
   - Provider/model selections:
     - LLM provider: Groq / Cohere / OpenRouter
     - LLM model
     - Embeddings provider: Voyage / Jina / Mistral
     - Embeddings model
3. UI sends `POST /runs` to Fastify with inputs and selections.
4. Fastify:
   - Creates a `run` record (`status = created`).
   - Saves inputs to `workspace/<runId>/inputs/`.
   - Calls **JEV** to validate the input.

**JEV behavior (configurable):**

- Evaluates multiple RLCD‑style decisions (structure, PII, placeholders, testability).
- Uses calibrated probabilities with configurable thresholds:
  - Auto‑accept
  - Auto‑reject
  - Optional “review” band
- If rejected: run marked `failed` or `rejected_by_jeve`; UI shows errors.
- If accepted: LangGraph workflow is started.

### 4.2 Agent 1 – Requirements Extraction & Normalization

- LangGraph invokes **Agent 1** using the selected LLM provider/model.
- Agent 1:
  - Parses raw input.
  - Produces:
    - `requirements.json` – normalized, structured requirements with IDs and traceability fields.
    - `summary.md` – human‑readable summary.
- Artifacts saved to `workspace/<runId>/requirements/`.
- Run status set to `waiting_hitl` at phase `hitl_requirements`.

### 4.3 HITL Gate 1 – Requirements Approval

- UI displays:
  - Requirements summary.
  - Download links for `summary.md`, `requirements.json`, and optionally an Excel view.
- User can:
  - Add comments.
  - Approve or reject.
- On approve:
  - HITL decision stored in DB.
  - LangGraph run resumed.
- On reject:
  - Run marked `rejected`; workflow stops.

### 4.4 Agent 2 – Test Case Generation

- LangGraph invokes **Agent 2** with approved requirements JSON.
- Agent 2:
  - Generates structured test cases:
    - `testCaseId`, `title`, `preconditions`, `steps[]`, `expectedResults[]`
    - `traceability: [requirementId...]`
    - Priority, tags, etc.
  - Produces:
    - `testcases.json`
    - `testcases_summary.md`
- Saved to `workspace/<runId>/testcases/`.
- Run status set to `waiting_hitl` at phase `hitl_testcases`.

### 4.5 HITL Gate 2 – Test Case Approval

- UI displays test case summary and download options (Markdown, JSON, Excel).
- User approves or rejects.
- On approve: resume LangGraph.
- On reject: run marked `rejected`.

### 4.6 Agent 3 – Playwright Test Generation

- LangGraph invokes **Agent 3** with approved test cases JSON.
- Agent 3:
  - Generates Playwright (TypeScript) test files:
    - One or more `.spec.ts` files.
    - Organized under `workspace/<runId>/tests/`.
- If **HITL for automation** is enabled (config flag):
  - Run status set to `waiting_hitl` at phase `hitl_automation`.
  - UI shows generated test files for review and approval.
- If disabled: proceed directly to execution.

### 4.7 Playwright Test Execution

- LangGraph triggers **Playwright Executor**.
- Playwright:
  - Runs tests locally.
  - Collects:
    - HTML report
    - JSON report
    - JUnit XML
    - Allure report
    - Videos, traces, screenshots
- Outputs saved to `workspace/<runId>/execution/`.
- Execution summary (total, passed, failed) stored in DB.
- Run status set to `completed` (or `failed` on critical errors).

### 4.8 Results & Trends

- UI shows:
  - Execution summary.
  - Links to:
    - HTML report
    - Allure report
    - JSON/JUnit downloads
    - Videos and traces
  - **Trend chart**: pass/fail counts over time across runs.
- Users can download any artifact and start new runs as needed.

See `diagrams.md` for the sequence diagram.

## 5. LangGraph State & Phases

### 5.1 Core State Fields

```ts
type RunStatus =
  | "created"
  | "running"
  | "waiting_hitl"
  | "completed"
  | "failed"
  | "rejected";

type Phase =
  | "jeve_validate"
  | "agent1_requirements"
  | "hitl_requirements"
  | "agent2_testcases"
  | "hitl_testcases"
  | "agent3_automation"
  | "hitl_automation"
  | "execute_tests"
  | "finalize_run";

interface RunState {
  runId: string;
  status: RunStatus;
  currentPhase: Phase | null;

  input: {
    rawText?: string;
    files: { name: string; path: string; type: string }[];
  };

  jeve: {
    valid: boolean;
    errors?: any[];
    normalizedInput?: any;
  };

  requirements: {
    summaryMarkdownPath?: string;
    requirementsJsonPath?: string;
    hitlStatus?: "pending" | "approved" | "rejected";
    hitlComments?: string;
  };

  testCases: {
    summaryMarkdownPath?: string;
    testCasesJsonPath?: string;
    hitlStatus?: "pending" | "approved" | "rejected";
    hitlComments?: string;
  };

  automation: {
    generatedTestFiles: string[];
    hitlStatus?: "pending" | "approved" | "rejected";
  };

  execution: {
    reportHtmlPath?: string;
    reportJsonPath?: string;
    reportJunitPath?: string;
    reportAllurePath?: string;
    summary?: { total: number; passed: number; failed: number };
  };

  config: {
    llmProvider: "groq" | "cohere" | "openrouter";
    llmModel: string;
    embeddingsProvider: "voyage" | "jina" | "mistral";
    embeddingsModel: string;
    enableHITLAutomation: boolean;
  };
}
```

### 5.2 Phases (Nodes)

1. `ingest_input` – create run, store inputs.
2. `jeve_validate` – call JEV; branch to fail or continue.
3. `agent1_requirements` – LLM‑based requirements extraction.
4. `hitl_requirements` – pause for HITL; resume on approval.
5. `agent2_testcases` – LLM‑based test case generation.
6. `hitl_testcases` – pause for HITL; resume on approval.
7. `agent3_automation` – generate Playwright tests.
8. `hitl_automation` – optional HITL gate (configurable).
9. `execute_tests` – run Playwright, collect reports.
10. `finalize_run` – aggregate results, mark `completed`.

Edges are conditional based on:
- JEV validity
- HITL decisions
- Execution success/failure

## 6. JEV (TypeSafe AI) – RLCD Integration

**Role:** Pre‑LLM calibrated decision layer.

**Decisions (configurable):**

- `structure_ok` – input conforms to expected structure/schema.
- `no_pii_secrets` – no obvious PII or secrets detected.
- `content_quality` – no obvious placeholders, sufficient detail.
- `testable_requirement` – requirement appears testable.

**Thresholds (configurable):**

- Example bands:
  - `p >= 0.8` → auto‑accept.
  - `0.5 <= p < 0.8` → accept but flag.
  - `p < 0.5` → reject.

**Configuration:**

- All decision definitions, thresholds, and enabled checks live in config (e.g., `config/jevConfig.ts`) and can be overridden via `.env`.

**Integration points:**

- Primary: before Agent 1 (on raw input).
- Optional future: before Agent 2 (on normalized requirements JSON), before Agent 3 (on test cases JSON).

## 7. Provider & Model Configuration

**LLM providers (v1):**

- Groq
- Cohere
- OpenRouter

**Embeddings providers (v1):**

- Voyage AI
- Jina AI
- Mistral

**Configuration strategy:**

- `.env` holds API keys and base URLs, e.g.:
  - `GROQ_API_KEY`
  - `COHERE_API_KEY`
  - `OPENROUTER_API_KEY`
  - `VOYAGE_API_KEY`
  - `JINA_API_KEY`
  - `MISTRAL_API_KEY`
- Provider/model selection:
  - Per run via UI (stored in `run.config`).
  - Fallback defaults in config for runs created without explicit selection.
- No model names or provider logic hard‑coded in workflow; all resolved via a provider factory layer.

## 8. Data Model (SQLite)

Key tables:

- `runs`
  - `id`, `status`, `current_phase`, `config_json`, `created_at`, `updated_at`
- `run_inputs`
  - `id`, `run_id`, `raw_text`
- `run_files`
  - `id`, `run_id`, `name`, `path`, `type`, `phase`, `created_at`
- `hitl_decisions`
  - `id`, `run_id`, `phase`, `decision`, `comments`, `decided_at`
- `jeve_results`
  - `id`, `run_id`, `valid`, `errors_json`, `normalized_input_json`

File `type` examples:  
`input`, `requirements_summary`, `requirements_json`, `testcases_summary`, `testcases_json`, `test_file`, `report_html`, `report_json`, `report_junit`, `report_allure`, `video`, `trace`.

## 9. Playwright Execution & Reporting

**Execution:**

- Local execution on the same host as Fastify (v1).
- Synchronous within the `execute_tests` LangGraph node.

**Reports & artifacts:**

- HTML report (Playwright default)
- JSON report
- JUnit XML
- Allure report
- Videos
- Traces
- Screenshots (on failures)

All stored under `workspace/<runId>/execution/` and indexed in `run_files`.

**Trends:**

- Backend aggregates per‑run execution summaries.
- UI displays a trend chart of pass/fail counts over time.

## 10. Security & Compliance Considerations

- JEV performs initial PII/secrets detection before LLM calls.
- Sensitive data should not be logged in plain text.
- API keys stored in environment variables, never committed.
- Workspace and DB access restricted to the backend service.

## 11. Deployment (v1 Baseline)

- Single backend host running:
  - Fastify service
  - LangGraph orchestrator
  - JEV module
  - Playwright executor
- Next.js UI can be:
  - Co‑located (same host, reverse‑proxied), or
  - Deployed separately (e.g., Vercel) calling the Fastify API.
- SQLite DB and `workspace/` directory on the backend host.

## 12. Enhancements & Future Work

See `enhancements.md` for detailed future capabilities, including:

- Dockerized Playwright workers
- Multi‑project support
- Async execution via job queues
- Advanced RAG with embeddings
- Additional LLM/embedding providers
- More granular JEV gating in later phases
- Role‑based access control and auth
