import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const baseStyles = 'animate-shimmer rounded-xl bg-[#231a14]/80 border border-[#38281e]/60';

  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
    card: 'h-32 w-full rounded-2xl',
  };

  const customStyle: React.CSSProperties = {
    ...style,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={customStyle}
      {...props}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Hero Banner Skeleton */}
      <div className="h-48 assess-surface rounded-3xl p-8 space-y-4 border border-[#4e382b]">
        <Skeleton variant="text" width="140px" height="24px" className="rounded-full" />
        <Skeleton variant="text" width="60%" height="32px" />
        <Skeleton variant="text" width="40%" height="16px" />
        <div className="flex gap-3 pt-2">
          <Skeleton variant="rectangular" width="130px" height="40px" />
          <Skeleton variant="rectangular" width="130px" height="40px" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="assess-surface rounded-2xl p-5 space-y-3 border border-[#38281e]">
            <div className="flex justify-between items-center">
              <Skeleton variant="text" width="80px" height="12px" />
              <Skeleton variant="circular" width="32px" height="32px" />
            </div>
            <Skeleton variant="text" width="90px" height="36px" />
            <Skeleton variant="text" width="120px" height="12px" />
          </div>
        ))}
      </div>

      {/* Analytics & Recent Activity Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="assess-surface rounded-2xl p-6 space-y-4 border border-[#38281e]">
          <Skeleton variant="text" width="120px" height="18px" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton variant="text" width="100%" height="14px" />
                <Skeleton variant="rectangular" width="100%" height="8px" className="rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 assess-surface rounded-2xl p-6 space-y-4 border border-[#38281e]">
          <div className="flex justify-between items-center pb-3 border-b border-[#38281e]">
            <Skeleton variant="text" width="140px" height="18px" />
            <Skeleton variant="text" width="80px" height="14px" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="p-3 bg-[#110c09] rounded-xl flex justify-between items-center border border-[#38281e]/50">
                <div className="space-y-1.5 w-1/2">
                  <Skeleton variant="text" width="80%" height="14px" />
                  <Skeleton variant="text" width="50%" height="10px" />
                </div>
                <Skeleton variant="rectangular" width="70px" height="28px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
