# QA Agentic Orchestration – Enhancements & Future Work

This document lists enhancements that are intentionally out of scope for v1 but aligned with the architecture. Each item can be revisited and implemented incrementally without changing the core design.

## 1. Execution & Scaling

### 1.1 Containerized Playwright Workers

- Run Playwright tests in isolated Docker containers (e.g., official Playwright images).
- Benefits:
  - Better isolation and reproducibility.
  - Easier to scale horizontally.
- Implementation ideas:
  - Fastify submits execution jobs to a queue (BullMQ + Redis).
  - Worker containers pull jobs, execute tests, push reports back to shared storage.

### 1.2 Async Test Execution with Job Queues

- Replace synchronous `execute_tests` node with an async job model.
- LangGraph:
  - Submits an execution job and waits (checkpointed).
  - Polls or gets notified when the job completes.
- Enables:
  - Better handling of long‑running test suites.
  - Concurrency control (max parallel executions).

### 1.3 Concurrency Controls & Resource Management

- Configurable limits:
  - Max concurrent runs.
  - Max concurrent test executions.
- Per‑project or per‑user quotas in a multi‑tenant setup.

## 2. Multi‑Project & Multi‑Tenant Support

### 2.1 Projects / Workspaces

- Add `projects` table:
  - `id`, `name`, `owner`, `created_at`, etc.
- Associate runs, files, and configs to a project.
- UI:
  - Project selector.
  - Project‑scoped run lists and trends.

### 2.2 Users, Roles, and Permissions

- Authentication (e.g., OAuth, OIDC, or simple token‑based for internal use).
- Roles:
  - Admin, QA Lead, Tester, Viewer.
- Permissions:
  - Who can create runs, approve HITL, view reports, modify configs.

## 3. Advanced RAG & Retrieval

### 3.1 Embeddings‑Based Retrieval for Requirements

- Use Voyage/Jina/Mistral embeddings to:
  - Index historical requirements and test cases.
  - Retrieve similar requirements when generating new test cases.
- Benefits:
  - Better consistency across runs.
  - Reuse of proven test patterns.

### 3.2 Reranking & Context Selection

- Use Jina (or similar) as a reranker:
  - Retrieve a larger candidate set.
  - Rerank to select the most relevant context for LLM calls.
- Configurable:
  - Number of retrieved documents.
  - Thresholds for inclusion.

### 3.3 Knowledge Base & Versioning

- Maintain a versioned knowledge base:
  - Requirements library
  - Test case patterns
  - Common failure modes and fixes
- Allow users to tag and search artifacts.

## 4. JEV (RLCD) Enhancements

### 4.1 Additional Decision Types

- Domain‑specific checks:
  - Compliance rules (e.g., regulatory constraints).
  - Security‑related patterns.
  - Performance/SLA‑related requirements.

### 4.2 JEV in Later Phases

- Apply JEV not only on raw input but also on:
  - Normalized requirements JSON (before test case generation).
  - Test cases JSON (before test code generation).
- Use calibrated probabilities to:
  - Auto‑accept high‑confidence artifacts.
  - Route borderline cases to HITL.
  - Reject clearly problematic artifacts early.

### 4.3 Configurable Decision Policies

- Per‑project or per‑run policies:
  - Which JEV checks are enabled.
  - Different thresholds for different teams or domains.

## 5. Provider & Model Flexibility

### 5.1 Additional LLM Providers

- Add support for:
  - OpenAI
  - Anthropic
  - Google Vertex AI
  - Self‑hosted models (e.g., via Ollama, vLLM)
- Provider factory pattern already in place; new providers can be added as plugins.

### 5.2 Per‑Agent Model Selection

- Allow users to select different models for:
  - Requirements extraction
  - Test case generation
  - Test code generation
- UI can expose advanced settings for power users.

### 5.3 Model Benchmarking & Auto‑Selection

- Track metrics per model:
  - Cost
  - Latency
  - Quality signals (e.g., HITL rejection rates, defect leakage)
- Optionally recommend or auto‑select models based on historical performance.

## 6. UI & UX Enhancements

### 6.1 Richer Trend Analytics

- More detailed charts:
  - Pass rate over time per project.
  - Failure categories (flaky vs real failures).
  - Execution duration trends.
- Filters:
  - By date range, project, provider/model, test suite.

### 6.2 Artifact Comparison

- Compare:
  - Requirements across runs.
  - Test cases across versions.
  - Test execution results between runs.
- Highlight diffs in structure and content.

### 6.3 Inline Editing & Feedback Loops

- Allow users to:
  - Edit requirements or test cases directly in the UI after generation.
  - Provide feedback signals (e.g., “this test case was not useful”).
- Feed feedback into:
  - Future prompt improvements.
  - Model selection or fine‑tuning decisions.

## 7. Test Automation Capabilities

### 7.1 API & Integration Testing

- Extend Agent 3 to generate:
  - API tests (REST, GraphQL).
  - Integration tests (multi‑step workflows).
- Use Playwright’s API testing capabilities or other frameworks.

### 7.2 Automated Test Repair & Flakiness Handling

- Use LLMs to:
  - Analyze failed tests.
  - Suggest or apply fixes (e.g., selector updates, timing adjustments).
- Track flaky tests and suggest stabilizations.

### 7.3 Visual Regression & Accessibility Tests

- Generate:
  - Visual regression tests (screenshots, diffs).
  - Accessibility checks (a11y rules) as part of the test suite.

## 8. Observability & Operations

### 8.1 Distributed Tracing & Logging

- Integrate with observability tools:
  - OpenTelemetry, Jaeger, Tempo, etc.
- Trace:
  - API calls
  - LLM calls
  - LangGraph state transitions
  - Test execution

### 8.2 Metrics & Dashboards

- Expose metrics:
  - Number of runs, success/failure rates.
  - Average execution time.
  - LLM token usage and cost.
- Dashboards for:
  - Platform health.
  - Team productivity.

### 8.3 Alerting

- Alerts on:
  - High failure rates.
  - Long execution times.
  - JEV rejection spikes.
  - Provider errors or rate limits.

## 9. Security, Compliance, and Governance

### 9.1 Enhanced PII & Secrets Handling

- More advanced scanning:
  - Integration with dedicated secret scanning tools.
  - Policy‑based handling (e.g., mask vs reject).

### 9.2 Audit Logs

- Log:
  - Who created/modified runs.
  - HITL decisions and comments.
  - Configuration changes.
- Support compliance requirements and internal audits.

### 9.3 Data Retention & Archiving

- Policies for:
  - How long to keep runs, artifacts, and reports.
  - Archiving old runs to cold storage.
  - Automatic cleanup of workspace files.

## 10. Developer Experience & Vibe Coding

### 10.1 Prompt & Architecture Evolution

- Maintain evolving `prompt.md` and `architecture.md` files:
  - Versioned alongside code.
  - Used as context for Copilot / other AI assistants.
- Add:
  - Example runs.
  - Known patterns and anti‑patterns.

### 10.2 Local Dev & Sandbox Modes

- “Sandbox” mode:
  - Run with mocked LLMs or small local models.
  - Faster iteration for prompt and workflow tweaks.
- One‑command local setup:
  - Docker Compose for DB, queue, and services (when async workers are added).

### 10.3 Template Library

- Reusable templates for:
  - Common requirement types.
  - Standard test case patterns.
  - Typical Playwright test structures.
- Allow teams to share and version templates.
