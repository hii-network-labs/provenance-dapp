import { Pool } from "pg";

const {
  DATABASE_URL,
  PGPOOL_MAX,
  PGPOOL_IDLE_TIMEOUT_MS,
  PGPOOL_CONN_TIMEOUT_MS,
  PGSSL,
} = process.env as Record<string, string | undefined>;

if (!DATABASE_URL) {
  // We won't throw here to avoid crashing the app in environments without DB.
  // API routes will guard and skip DB operations when missing.
  console.warn("DATABASE_URL is not set. Postgres features will be disabled.");
}

export const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      max: Number(PGPOOL_MAX || 10),
      idleTimeoutMillis: Number(PGPOOL_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(PGPOOL_CONN_TIMEOUT_MS || 5000),
      ssl: PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    })
  : null;

let initPromise: Promise<void> | null = null;

export async function initDb() {
  if (!pool) return;
  if (!initPromise) {
    initPromise = (async () => {
      await pool!.query(`
        CREATE TABLE IF NOT EXISTS registry_entities (
          tx_hash TEXT PRIMARY KEY,
          id TEXT,
          entity_type TEXT,
          data_json TEXT,
          version TEXT,
          previous_id TEXT,
          timestamp TEXT,
          submitter TEXT,
          tx_url TEXT,
          chain_name TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_registry_entities_id ON registry_entities(id);
      `);
    })();
  }
  return initPromise;
}

export type DbEntityRow = {
  tx_hash: string;
  id: string | null;
  entity_type: string | null;
  data_json: string | null;
  version: string | null;
  previous_id: string | null;
  timestamp: string | null;
  submitter: string | null;
  tx_url: string | null;
  chain_name: string | null;
  created_at: string | null;
};

export async function saveEntityByTx(row: Omit<DbEntityRow, "created_at">) {
  if (!pool) return;
  await initDb();
  await pool!.query(
    `INSERT INTO registry_entities (
      tx_hash, id, entity_type, data_json, version, previous_id, timestamp, submitter, tx_url, chain_name
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (tx_hash) DO UPDATE SET
      id=EXCLUDED.id,
      entity_type=EXCLUDED.entity_type,
      data_json=EXCLUDED.data_json,
      version=EXCLUDED.version,
      previous_id=EXCLUDED.previous_id,
      timestamp=EXCLUDED.timestamp,
      submitter=EXCLUDED.submitter,
      tx_url=EXCLUDED.tx_url,
      chain_name=EXCLUDED.chain_name
  `,
    [
      row.tx_hash,
      row.id,
      row.entity_type,
      row.data_json,
      row.version,
      row.previous_id,
      row.timestamp,
      row.submitter,
      row.tx_url,
      row.chain_name,
    ]
  );
}

export async function getEntityByTx(txHash: string): Promise<DbEntityRow | null> {
  if (!pool) return null;
  await initDb();
  const res = await pool!.query(
    `SELECT * FROM registry_entities WHERE tx_hash = $1 LIMIT 1`,
    [txHash]
  );
  return (res.rows[0] as DbEntityRow) || null;
}