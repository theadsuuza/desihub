import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'desihub.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS endpoints (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT    NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    forward_url     TEXT,
    forward_enabled INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS requests (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id         INTEGER NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    kind                TEXT    NOT NULL DEFAULT 'incoming',
    method              TEXT    NOT NULL,
    path                TEXT    NOT NULL,
    query               TEXT,
    headers             TEXT    NOT NULL,
    body                TEXT,
    content_type        TEXT,
    size                INTEGER NOT NULL DEFAULT 0,
    received_at         TEXT    NOT NULL,
    replayed_from       INTEGER,
    forward_url         TEXT,
    forward_status      INTEGER,
    forward_duration_ms INTEGER,
    forward_error       TEXT,
    forward_response    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_requests_endpoint
    ON requests(endpoint_id, id DESC);
`);
