'use strict';

import { join } from 'path';
import { homedir } from 'os';
import sqlite3 from 'sqlite3';

export interface DBResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface TransactionClient {
  query<T = any>(text: string, params?: unknown[]): Promise<DBResult<T>>;
}

export interface Database {
  query<T = any>(text: string, params?: unknown[]): Promise<DBResult<T>>;
  shutdown(): Promise<void>;
  checkHealth(): Promise<void>;
  withTransaction(fn: (client: TransactionClient) => Promise<void>): Promise<void>;
}

const DEFAULT_SQLITE_PATH = join(homedir(), '.locopilot', 'db.sqlite');

class SQLiteDatabase implements Database {
  private db: sqlite3.Database;

  constructor(filename: string) {
    this.db = new sqlite3.Database(filename);
    console.log(`[db] Using SQLite at ${filename}`);
  }

  async query<T>(text: string, params?: unknown[]): Promise<DBResult<T>> {
    const isSelect = text.trim().toUpperCase().startsWith('SELECT');

    return new Promise((resolve, reject) => {
      if (isSelect) {
        this.db.all(text, params ?? [], (err: Error | null, rows: unknown[]) => {
          if (err) return reject(err);
          resolve({ rows: rows as T[], rowCount: rows.length });
        });
      } else {
        this.db.run(text, params ?? [], function (this: sqlite3.RunResult, err: Error | null) {
          if (err) return reject(err);
          resolve({ rows: [], rowCount: this.changes });
        });
      }
    });
  }

  async withTransaction(fn: (client: TransactionClient) => Promise<void>): Promise<void> {
    await this.query('BEGIN');
    try {
      await fn(this as unknown as TransactionClient);
      await this.query('COMMIT');
    } catch (err) {
      await this.query('ROLLBACK');
      throw err;
    }
  }

  async shutdown(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async checkHealth(): Promise<void> {
    await this.query('SELECT 1');
  }
}

let _instance: Database | null = null;

export function getDatabase(): Database {
  if (!_instance) {
    const sqlitePath = process.env.SQLITE_PATH || DEFAULT_SQLITE_PATH;
    _instance = new SQLiteDatabase(sqlitePath);
  }
  return _instance;
}

export async function query<T = any>(text: string, params?: unknown[]): Promise<DBResult<T>> {
  return getDatabase().query<T>(text, params);
}

export async function withTransaction(fn: (client: TransactionClient) => Promise<void>): Promise<void> {
  return getDatabase().withTransaction(fn);
}

export async function shutdown(): Promise<void> {
  if (_instance) {
    await _instance.shutdown();
    _instance = null;
  }
}
