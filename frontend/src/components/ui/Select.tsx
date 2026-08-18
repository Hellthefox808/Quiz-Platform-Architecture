import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5c4738]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full appearance-none bg-white border text-[#1c130d] text-xs sm:text-sm rounded-xl px-4 py-2.5 pr-10 transition focus:outline-none focus:ring-1 cursor-pointer ${
              error
                ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500 text-rose-600'
                : 'border-[#e8dfd5] focus:border-[#b46927] focus:ring-[#b46927]'
            } ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-[#1c130d]">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8a7465] pointer-events-none">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="text-[10px] text-[#8a7465]">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
