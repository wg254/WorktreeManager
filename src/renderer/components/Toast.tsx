import React, { useEffect, useState } from 'react';
import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 5000) => {
    const id = ++toastId;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Convenience functions
export const toast = {
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'info', duration),
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'success', duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'warning', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'error', duration ?? 8000),
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(onDismiss, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onDismiss]);

  const colors = {
    info: { bg: '#1976d2', border: '#1565c0' },
    success: { bg: '#2e7d32', border: '#1b5e20' },
    warning: { bg: '#f57c00', border: '#e65100' },
    error: { bg: '#c62828', border: '#b71c1c' },
  };

  const { bg, border } = colors[toast.type];

  return (
    <div
      style={{
        background: bg,
        borderLeft: `4px solid ${border}`,
        padding: '12px 16px',
        borderRadius: '4px',
        marginBottom: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      <span style={{ color: 'white', fontSize: '13px' }}>{toast.message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.7)',
          cursor: 'pointer',
          padding: '0 0 0 12px',
          fontSize: '18px',
        }}
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        maxWidth: '400px',
      }}
    >
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={() => removeToast(t.id)}
        />
      ))}
    </div>
  );
}
