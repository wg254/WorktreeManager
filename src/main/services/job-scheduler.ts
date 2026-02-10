import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import cron, { ScheduledTask } from 'node-cron';
import type { Job, JobRun } from '../../shared/types';
import { Database } from './database';

interface RunningJob {
  process: ChildProcess;
  run: JobRun;
  stdout: string;
  stderr: string;
}

export class JobScheduler extends EventEmitter {
  private db: Database;
  private scheduledTasks: Map<number, ScheduledTask> = new Map();
  private runningJobs: Map<number, RunningJob> = new Map();

  constructor(db: Database) {
    super();
    this.db = db;
  }

  /**
   * Start the scheduler, rehydrating jobs from database
   */
  async start(): Promise<void> {
    const jobs = this.db.listJobs();

    for (const job of jobs) {
      if (job.cron) {
        this.scheduleJob(job);
      }
    }
  }

  /**
   * Stop all scheduled tasks and running jobs
   */
  stop(): void {
    // Stop all scheduled tasks
    for (const task of this.scheduledTasks.values()) {
      task.stop();
    }
    this.scheduledTasks.clear();

    // Kill all running jobs
    for (const running of this.runningJobs.values()) {
      running.process.kill();
    }
    this.runningJobs.clear();
  }

  /**
   * Create a new job
   */
  createJob(worktreePath: string, name: string, command: string, cronExpr?: string): Job {
    const job = this.db.createJob(worktreePath, name, command, cronExpr);

    if (cronExpr) {
      this.scheduleJob(job);
    }

    return job;
  }

  /**
   * Delete a job
   */
  deleteJob(jobId: number): void {
    // Stop scheduled task if exists
    const task = this.scheduledTasks.get(jobId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(jobId);
    }

    // Kill running job if exists
    const running = this.runningJobs.get(jobId);
    if (running) {
      running.process.kill();
      this.runningJobs.delete(jobId);
    }

    this.db.deleteJob(jobId);
  }

  /**
   * Run a job immediately
   */
  async runJob(jobId: number): Promise<JobRun> {
    const job = this.db.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Check if already running
    if (this.runningJobs.has(jobId)) {
      throw new Error(`Job is already running: ${jobId}`);
    }

    return this.executeJob(job);
  }

  /**
   * Stop a running job
   */
  stopJob(jobId: number): void {
    const running = this.runningJobs.get(jobId);
    if (!running) {
      throw new Error(`Job is not running: ${jobId}`);
    }

    running.process.kill('SIGTERM');

    // Give it a moment to terminate gracefully, then force kill
    setTimeout(() => {
      if (this.runningJobs.has(jobId)) {
        running.process.kill('SIGKILL');
      }
    }, 5000);
  }

  /**
   * List all jobs
   */
  listJobs(worktreePath?: string): Job[] {
    return this.db.listJobs(worktreePath);
  }

  /**
   * Get job runs
   */
  getJobRuns(jobId: number, limit?: number): JobRun[] {
    return this.db.getJobRuns(jobId, limit);
  }

  /**
   * Schedule a job with cron
   */
  private scheduleJob(job: Job): void {
    if (!job.cron) return;

    // Validate cron expression
    if (!cron.validate(job.cron)) {
      console.error(`Invalid cron expression for job ${job.id}: ${job.cron}`);
      return;
    }

    const task = cron.schedule(job.cron, async () => {
      try {
        await this.executeJob(job);
      } catch (error) {
        console.error(`Error executing scheduled job ${job.id}:`, error);
      }
    });

    this.scheduledTasks.set(job.id, task);

    // Calculate next run time
    // node-cron doesn't expose next run time directly, but we can estimate
    // For now, we'll update it after each run
  }

  /**
   * Execute a job
   */
  private executeJob(job: Job): Promise<JobRun> {
    return new Promise((resolve, reject) => {
      // Create job run record
      const run = this.db.createJobRun(job.id);

      // Update job status
      this.db.updateJob(job.id, { status: 'running' });

      // Parse command
      const [cmd, ...args] = this.parseCommand(job.command);

      // Spawn process
      const childProcess = spawn(cmd, args, {
        cwd: job.worktreePath,
        shell: true,
        env: {
          ...globalThis.process.env,
          FORCE_COLOR: '1',
          TERM: 'xterm-256color',
        },
      });

      const running: RunningJob = {
        process: childProcess,
        run,
        stdout: '',
        stderr: '',
      };

      this.runningJobs.set(job.id, running);

      // Emit status change
      this.emit('statusChange', { job: this.db.getJob(job.id), run });

      // Collect output
      childProcess.stdout?.on('data', (data: Buffer) => {
        running.stdout += data.toString();
        // Update run periodically (not on every chunk to avoid DB pressure)
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        running.stderr += data.toString();
      });

      childProcess.on('close', (exitCode: number | null, signal: NodeJS.Signals | null) => {
        this.runningJobs.delete(job.id);

        const status = exitCode === 0 ? 'success' : 'failed';

        // Update job run
        const updatedRun = this.db.updateJobRun(run.id, {
          stdout: running.stdout,
          stderr: running.stderr,
          exitCode: exitCode ?? -1,
          status,
        });

        // Update job
        const updatedJob = this.db.updateJob(job.id, {
          status: job.cron ? 'scheduled' : status,
          lastRun: new Date(),
        });

        // Emit status change
        this.emit('statusChange', { job: updatedJob, run: updatedRun });

        resolve(updatedRun);
      });

      childProcess.on('error', (error: Error) => {
        this.runningJobs.delete(job.id);

        const updatedRun = this.db.updateJobRun(run.id, {
          stderr: running.stderr + '\n' + error.message,
          exitCode: -1,
          status: 'failed',
        });

        const updatedJob = this.db.updateJob(job.id, {
          status: job.cron ? 'scheduled' : 'failed',
          lastRun: new Date(),
        });

        this.emit('statusChange', { job: updatedJob, run: updatedRun });

        reject(error);
      });
    });
  }

  /**
   * Parse a command string into command and arguments
   */
  private parseCommand(command: string): string[] {
    // Simple parsing - split on spaces, respecting quotes
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (const char of command) {
      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuote) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }
}
