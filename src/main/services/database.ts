import BetterSqlite3 from 'better-sqlite3';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import type { Job, JobRun, JobStatus } from '../../shared/types';

export class Database {
  private db: BetterSqlite3Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'worktree-manager.db');
    this.db = new BetterSqlite3(dbPath);
    this.init();
  }

  private init(): void {
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worktree_path TEXT NOT NULL,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        cron TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        last_run TEXT,
        next_run TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS job_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        finished_at TEXT,
        exit_code INTEGER,
        stdout TEXT NOT NULL DEFAULT '',
        stderr TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'running',
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_worktree ON jobs(worktree_path);
      CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON job_runs(job_id);
    `);
  }

  // Job CRUD operations

  createJob(worktreePath: string, name: string, command: string, cron?: string): Job {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (worktree_path, name, command, cron, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    const status: JobStatus = cron ? 'scheduled' : 'pending';
    const result = stmt.run(worktreePath, name, command, cron || null, status);
    return this.getJob(result.lastInsertRowid as number)!;
  }

  getJob(id: number): Job | undefined {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
    const row = stmt.get(id) as JobRow | undefined;
    return row ? this.rowToJob(row) : undefined;
  }

  listJobs(worktreePath?: string): Job[] {
    let stmt;
    if (worktreePath) {
      stmt = this.db.prepare('SELECT * FROM jobs WHERE worktree_path = ? ORDER BY created_at DESC');
      return (stmt.all(worktreePath) as JobRow[]).map(this.rowToJob);
    } else {
      stmt = this.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC');
      return (stmt.all() as JobRow[]).map(this.rowToJob);
    }
  }

  updateJob(id: number, updates: Partial<Pick<Job, 'status' | 'lastRun' | 'nextRun'>>): Job {
    const setClauses: string[] = ['updated_at = datetime(\'now\')'];
    const values: (string | null)[] = [];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.lastRun !== undefined) {
      setClauses.push('last_run = ?');
      values.push(updates.lastRun ? updates.lastRun.toISOString() : null);
    }
    if (updates.nextRun !== undefined) {
      setClauses.push('next_run = ?');
      values.push(updates.nextRun ? updates.nextRun.toISOString() : null);
    }

    values.push(id.toString());

    const stmt = this.db.prepare(`UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getJob(id)!;
  }

  deleteJob(id: number): void {
    const stmt = this.db.prepare('DELETE FROM jobs WHERE id = ?');
    stmt.run(id);
  }

  // Job run operations

  createJobRun(jobId: number): JobRun {
    const stmt = this.db.prepare(`
      INSERT INTO job_runs (job_id, status)
      VALUES (?, 'running')
    `);
    const result = stmt.run(jobId);
    return this.getJobRun(result.lastInsertRowid as number)!;
  }

  getJobRun(id: number): JobRun | undefined {
    const stmt = this.db.prepare('SELECT * FROM job_runs WHERE id = ?');
    const row = stmt.get(id) as JobRunRow | undefined;
    return row ? this.rowToJobRun(row) : undefined;
  }

  updateJobRun(id: number, updates: { stdout?: string; stderr?: string; exitCode?: number; status?: JobRun['status'] }): JobRun {
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.stdout !== undefined) {
      setClauses.push('stdout = ?');
      values.push(updates.stdout);
    }
    if (updates.stderr !== undefined) {
      setClauses.push('stderr = ?');
      values.push(updates.stderr);
    }
    if (updates.exitCode !== undefined) {
      setClauses.push('exit_code = ?');
      values.push(updates.exitCode);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
      if (updates.status !== 'running') {
        setClauses.push('finished_at = datetime(\'now\')');
      }
    }

    values.push(id);

    const stmt = this.db.prepare(`UPDATE job_runs SET ${setClauses.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getJobRun(id)!;
  }

  getJobRuns(jobId: number, limit = 10): JobRun[] {
    const stmt = this.db.prepare('SELECT * FROM job_runs WHERE job_id = ? ORDER BY started_at DESC LIMIT ?');
    return (stmt.all(jobId, limit) as JobRunRow[]).map(this.rowToJobRun);
  }

  // Helpers

  private rowToJob(row: JobRow): Job {
    return {
      id: row.id,
      worktreePath: row.worktree_path,
      name: row.name,
      command: row.command,
      cron: row.cron || undefined,
      status: row.status as JobStatus,
      lastRun: row.last_run ? new Date(row.last_run) : undefined,
      nextRun: row.next_run ? new Date(row.next_run) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private rowToJobRun(row: JobRunRow): JobRun {
    return {
      id: row.id,
      jobId: row.job_id,
      startedAt: new Date(row.started_at),
      finishedAt: row.finished_at ? new Date(row.finished_at) : undefined,
      exitCode: row.exit_code ?? undefined,
      stdout: row.stdout,
      stderr: row.stderr,
      status: row.status as JobRun['status'],
    };
  }

  close(): void {
    this.db.close();
  }
}

// Database row types
interface JobRow {
  id: number;
  worktree_path: string;
  name: string;
  command: string;
  cron: string | null;
  status: string;
  last_run: string | null;
  next_run: string | null;
  created_at: string;
  updated_at: string;
}

interface JobRunRow {
  id: number;
  job_id: number;
  started_at: string;
  finished_at: string | null;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  status: string;
}
