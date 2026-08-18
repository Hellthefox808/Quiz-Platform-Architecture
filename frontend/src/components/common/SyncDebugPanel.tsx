import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, RefreshCw, Trash2, X, Server } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useBackendConnection } from '../../hooks/useBackendConnection';

export const SyncDebugPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { isConnected: isApiConnected, latencyMs, isChecking, checkConnection } = useBackendConnection(10000);
  const [isOpen, setIsOpen] = useState(false);

  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();
  const fetchingCount = queries.filter((q) => q.state.fetchStatus === 'fetching').length;
  const staleCount = queries.filter((q) => q.isStale()).length;
  const totalQueries = queries.length;

  const handleClearCache = () => {
    queryClient.clear();
  };

  const handleRefetchAll = async () => {
    await checkConnection();
    queryClient.invalidateQueries();
  };

  const isHealthy = isOnline && isApiConnected;

  return (
    <div className="fixed bottom-4 right-4 z-50 text-xs font-mono">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#17110d]/95 hover:bg-[#231a14] text-[#cbb8a9] hover:text-[#faf4ee] border border-[#38281e] rounded-full px-3 py-1.5 shadow-2xl backdrop-blur-md flex items-center gap-2 transition cursor-pointer"
          title="Data Sync Observability Panel"
        >
          <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'}`} />
          <span className="text-[11px] font-bold">Sync Monitor</span>
          {isApiConnected && latencyMs !== null && (
            <span className="text-[10px] text-[#887467]">{latencyMs}ms</span>
          )}
          {fetchingCount > 0 && (
            <span className="bg-[#c89666]/20 text-[#d4a373] px-1.5 py-0.2 rounded text-[10px]">
              {fetchingCount} fetching
            </span>
          )}
        </button>
      ) : (
        <div className="bg-[#17110d]/95 border border-[#38281e] rounded-2xl shadow-2xl backdrop-blur-xl w-80 sm:w-96 overflow-hidden p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#38281e] pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#d4a373]" />
              <span className="font-bold text-[#faf4ee] text-xs">Sync Observability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className={isApiConnected ? 'text-emerald-400 flex items-center gap-1' : 'text-rose-400 flex items-center gap-1'}>
                  <Server className="w-3 h-3" /> {isApiConnected ? `API (${latencyMs ?? 0}ms)` : 'API Offline'}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#887467] hover:text-[#faf4ee] transition cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="bg-[#110c09] p-2 rounded-xl border border-[#38281e]">
              <div className="text-[#887467] text-[10px]">Total Queries</div>
              <div className="text-sm font-bold text-[#faf4ee] mt-0.5">{totalQueries}</div>
            </div>
            <div className="bg-[#110c09] p-2 rounded-xl border border-[#38281e]">
              <div className="text-[#887467] text-[10px]">Fetching</div>
              <div className={`text-sm font-bold mt-0.5 ${fetchingCount > 0 ? 'text-amber-400' : 'text-[#887467]'}`}>
                {fetchingCount}
              </div>
            </div>
            <div className="bg-[#110c09] p-2 rounded-xl border border-[#38281e]">
              <div className="text-[#887467] text-[10px]">Stale</div>
              <div className="text-sm font-bold text-[#d4a373] mt-0.5">{staleCount}</div>
            </div>
          </div>

          {/* Active Domains */}
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            <div className="text-[10px] text-[#887467] uppercase tracking-wider font-bold">Active Cache Keys:</div>
            {queries.slice(0, 6).map((q, idx) => (
              <div key={idx} className="bg-[#110c09]/60 px-2 py-1 rounded text-[10px] flex items-center justify-between text-[#cbb8a9] truncate">
                <span className="truncate">{JSON.stringify(q.queryKey)}</span>
                <span className={`text-[9px] ml-1 px-1 rounded uppercase ${q.state.status === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {q.state.status}
                </span>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2 border-t border-[#38281e]">
            <button
              onClick={handleRefetchAll}
              disabled={isChecking}
              className="flex-1 py-1.5 px-2.5 bg-[#c89666]/15 hover:bg-[#c89666]/25 text-[#d4a373] border border-[#c89666]/30 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Syncing...' : 'Refetch All'}</span>
            </button>

            <button
              onClick={handleClearCache}
              className="py-1.5 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Purge Cache</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
