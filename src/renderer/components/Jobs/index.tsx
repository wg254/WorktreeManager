import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../lib/ipc-client';
import { toast } from '../Toast';
import type { Job, JobRun } from '../../../shared/types';

interface JobsProps {
  worktreePath: string;
}

export function Jobs({ worktreePath }: JobsProps) {
  const { jobs, setJobs, updateJob, selectedJob, selectJob, jobRuns, setJobRuns } = useStore();
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [newJob, setNewJob] = useState({ name: '', command: '', cron: '' });
  const [isCreating, setIsCreating] = useState(false);

  // Load jobs
  useEffect(() => {
    const loadJobs = async () => {
      const jobList = await api.job.list(worktreePath);
      setJobs(jobList);
    };

    loadJobs();

    // Listen for job status changes
    const unsubscribe = api.job.onStatusChange(({ job, run }) => {
      updateJob(job);
      if (run && job.id === selectedJob) {
        loadJobRuns(job.id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [worktreePath]);

  // Load job runs when selected job changes
  useEffect(() => {
    if (selectedJob) {
      loadJobRuns(selectedJob);
    }
  }, [selectedJob]);

  const loadJobRuns = async (jobId: number) => {
    const runs = await api.job.getRuns(jobId, 10);
    setJobRuns(jobId, runs);
  };

  const handleCreateJob = async () => {
    if (!newJob.name || !newJob.command) return;

    setIsCreating(true);
    try {
      const job = await api.job.create(
        worktreePath,
        newJob.name,
        newJob.command,
        newJob.cron || undefined
      );
      setJobs([job, ...jobs]);
      setShowNewJobForm(false);
      setNewJob({ name: '', command: '', cron: '' });
    } catch (error: any) {
      console.error('Failed to create job:', error);
      toast.error(`Failed to create job: ${error?.message || error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunJob = async (jobId: number) => {
    try {
      await api.job.run(jobId);
      toast.success('Job started');
    } catch (error: any) {
      console.error('Failed to run job:', error);
      toast.error(`Failed to run job: ${error?.message || error}`);
    }
  };

  const handleStopJob = async (jobId: number) => {
    try {
      await api.job.stop(jobId);
    } catch (error) {
      console.error('Failed to stop job:', error);
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      await api.job.delete(jobId);
      setJobs(jobs.filter((j) => j.id !== jobId));
      if (selectedJob === jobId) {
        selectJob(null);
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const selectedJobData = jobs.find((j) => j.id === selectedJob);
  const selectedJobRuns = selectedJob ? jobRuns.get(selectedJob) || [] : [];

  return (
    <div className="jobs-container">
      <div className="jobs-header">
        <h2>Jobs</h2>
        <button className="new-job-btn" onClick={() => setShowNewJobForm(true)}>
          + New Job
        </button>
      </div>

      <div className="jobs-content">
        <div className="jobs-list">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`job-item ${selectedJob === job.id ? 'selected' : ''}`}
              onClick={() => selectJob(job.id)}
            >
              <div className="job-name">{job.name}</div>
              <div className="job-command">{job.command}</div>
              <div className="job-meta">
                <span className={`job-status ${job.status}`}>{job.status}</span>
                {job.cron && <span className="job-cron">{job.cron}</span>}
              </div>
            </div>
          ))}

          {jobs.length === 0 && (
            <div style={{ padding: '20px', color: '#808080', textAlign: 'center' }}>
              No jobs yet
            </div>
          )}
        </div>

        <div className="job-detail">
          {selectedJobData ? (
            <>
              <h3>{selectedJobData.name}</h3>

              <div className="job-info">
                <p>
                  <label>Command:</label>
                  <code>{selectedJobData.command}</code>
                </p>
                {selectedJobData.cron && (
                  <p>
                    <label>Schedule:</label>
                    {selectedJobData.cron}
                  </p>
                )}
                <p>
                  <label>Status:</label>
                  <span className={`job-status ${selectedJobData.status}`}>
                    {selectedJobData.status}
                  </span>
                </p>
                {selectedJobData.lastRun && (
                  <p>
                    <label>Last Run:</label>
                    {new Date(selectedJobData.lastRun).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="job-actions">
                {selectedJobData.status !== 'running' ? (
                  <button className="run-btn" onClick={() => handleRunJob(selectedJobData.id)}>
                    Run Now
                  </button>
                ) : (
                  <button className="stop-btn" onClick={() => handleStopJob(selectedJobData.id)}>
                    Stop
                  </button>
                )}
                <button className="delete-btn" onClick={() => handleDeleteJob(selectedJobData.id)}>
                  Delete
                </button>
              </div>

              <div className="job-runs">
                <h4>Recent Runs</h4>
                {selectedJobRuns.map((run) => (
                  <JobRunView key={run.id} run={run} />
                ))}
                {selectedJobRuns.length === 0 && (
                  <div style={{ color: '#808080', fontSize: '12px' }}>No runs yet</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ color: '#808080', textAlign: 'center', marginTop: '40px' }}>
              Select a job to view details
            </div>
          )}
        </div>
      </div>

      {showNewJobForm && (
        <div className="new-job-form">
          <div className="form-content">
            <h3>Create Job</h3>

            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={newJob.name}
                onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                placeholder="Run tests"
              />
            </div>

            <div className="form-group">
              <label>Command</label>
              <input
                type="text"
                value={newJob.command}
                onChange={(e) => setNewJob({ ...newJob, command: e.target.value })}
                placeholder="npm test"
              />
            </div>

            <div className="form-group">
              <label>Cron Schedule (optional)</label>
              <input
                type="text"
                value={newJob.cron}
                onChange={(e) => setNewJob({ ...newJob, cron: e.target.value })}
                placeholder="0 * * * * (every hour)"
              />
            </div>

            <div className="form-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowNewJobForm(false)}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={handleCreateJob}
                disabled={isCreating || !newJob.name || !newJob.command}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobRunView({ run }: { run: JobRun }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="job-run-item">
      <div className="run-header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <span>
          {new Date(run.startedAt).toLocaleString()}
          {run.finishedAt && ` (${Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s)`}
        </span>
        <span className={`job-status ${run.status}`}>
          {run.status}
          {run.exitCode !== undefined && ` (exit ${run.exitCode})`}
        </span>
      </div>

      {expanded && (
        <>
          {run.stdout && (
            <div className="run-output">{run.stdout}</div>
          )}
          {run.stderr && (
            <div className="run-output stderr">{run.stderr}</div>
          )}
          {!run.stdout && !run.stderr && (
            <div className="run-output" style={{ color: '#808080' }}>No output</div>
          )}
        </>
      )}
    </div>
  );
}
