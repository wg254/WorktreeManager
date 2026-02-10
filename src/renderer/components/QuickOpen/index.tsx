import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useStore } from '../../store';
import { api } from '../../lib/ipc-client';
import './QuickOpen.css';

interface QuickOpenProps {
  onSelectFile: (filePath: string) => void;
}

export function QuickOpen({ onSelectFile }: QuickOpenProps) {
  const { quickOpenVisible, setQuickOpenVisible, selectedWorktree } = useStore();
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load files when opened
  useEffect(() => {
    if (quickOpenVisible && selectedWorktree) {
      setLoading(true);
      setQuery('');
      setSelectedIndex(0);
      api.file.list(selectedWorktree).then((fileList) => {
        setFiles(fileList);
        setLoading(false);
      });
    }
  }, [quickOpenVisible, selectedWorktree]);

  // Focus input when opened
  useEffect(() => {
    if (quickOpenVisible) {
      inputRef.current?.focus();
    }
  }, [quickOpenVisible]);

  // Create fuzzy search instance
  const fuse = useMemo(() => {
    return new Fuse(files, {
      threshold: 0.4,
      distance: 100,
      includeScore: true,
    });
  }, [files]);

  // Filter files based on query
  const filteredFiles = useMemo(() => {
    if (!query.trim()) {
      return files.slice(0, 50);
    }
    return fuse.search(query).slice(0, 50).map((result) => result.item);
  }, [fuse, query, files]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredFiles.length) {
      setSelectedIndex(Math.max(0, filteredFiles.length - 1));
    }
  }, [filteredFiles.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('.quick-open-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleClose = useCallback(() => {
    setQuickOpenVisible(false);
    setQuery('');
    setSelectedIndex(0);
  }, [setQuickOpenVisible]);

  const handleSelect = useCallback(
    (filePath: string) => {
      if (selectedWorktree) {
        onSelectFile(`${selectedWorktree}/${filePath}`);
        handleClose();
      }
    },
    [selectedWorktree, onSelectFile, handleClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredFiles.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredFiles[selectedIndex]) {
            handleSelect(filteredFiles[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    },
    [filteredFiles, selectedIndex, handleSelect, handleClose]
  );

  if (!quickOpenVisible) {
    return null;
  }

  return (
    <div className="quick-open-overlay" onClick={handleClose}>
      <div className="quick-open-modal" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="quick-open-input"
          placeholder="Search files..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="quick-open-list" ref={listRef}>
          {loading ? (
            <div className="quick-open-loading">Loading files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="quick-open-empty">No files found</div>
          ) : (
            filteredFiles.map((file, index) => (
              <div
                key={file}
                className={`quick-open-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(file)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="quick-open-filename">{file.split('/').pop()}</span>
                <span className="quick-open-path">{file}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
