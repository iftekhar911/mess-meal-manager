import React from 'react';
import { clsx } from 'clsx';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  name: string;
  label?: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Accessible radio group primitive with unified border radius token.
 */
export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  label,
  value,
  options,
  onChange,
  className
}) => {
  return (
    <fieldset className={clsx('space-y-2', className)}>
      {label && <legend className="text-sm font-medium text-text-primary mb-1">{label}</legend>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={clsx(
                'inline-flex items-center gap-2 min-h-[44px] px-4 rounded-token border text-sm font-medium cursor-pointer transition-colors',
                isSelected
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-border text-text-primary hover:bg-surface-elevated'
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
