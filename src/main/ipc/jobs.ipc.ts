import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-types';
import type { JobScheduler } from '../services/job-scheduler';

export function registerJobHandlers(
  jobScheduler: JobScheduler,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(IPC_CHANNELS.JOB_CREATE, async (_event, { worktreePath, name, command, cron }) => {
    return jobScheduler.createJob(worktreePath, name, command, cron);
  });

  ipcMain.handle(IPC_CHANNELS.JOB_DELETE, async (_event, { jobId }) => {
    jobScheduler.deleteJob(jobId);
  });

  ipcMain.handle(IPC_CHANNELS.JOB_RUN, async (_event, { jobId }) => {
    return jobScheduler.runJob(jobId);
  });

  ipcMain.handle(IPC_CHANNELS.JOB_STOP, async (_event, { jobId }) => {
    jobScheduler.stopJob(jobId);
  });

  ipcMain.handle(IPC_CHANNELS.JOB_LIST, async (_event, { worktreePath }) => {
    return jobScheduler.listJobs(worktreePath);
  });

  ipcMain.handle(IPC_CHANNELS.JOB_GET_RUNS, async (_event, { jobId, limit }) => {
    return jobScheduler.getJobRuns(jobId, limit);
  });
}
