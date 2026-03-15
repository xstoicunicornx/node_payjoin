// NOTE: this was written with claude AI

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

const DB_DIR = ".";
const RECEIVER_DB_PATH = path.join(DB_DIR, "receiver.db");
const SENDER_DB_PATH = path.join(DB_DIR, "sender.db");

// ─── DB Init ──────────────────────────────────────────────────────────────────

function getDb(dbPath: string): Database.Database {
  fs.mkdirSync(DB_DIR, { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS persisters (
      id      INTEGER PRIMARY KEY,
      closed  INTEGER NOT NULL DEFAULT 0   -- 0 = open, 1 = closed
    );

    CREATE TABLE IF NOT EXISTS events (
      rowid        INTEGER PRIMARY KEY AUTOINCREMENT,
      persister_id INTEGER NOT NULL REFERENCES persisters(id),
      event        TEXT    NOT NULL,        -- JSON-serialised payload
      timestamp    INTEGER NOT NULL         -- Unix ms (Date.now())
    );
  `);

  return db;
}

// ─── Class ────────────────────────────────────────────────────────────────────
class SQLitePersister {
  id: number;
  private db: Database.Database;

  constructor(dbPath: string, id: number) {
    this.id = id;
    this.db = getDb(dbPath);

    this.db
      .prepare(
        `INSERT INTO persisters (id, closed) VALUES (?, 0)
         ON CONFLICT(id) DO NOTHING`,
      )
      .run(id);
  }

  save(event: any): void {
    this.db
      .prepare(
        `INSERT INTO events (persister_id, event, timestamp) VALUES (?, ?, ?)`,
      )
      .run(this.id, JSON.stringify(event), Date.now());
  }

  load(): any[] {
    const rows = this.db
      .prepare(
        `SELECT event FROM events
         WHERE persister_id = ?
         ORDER BY timestamp ASC, rowid ASC`,
      )
      .all(this.id) as { event: string }[];

    return rows.map((r) => JSON.parse(r.event));
  }

  close(): void {
    this.db
      .prepare(`UPDATE persisters SET closed = 1 WHERE id = ?`)
      .run(this.id);
  }
}

export class SQLiteReceiverPersister extends SQLitePersister {
  constructor(id: number) {
    super(RECEIVER_DB_PATH, id);
  }
}
export class SQLiteSenderPersister extends SQLitePersister {
  constructor(id: number) {
    super(SENDER_DB_PATH, id);
  }
}

// ─── Peripheral helpers ───────────────────────────────────────────────────────

/**
 * Returns every receiver persister id whose `closed` flag is 0 (i.e. still open).
 */
export function loadOpenReceiverPersisterIds(): number[] {
  const db = getDb(RECEIVER_DB_PATH);
  const rows = db
    .prepare(`SELECT id FROM persisters WHERE closed = 0 ORDER BY id ASC`)
    .all() as { id: number }[];
  return rows.map((r) => r.id);
}

/**
 * Returns all events stored for the given receiver persister id, ordered by ascending timestamp.
 */
export function loadEventsForReceiverPersister(persisterId: number): any[] {
  const db = getDb(RECEIVER_DB_PATH);
  const rows = db
    .prepare(
      `SELECT event FROM events
       WHERE persister_id = ?
       ORDER BY timestamp ASC, rowid ASC`,
    )
    .all(persisterId) as { event: string }[];
  return rows.map((r) => JSON.parse(r.event));
}

/**
 * Returns the next available receiver persister id
 */
export function receiverPersisterNextId(): number {
  const db = getDb(RECEIVER_DB_PATH);
  const rows = db
    .prepare(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM persisters`)
    .get() as { next_id: number };
  return rows.next_id;
}

/**
 * Returns every sender persister id whose `closed` flag is 0 (i.e. still open).
 */
export function loadOpenSenderPersisterIds(): number[] {
  const db = getDb(SENDER_DB_PATH);
  const rows = db
    .prepare(`SELECT id FROM persisters WHERE closed = 0 ORDER BY id ASC`)
    .all() as { id: number }[];
  return rows.map((r) => r.id);
}

/**
 * Returns all events stored for the given sender persister id, ordered by ascending timestamp.
 */
export function loadEventsForSenderPersister(persisterId: number): any[] {
  const db = getDb(SENDER_DB_PATH);
  const rows = db
    .prepare(
      `SELECT event FROM events
       WHERE persister_id = ?
       ORDER BY timestamp ASC, rowid ASC`,
    )
    .all(persisterId) as { event: string }[];
  return rows.map((r) => JSON.parse(r.event));
}

/**
 * Returns the next available sender persister id
 */
export function senderPersisterNextId(): number {
  const db = getDb(SENDER_DB_PATH);
  const rows = db
    .prepare(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM persisters`)
    .get() as { next_id: number };
  return rows.next_id;
}
