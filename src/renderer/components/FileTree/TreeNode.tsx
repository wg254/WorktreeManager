import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { api } from '../../lib/ipc-client';
import type { FileEntry } from '../../../shared/types';

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
  onSelectFile: (filePath: string) => void;
}

export function TreeNode({ entry, depth, onSelectFile }: TreeNodeProps) {
  const { expandedPaths, toggleExpandedPath } = useStore();
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const isExpanded = expandedPaths.has(entry.path);

  useEffect(() => {
    if (entry.isDirectory && isExpanded && children.length === 0) {
      setLoading(true);
      api.file.readDir(entry.path).then((entries) => {
        setChildren(entries);
        setLoading(false);
      });
    }
  }, [entry.path, entry.isDirectory, isExpanded, children.length]);

  const handleClick = () => {
    if (entry.isDirectory) {
      toggleExpandedPath(entry.path);
    } else {
      onSelectFile(entry.path);
    }
  };

  const getFileIcon = (name: string, isDir: boolean): string => {
    if (isDir) {
      return isExpanded ? '\u25BC' : '\u25B6';
    }
    // Simple file type icons
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'TS';
      case 'js':
      case 'jsx':
        return 'JS';
      case 'json':
        return '{}';
      case 'css':
        return '#';
      case 'md':
        return 'M';
      case 'html':
        return '<>';
      default:
        return '  ';
    }
  };

  return (
    <div className="tree-node">
      <div
        className={`tree-node-row ${entry.isDirectory ? 'directory' : 'file'}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={handleClick}
      >
        <span className="tree-node-icon">{getFileIcon(entry.name, entry.isDirectory)}</span>
        <span className="tree-node-name">{entry.name}</span>
      </div>
      {entry.isDirectory && isExpanded && (
        <div className="tree-node-children">
          {loading ? (
            <div className="tree-node-loading" style={{ paddingLeft: (depth + 1) * 16 + 8 }}>
              Loading...
            </div>
          ) : (
            children.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onSelectFile={onSelectFile}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
