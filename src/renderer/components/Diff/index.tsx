import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { api } from '../../lib/ipc-client';
import type { DiffFile, DiffHunk } from '../../../shared/types';

interface DiffViewProps {
  worktreePath: string;
}

export function DiffView({ worktreePath }: DiffViewProps) {
  const { currentDiff, setDiff, diffMode, setDiffMode, compareRef, setCompareRef, setOpenFile, setActiveView } = useStore();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [compareInput, setCompareInput] = useState('');

  const loadDiff = async () => {
    setIsLoading(true);
    try {
      let diff;
      if (diffMode === 'staged') {
        diff = await api.git.getStagedDiff(worktreePath);
      } else if (diffMode === 'compare' && compareRef) {
        diff = await api.git.getDiff(worktreePath, compareRef);
      } else {
        diff = await api.git.getDiff(worktreePath);
      }
      setDiff(diff);

      // Select first file if any
      if (diff.files.length > 0 && !selectedFile) {
        setSelectedFile(diff.files[0].path);
      }
    } catch (error) {
      console.error('Failed to load diff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiff();
  }, [worktreePath, diffMode, compareRef]);

  const handleCompare = () => {
    setCompareRef(compareInput);
    setDiffMode('compare');
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      const fullPath = `${worktreePath}/${filePath}`;
      const content = await api.file.read(fullPath);
      setOpenFile({ path: fullPath, content });
      setActiveView('editor');
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handleStageFile = async (filePath: string) => {
    try {
      await api.git.stageFile(worktreePath, filePath);
      loadDiff();
    } catch (error) {
      console.error('Failed to stage file:', error);
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    try {
      await api.git.unstageFile(worktreePath, filePath);
      loadDiff();
    } catch (error) {
      console.error('Failed to unstage file:', error);
    }
  };

  const selectedFileData = currentDiff?.files.find((f) => f.path === selectedFile);

  return (
    <div className="diff-container">
      <div className="diff-toolbar">
        <div className="mode-toggle">
          <button
            className={diffMode === 'unstaged' ? 'active' : ''}
            onClick={() => setDiffMode('unstaged')}
          >
            Unstaged
          </button>
          <button
            className={diffMode === 'staged' ? 'active' : ''}
            onClick={() => setDiffMode('staged')}
          >
            Staged
          </button>
          <button
            className={diffMode === 'compare' ? 'active' : ''}
            onClick={() => setDiffMode('compare')}
          >
            Compare
          </button>
        </div>

        {diffMode === 'compare' && (
          <>
            <input
              type="text"
              className="compare-input"
              placeholder="Branch or ref..."
              value={compareInput}
              onChange={(e) => setCompareInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
            />
            <button className="refresh-btn" onClick={handleCompare}>
              Compare
            </button>
          </>
        )}

        <button className="refresh-btn" onClick={loadDiff} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {currentDiff && (
        <div className="diff-stats">
          <span>{currentDiff.stats.filesChanged} files changed</span>
          <span className="insertions">+{currentDiff.stats.insertions}</span>
          <span className="deletions">-{currentDiff.stats.deletions}</span>
        </div>
      )}

      <div className="diff-content">
        <div className="diff-file-list">
          {currentDiff?.files.map((file) => (
            <div
              key={file.path}
              className={`diff-file-item ${selectedFile === file.path ? 'selected' : ''}`}
              onClick={() => setSelectedFile(file.path)}
            >
              <div className="file-path">{file.path}</div>
              <div className={`file-status ${file.status}`}>
                {file.status === 'renamed'
                  ? `renamed from ${file.oldPath}`
                  : file.status}
              </div>
              <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                <button
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: '#2e7d32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFile(file.path);
                  }}
                >
                  Edit
                </button>
                {diffMode === 'unstaged' && (
                  <button
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStageFile(file.path);
                    }}
                  >
                    Stage
                  </button>
                )}
                {diffMode === 'staged' && (
                  <button
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: '#f57c00',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnstageFile(file.path);
                    }}
                  >
                    Unstage
                  </button>
                )}
              </div>
            </div>
          ))}

          {(!currentDiff || currentDiff.files.length === 0) && (
            <div style={{ padding: '20px', color: '#808080', textAlign: 'center' }}>
              No changes
            </div>
          )}
        </div>

        <div className="diff-hunks">
          {selectedFileData?.binary ? (
            <div style={{ color: '#808080' }}>Binary file</div>
          ) : (
            selectedFileData?.hunks.map((hunk, index) => (
              <DiffHunkView key={index} hunk={hunk} />
            ))
          )}

          {!selectedFileData && (
            <div style={{ color: '#808080', textAlign: 'center', marginTop: '40px' }}>
              Select a file to view diff
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffHunkView({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className="diff-hunk">
      <div className="diff-hunk-header">{hunk.header}</div>
      {hunk.lines.map((line, index) => (
        <div key={index} className={`diff-line ${line.type}`}>
          <span className="diff-line-number">
            {line.type === 'delete' ? line.oldLineNumber : line.type === 'add' ? '' : line.oldLineNumber}
          </span>
          <span className="diff-line-number">
            {line.type === 'add' ? line.newLineNumber : line.type === 'delete' ? '' : line.newLineNumber}
          </span>
          <span>{line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}</span>
          {line.content}
        </div>
      ))}
    </div>
  );
}
