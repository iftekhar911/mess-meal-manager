'use client';

import React, { useEffect } from 'react';
import { clsx } from 'clsx';

export interface ToastProps {
  message: string;
  variant?: 'success' | 'danger' | 'info';
  isOpen: boolean;
  onClose: () => void;
  durationMs?: number;
}

/**
 * Ephemeral notification toast primitive.
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  isOpen,
  onClose,
  durationMs = 3500
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [isOpen, onClose, durationMs]);

  if (!isOpen) return null;

  const styles = {
    success: 'bg-success text-white border-success',
    danger: 'bg-danger text-white border-danger',
    info: 'bg-surface-elevated text-text-primary border-border-strong'
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-token border shadow-lg text-sm font-medium',
        styles[variant]
      )}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="text-xs opacity-80 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
};
