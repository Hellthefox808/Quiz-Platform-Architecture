import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AuditLog } from '../../types';
import { 
  ArrowLeft, 
  Clock, 
  HelpCircle, 
  Lock, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  User as UserIcon 
} from 'lucide-react';

interface AuditLogsViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: AuditLog[]; total: number }>(
        `/audit-logs?page=${page}&page_size=25`
      );
      setLogs(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Console
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-8 h-8 text-rose-400" />
              Security & Audit Trail
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Immutable ledger of administrative mutations, authentication events, and assessment lifecycle changes.
            </p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-850 text-xs uppercase font-mono text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {l.user_email || 'System'}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {l.resource_type ? `${l.resource_type}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                    {l.details ? JSON.stringify(l.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
