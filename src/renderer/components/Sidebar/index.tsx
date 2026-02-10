import React, { useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../lib/ipc-client';
import { toast } from '../Toast';
import type { Worktree } from '../../../shared/types';

export function Sidebar() {
  const {
    basePath,
    worktrees,
    worktreeStatuses,
    selectedWorktree,
    selectWorktree,
    setWorktrees,
    terminals,
    removeTerminal,
  } = useStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorktree, setNewWorktree] = useState({ name: '', branch: '', baseBranch: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Worktree | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateWorktree = async () => {
    if (!basePath || !newWorktree.name || !newWorktree.branch) return;

    setIsCreating(true);
    try {
      await api.git.createWorktree(
        basePath,
        newWorktree.name,
        newWorktree.branch,
        newWorktree.baseBranch || undefined
      );

      // Refresh worktree list
      const wts = await api.git.listWorktrees(basePath);
      setWorktrees(wts);

      setShowCreateDialog(false);
      setNewWorktree({ name: '', branch: '', baseBranch: '' });
    } catch (error: any) {
      console.error('Failed to create worktree:', error);
      toast.error(`Failed to create worktree: ${error?.message || error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const getWorktreeDisplayPath = (wt: Worktree) => {
    const parts = wt.path.split('/');
    return parts[parts.length - 1];
  };

  const handleDeleteWorktree = async (force = false) => {
    if (!deleteTarget || !basePath) return;

    setIsDeleting(true);
    try {
      // Close any terminals for this worktree
      const worktreeTerminals = Array.from(terminals.values()).filter(
        (t) => t.worktreePath === deleteTarget.path
      );
      for (const terminal of worktreeTerminals) {
        await api.pty.destroy(terminal.id);
        removeTerminal(terminal.id);
      }

      // Delete the worktree
      await api.git.deleteWorktree(deleteTarget.path, force);

      // Refresh worktree list
      const wts = await api.git.listWorktrees(basePath);
      setWorktrees(wts);

      // Clear selection if deleted worktree was selected
      if (selectedWorktree === deleteTarget.path) {
        selectWorktree(null);
      }

      setDeleteTarget(null);
    } catch (error: any) {
      // If it fails due to changes, offer force delete
      if (error?.message?.includes('contains modified or untracked files') && !force) {
        toast.warning('Worktree has uncommitted changes. Use force delete if you want to proceed.');
      } else {
        console.error('Failed to delete worktree:', error);
        toast.error(`Failed to delete worktree: ${error?.message || error}`);
      }
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeleteWarnings = (wt: Worktree): string[] => {
    const warnings: string[] = [];
    const status = worktreeStatuses.get(wt.path);

    if (status) {
      if (status.staged > 0 || status.unstaged > 0) {
        warnings.push('Has uncommitted changes');
      }
      if (status.untracked > 0) {
        warnings.push('Has untracked files');
      }
    }

    const worktreeTerminals = Array.from(terminals.values()).filter(
      (t) => t.worktreePath === wt.path
    );
    if (worktreeTerminals.length > 0) {
      warnings.push(`${worktreeTerminals.length} open terminal(s) will be closed`);
    }

    return warnings;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>WorktreeManager</h1>
        {basePath && (
          <div className="base-path" title={basePath}>
            {basePath.split('/').slice(-2).join('/')}
          </div>
        )}
      </div>

      <div className="worktree-list">
        {worktrees.map((wt) => {
          const status = worktreeStatuses.get(wt.path);
          const isSelected = selectedWorktree === wt.path;

          return (
            <div
              key={wt.path}
              className={`worktree-item ${isSelected ? 'selected' : ''}`}
              onClick={() => selectWorktree(wt.path)}
            >
              <div className="worktree-header">
                <div className="branch">
                  <span className="icon">{wt.isMain ? '🌳' : '🌿'}</span>
                  {wt.branch}
                </div>
                {!wt.isMain && (
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(wt);
                    }}
                    title="Delete worktree"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="path">{getWorktreeDisplayPath(wt)}</div>

              {status && (
                <div className="status">
                  {status.staged > 0 && (
                    <span className="badge staged">+{status.staged}</span>
                  )}
                  {status.unstaged > 0 && (
                    <span className="badge unstaged">~{status.unstaged}</span>
                  )}
                  {status.untracked > 0 && (
                    <span className="badge untracked">?{status.untracked}</span>
                  )}
                  {status.hasConflicts && (
                    <span className="badge conflicts">!</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button
          className="worktree-item"
          onClick={() => setShowCreateDialog(true)}
          style={{ background: 'transparent', border: '1px dashed #3c3c3c', textAlign: 'center' }}
        >
          + New Worktree
        </button>
      </div>

      {showCreateDialog && (
        <div className="new-job-form">
          <div className="form-content">
            <h3>Create Worktree</h3>

            <div className="form-group">
              <label>Directory Name</label>
              <input
                type="text"
                value={newWorktree.name}
                onChange={(e) => setNewWorktree({ ...newWorktree, name: e.target.value })}
                placeholder="my-feature"
              />
            </div>

            <div className="form-group">
              <label>Branch Name</label>
              <input
                type="text"
                value={newWorktree.branch}
                onChange={(e) => setNewWorktree({ ...newWorktree, branch: e.target.value })}
                placeholder="feat/my-feature"
              />
            </div>

            <div className="form-group">
              <label>Base Branch (optional)</label>
              <input
                type="text"
                value={newWorktree.baseBranch}
                onChange={(e) => setNewWorktree({ ...newWorktree, baseBranch: e.target.value })}
                placeholder="main"
              />
            </div>

            <div className="form-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={handleCreateWorktree}
                disabled={isCreating || !newWorktree.name || !newWorktree.branch}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="new-job-form">
          <div className="form-content">
            <h3>Delete Worktree</h3>

            <p style={{ marginBottom: '16px' }}>
              Are you sure you want to delete <strong>{deleteTarget.branch}</strong>?
            </p>

            <p style={{ fontSize: '12px', color: '#808080', marginBottom: '8px' }}>
              Path: {deleteTarget.path}
            </p>

            {(() => {
              const warnings = getDeleteWarnings(deleteTarget);
              if (warnings.length > 0) {
                return (
                  <div style={{
                    background: 'rgba(255, 152, 0, 0.1)',
                    border: '1px solid #f57c00',
                    borderRadius: '4px',
                    padding: '12px',
                    marginBottom: '16px',
                  }}>
                    <p style={{ fontSize: '12px', color: '#f57c00', marginBottom: '8px' }}>
                      Warning:
                    </p>
                    <ul style={{ fontSize: '12px', color: '#f57c00', margin: 0, paddingLeft: '20px' }}>
                      {warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                );
              }
              return null;
            })()}

            <div className="form-actions">
              <button
                className="cancel-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="create-btn"
                style={{ background: '#c62828' }}
                onClick={() => handleDeleteWorktree(false)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
