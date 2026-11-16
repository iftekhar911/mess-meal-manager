import React from 'react';
import { clsx } from 'clsx';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible toggle switch primitive for binary preferences.
 */
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'inline-flex items-center gap-3 min-h-[44px] focus:outline-none disabled:opacity-50',
        className
      )}
    >
      <span
        className={clsx(
          'relative inline-flex h-6 w-11 items-center rounded-token transition-colors border',
          checked ? 'bg-primary border-primary' : 'bg-surface-elevated border-border-strong'
        )}
      >
        <span
          className={clsx(
            'inline-block h-4 w-4 transform rounded-token bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </span>
      {label && <span className="text-sm font-medium text-text-primary">{label}</span>}
    </button>
  );
};
