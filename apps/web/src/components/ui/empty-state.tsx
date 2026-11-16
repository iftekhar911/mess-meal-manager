import React from 'react';
import { Card } from './card';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Reusable empty state display primitive.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  className
}) => {
  return (
    <Card className={`text-center py-10 px-4 space-y-3 ${className || ''}`}>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-md mx-auto">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </Card>
  );
};
