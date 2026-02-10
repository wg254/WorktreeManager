import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useStore } from '../../store';
import { api } from '../../lib/ipc-client';
import type { TerminalSession } from '../../../shared/types';

interface TerminalProps {
  worktreePath: string;
}

export function Terminal({ worktreePath }: TerminalProps) {
  const { terminals, activeTerminal, addTerminal, removeTerminal, setActiveTerminal } = useStore();
  const terminalRefs = useRef<Map<string, { xterm: XTerm; fitAddon: FitAddon }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const creatingRef = useRef(false); // Prevent infinite loop

  // Filter terminals for current worktree
  const worktreeTerminals = Array.from(terminals.values()).filter(
    (t) => t.worktreePath === worktreePath
  );

  // Create a new terminal
  const createTerminal = async () => {
    if (!containerRef.current) {
      console.log('Container ref not ready');
      return;
    }

    if (creatingRef.current) {
      console.log('Already creating terminal, skipping');
      return;
    }

    creatingRef.current = true;
    console.log('Creating terminal for worktree:', worktreePath);

    try {
      const xterm = new XTerm({
        theme: {
          background: '#1e1e1e',
          foreground: '#e0e0e0',
          cursor: '#ffffff',
          cursorAccent: '#1e1e1e',
          selectionBackground: '#094771',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        },
        fontFamily: "'SF Mono', Monaco, 'Courier New', monospace",
        fontSize: 13,
        lineHeight: 1.2,
        cursorBlink: true,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);

      // Create PTY session
      console.log('Creating PTY session...');
      const session = await api.pty.create(worktreePath, 80, 24);
      console.log('PTY session created:', session);

      // Store refs BEFORE adding to store
      terminalRefs.current.set(session.id, { xterm, fitAddon });

      // Set up data handler
      xterm.onData((data) => {
        api.pty.write(session.id, data);
      });

      // Add to store (this will trigger the mount effect)
      addTerminal(session);

      return session;
    } catch (error) {
      console.error('Failed to create terminal:', error);
      return null;
    } finally {
      creatingRef.current = false;
    }
  };

  // Set up PTY data listener
  useEffect(() => {
    const unsubscribe = api.pty.onData(({ sessionId, data }) => {
      const ref = terminalRefs.current.get(sessionId);
      if (ref) {
        ref.xterm.write(data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Mount/unmount active terminal
  useEffect(() => {
    if (!activeTerminal || !containerRef.current) return;

    const ref = terminalRefs.current.get(activeTerminal);
    if (!ref) {
      console.log('Terminal ref not found for:', activeTerminal);
      return;
    }

    // Clear container and mount terminal
    const terminalView = containerRef.current.querySelector('.terminal-view');
    if (terminalView) {
      console.log('Mounting terminal to view');
      terminalView.innerHTML = '';
      ref.xterm.open(terminalView as HTMLElement);

      // Delay fit to ensure DOM is ready
      setTimeout(() => {
        try {
          ref.fitAddon.fit();
          // Resize PTY to match
          api.pty.resize(activeTerminal, ref.xterm.cols, ref.xterm.rows);
        } catch (e) {
          console.error('Fit error:', e);
        }
      }, 50);

      ref.xterm.focus();
    } else {
      console.log('Terminal view element not found');
    }
  }, [activeTerminal, terminals]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!activeTerminal) return;
      const ref = terminalRefs.current.get(activeTerminal);
      if (ref) {
        ref.fitAddon.fit();
        api.pty.resize(activeTerminal, ref.xterm.cols, ref.xterm.rows);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTerminal]);

  // Reset creation flag when worktree changes
  useEffect(() => {
    creatingRef.current = false;
  }, [worktreePath]);

  // Create initial terminal if none exist
  useEffect(() => {
    if (worktreeTerminals.length === 0 && containerRef.current && !creatingRef.current) {
      createTerminal();
    }
  }, [worktreePath]);

  // Cleanup terminals on unmount
  useEffect(() => {
    return () => {
      for (const [id, ref] of terminalRefs.current) {
        ref.xterm.dispose();
        api.pty.destroy(id);
      }
      terminalRefs.current.clear();
    };
  }, []);

  const handleCloseTerminal = async (sessionId: string) => {
    const ref = terminalRefs.current.get(sessionId);
    if (ref) {
      ref.xterm.dispose();
      terminalRefs.current.delete(sessionId);
    }
    await api.pty.destroy(sessionId);
    removeTerminal(sessionId);
  };

  return (
    <div className="terminal-container" ref={containerRef}>
      <div className="terminal-tabs">
        {worktreeTerminals.map((session, index) => (
          <button
            key={session.id}
            className={`terminal-tab ${activeTerminal === session.id ? 'active' : ''}`}
            onClick={() => setActiveTerminal(session.id)}
          >
            Terminal {index + 1}
            <span
              className="close"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTerminal(session.id);
              }}
            >
              ×
            </span>
          </button>
        ))}
        <button className="new-terminal" onClick={createTerminal}>
          + New
        </button>
      </div>
      <div className="terminal-view" />
    </div>
  );
}
