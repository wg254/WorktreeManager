import React, { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { oneDark } from '@codemirror/theme-one-dark';
import { useStore } from '../../store';
import { api } from '../../lib/ipc-client';
import { toast } from '../Toast';

export function Editor() {
  const { openFile, setOpenFile, unsavedChanges, setUnsavedChanges } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Get language extension based on file extension
  const getLanguageExtension = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return javascript({ jsx: true });
      case 'ts':
      case 'tsx':
        return javascript({ jsx: true, typescript: true });
      case 'json':
        return json();
      case 'md':
        return markdown();
      case 'html':
        return html();
      case 'css':
        return css();
      case 'py':
        return python();
      case 'rs':
        return rust();
      default:
        return javascript();
    }
  };

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current || !openFile) return;

    // Clean up previous editor
    if (editorRef.current) {
      editorRef.current.destroy();
    }

    const langExtension = getLanguageExtension(openFile.path);

    const state = EditorState.create({
      doc: openFile.content,
      extensions: [
        basicSetup,
        langExtension,
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setUnsavedChanges(true);
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
          },
          '.cm-scroller': {
            fontFamily: "'SF Mono', Monaco, 'Courier New', monospace",
            fontSize: '13px',
          },
        }),
      ],
    });

    editorRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [openFile?.path]);

  // Update editor content when openFile changes
  useEffect(() => {
    if (!editorRef.current || !openFile) return;

    const currentDoc = editorRef.current.state.doc.toString();
    if (currentDoc !== openFile.content) {
      editorRef.current.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: openFile.content,
        },
      });
    }
  }, [openFile?.content]);

  const handleSave = async () => {
    if (!openFile || !editorRef.current) return;

    setIsSaving(true);
    try {
      const content = editorRef.current.state.doc.toString();
      await api.file.write(openFile.path, content);
      setUnsavedChanges(false);
      // Update stored content
      setOpenFile({ ...openFile, content });
      toast.success('File saved');
    } catch (error: any) {
      console.error('Failed to save file:', error);
      toast.error(`Failed to save: ${error?.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (unsavedChanges) {
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }
    setOpenFile(null);
  };

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openFile]);

  if (!openFile) {
    return (
      <div className="editor-container">
        <div className="editor-empty">
          Open a file from the Diff view to edit
        </div>
      </div>
    );
  }

  const fileName = openFile.path.split('/').pop();

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="file-path">
          {fileName}
          {unsavedChanges && <span className="unsaved">*</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!unsavedChanges || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="save-btn"
            style={{ background: '#3c3c3c' }}
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
      <div className="editor-view" ref={containerRef} />
    </div>
  );
}
