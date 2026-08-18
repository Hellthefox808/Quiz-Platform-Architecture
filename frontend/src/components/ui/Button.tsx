import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wider uppercase transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none rounded-xl';

  const sizeStyles = {
    sm: 'text-[10px] px-3 py-1.5 gap-1.5',
    md: 'text-xs px-4 py-2.5 gap-2',
    lg: 'text-sm px-6 py-3 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-[#b07238] to-[#d4a373] hover:from-[#c89666] hover:to-[#dfb58a] active:from-[#965520] active:to-[#b07238] text-white font-extrabold shadow-md shadow-[#b07238]/20 border border-[#b07238]/30',
    secondary: 'bg-[#ede4d8] hover:bg-[#e4d7c7] active:bg-[#dccebd] text-[#1c130d] border border-[#d8ccbf] shadow-sm',
    outline: 'bg-transparent hover:bg-[#ede4d8] text-[#b46927] hover:text-[#1c130d] border border-[#d8ccbf]',
    danger: 'bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 shadow-sm',
    ghost: 'bg-transparent hover:bg-[#ede4d8]/70 text-[#5c4738] hover:text-[#1c130d] border border-transparent',
    glass: 'bg-white/80 hover:bg-white active:bg-white/90 backdrop-blur-md text-[#1c130d] border border-[#e8dfd5] shadow-sm',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
