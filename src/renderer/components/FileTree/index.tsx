import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { api } from '../../lib/ipc-client';
import { TreeNode } from './TreeNode';
import type { FileEntry } from '../../../shared/types';
import './FileTree.css';

interface FileTreeProps {
  worktreePath: string;
  onSelectFile: (filePath: string) => void;
}

export function FileTree({ worktreePath, onSelectFile }: FileTreeProps) {
  const { setRightPanelVisible } = useStore();
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (worktreePath) {
      setLoading(true);
      api.file.readDir(worktreePath).then((entries) => {
        setRootEntries(entries);
        setLoading(false);
      });
    }
  }, [worktreePath]);

  const handleClose = () => {
    setRightPanelVisible(false);
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <h3>Files</h3>
        <button className="file-tree-close" onClick={handleClose} title="Close panel">
          &times;
        </button>
      </div>
      <div className="file-tree-content">
        {loading ? (
          <div className="file-tree-loading">Loading...</div>
        ) : rootEntries.length === 0 ? (
          <div className="file-tree-empty">No files</div>
        ) : (
          rootEntries.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  );
}
