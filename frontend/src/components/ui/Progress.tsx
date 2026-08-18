import React from 'react';

export type ProgressVariant = 'coffee' | 'caramel' | 'emerald' | 'amber' | 'rose' | 'gradient' | 'blue';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  variant?: ProgressVariant;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  variant = 'coffee',
  size = 'md',
  showLabel = false,
  className = '',
  ...props
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantStyles = {
    coffee: 'bg-gradient-to-r from-[#7f5539] via-[#c89666] to-[#d4a373]',
    caramel: 'bg-gradient-to-r from-[#c89666] to-[#d4a373]',
    blue: 'bg-gradient-to-r from-[#c89666] to-[#e6ccb2]',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    gradient: 'bg-gradient-to-r from-[#7f5539] via-[#d4a373] to-[#e6ccb2]',
  };

  return (
    <div className={`w-full space-y-1 ${className}`} {...props}>
      {showLabel && (
        <div className="flex justify-between text-xs font-mono font-bold">
          <span className="text-[#cbb8a9]">Progress</span>
          <span className="text-[#faf4ee]">{clamped}%</span>
        </div>
      )}
      <div className={`w-full ${sizeStyles[size]} bg-[#110c09] rounded-full overflow-hidden border border-[#38281e] shadow-inner`}>
        <div
          className={`h-full ${variantStyles[variant]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
