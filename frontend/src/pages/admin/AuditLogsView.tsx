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
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5c4738] hover:text-[#1c130d] mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Console
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e8dfd5]">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Compliance & Security</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight flex items-center gap-2 mt-1">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
              Security & Audit Trail
            </h1>
            <p className="text-xs sm:text-sm text-[#5c4738] mt-2 max-w-xl">
              Immutable ledger of administrative mutations, authentication events, and assessment lifecycle changes.
            </p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-6 space-y-4 border border-[#e8dfd5] shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#e8dfd5]/60">
              <Skeleton variant="text" width="140px" height="14px" />
              <Skeleton variant="text" width="100px" height="20px" />
              <Skeleton variant="text" width="180px" height="14px" />
              <Skeleton variant="text" width="220px" height="14px" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-10 h-10 text-emerald-600" />}
          title="No Audit Logs Recorded"
          description="Security events and administrative actions will automatically populate here."
        />
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e8dfd5]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#5c4738]">
              <thead className="bg-[#f5efe8] text-[10px] uppercase font-mono tracking-wider text-[#8a7465] border-b border-[#e8dfd5]">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfd5] font-mono text-[11px]">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-[#faf7f2] transition-colors">
                    <td className="px-6 py-4 text-[#8a7465] whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="info" size="sm">
                        {l.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[#1c130d] font-bold whitespace-nowrap">
                      {l.user_email || 'System'}
                    </td>
                    <td className="px-6 py-4 text-[#5c4738] whitespace-nowrap">
                      {l.resource_type ? `${l.resource_type}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-[#8a7465] max-w-xs truncate" title={l.details ? JSON.stringify(l.details) : ''}>
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
