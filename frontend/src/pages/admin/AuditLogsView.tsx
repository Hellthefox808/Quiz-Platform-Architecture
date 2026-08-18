import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAdminAuditLogsQuery } from '../../hooks/useAdminManagement';
import { AuditLog } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { NavigateFunction } from '../../types/navigation';

interface AuditLogsViewProps {
  onNavigate: NavigateFunction;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ onNavigate }) => {
  const [page] = useState(1);
  const pageSize = 50;

  const { data, isLoading: loading } = useAdminAuditLogsQuery(page, pageSize);
  const logs: AuditLog[] = data?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Top Header */}
      <div>
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#cbb8a9] hover:text-[#faf4ee] mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Console
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#38281e]">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Compliance & Security</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight flex items-center gap-2 mt-1">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              Security & Audit Trail
            </h1>
            <p className="text-xs sm:text-sm text-[#cbb8a9] mt-2 max-w-xl">
              Immutable ledger of administrative mutations, authentication events, and assessment lifecycle changes.
            </p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="assess-surface rounded-2xl p-6 space-y-4 border border-[#38281e]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#38281e]/50">
              <Skeleton variant="text" width="140px" height="14px" />
              <Skeleton variant="text" width="100px" height="20px" />
              <Skeleton variant="text" width="180px" height="14px" />
              <Skeleton variant="text" width="220px" height="14px" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-8 h-8" />}
          title="No Audit Logs Recorded"
          description="Security events and administrative actions will automatically populate here."
        />
      ) : (
        <div className="assess-surface rounded-2xl overflow-hidden shadow-xl border border-[#38281e]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#cbb8a9]">
              <thead className="bg-[#110c09] text-[10px] uppercase font-mono tracking-wider text-[#887467] border-b border-[#38281e]">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38281e]/60 font-mono text-[11px]">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-[#231a14]/40 transition-colors">
                    <td className="px-6 py-4 text-[#887467] whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="info" size="sm">
                        {l.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[#faf4ee] whitespace-nowrap">
                      {l.user_email || 'System'}
                    </td>
                    <td className="px-6 py-4 text-[#cbb8a9] whitespace-nowrap">
                      {l.resource_type ? `${l.resource_type}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-[#887467] max-w-xs truncate" title={l.details ? JSON.stringify(l.details) : ''}>
                      {l.details ? JSON.stringify(l.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
