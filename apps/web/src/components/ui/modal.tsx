'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Accessible modal dialog rendered in a document portal with backdrop and scroll safety.
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={clsx(
          'w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-token p-5 sm:p-6 shadow-xl relative my-auto'
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between pb-3.5 border-b border-border mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-token focus-ring cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>,
    document.body
  );
};
