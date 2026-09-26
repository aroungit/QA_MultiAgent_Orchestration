import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

/** Creates a LangGraph checkpointer backed by a SQLite file (or `:memory:`), for pause/resume persistence. */
export function createSqliteCheckpointer(dbPath: string): SqliteSaver {
  return SqliteSaver.fromConnString(dbPath);
}
