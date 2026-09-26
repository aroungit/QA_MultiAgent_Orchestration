CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  current_phase TEXT,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS run_inputs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  raw_text TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS run_files (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  phase TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hitl_decisions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  decision TEXT NOT NULL,
  comments TEXT,
  decided_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jeve_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  valid INTEGER NOT NULL,
  errors_json TEXT,
  normalized_input_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_run_inputs_run_id ON run_inputs(run_id);
CREATE INDEX IF NOT EXISTS idx_run_files_run_id ON run_files(run_id);
CREATE INDEX IF NOT EXISTS idx_hitl_decisions_run_id ON hitl_decisions(run_id);
CREATE INDEX IF NOT EXISTS idx_jeve_results_run_id ON jeve_results(run_id);
