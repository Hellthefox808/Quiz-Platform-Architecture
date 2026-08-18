import React from 'react';

export type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'accent' | 'coffee';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'info',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-bold uppercase tracking-wider rounded-lg border font-mono';

  const sizeStyles = {
    sm: 'text-[9px] px-2 py-0.5 gap-1',
    md: 'text-[10px] px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    info: 'bg-[#b07238]/10 text-[#964f16] border-[#b07238]/25',
    coffee: 'bg-[#7f5539]/10 text-[#5c3a21] border-[#7f5539]/20',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-[#ede4d8] text-[#5c4738] border-[#d8ccbf]',
    accent: 'bg-[#b46927]/15 text-[#964f16] border-[#b46927]/30',
  };

  const dotStyles = {
    info: 'bg-[#b46927]',
    coffee: 'bg-[#7f5539]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    neutral: 'bg-[#8a7465]',
    accent: 'bg-[#b46927]',
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
};
