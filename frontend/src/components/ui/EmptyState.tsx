import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="assess-surface rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-5 border border-[#38281e]">
      <div className="w-14 h-14 rounded-2xl bg-[#c89666]/15 border border-[#c89666]/30 text-[#d4a373] flex items-center justify-center mx-auto shadow-inner">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-[#faf4ee] tracking-tight uppercase tracking-wider">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-[#cbb8a9] leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>
      {(primaryActionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {primaryActionLabel && onPrimaryAction && (
            <Button size="sm" variant="primary" onClick={onPrimaryAction}>
              {primaryActionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button size="sm" variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
