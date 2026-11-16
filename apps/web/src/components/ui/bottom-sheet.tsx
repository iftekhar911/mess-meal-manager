'use client';

import React, { useEffect } from 'react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Mobile-first bottom sheet primitive for actions and forms on small viewports.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-lg bg-surface border-t border-border rounded-t-token p-4 shadow-lg animate-in slide-in-from-bottom duration-200">
        <div className="w-10 h-1.5 bg-border-strong rounded-token mx-auto mb-3" />
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
          <h3 className="text-base font-bold text-text-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 inline-flex items-center justify-center rounded-token text-text-muted hover:bg-surface-elevated"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
