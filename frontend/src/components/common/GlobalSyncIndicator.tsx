import React from 'react';
import { CheckCircle2, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { GlobalSyncStatus } from '../../lib/sync/syncEngine';

interface GlobalSyncIndicatorProps {
  status: GlobalSyncStatus;
  pendingCount?: number;
  compact?: boolean;
}

export const GlobalSyncIndicator: React.FC<GlobalSyncIndicatorProps> = ({
  status,
  pendingCount = 0,
  compact = false,
}) => {
  if (status === 'SAVED') {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {!compact && <span>Saved to Server</span>}
      </div>
    );
  }

  if (status === 'SYNCING') {
    return (
      <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>{compact ? `${pendingCount}` : `Syncing (${pendingCount})...`}</span>
      </div>
    );
  }

  if (status === 'OFFLINE') {
    return (
      <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[11px] bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg animate-pulse">
        <WifiOff className="w-3.5 h-3.5" />
        <span>{compact ? 'Offline' : 'Offline (Paused)'}</span>
      </div>
    );
  }

  if (status === 'DEGRADED') {
    return (
      <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[11px] bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Retrying Sync...</span>
      </div>
    );
  }

  // ERROR
  return (
    <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[11px] bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 rounded-lg">
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>Sync Error</span>
    </div>
  );
};
