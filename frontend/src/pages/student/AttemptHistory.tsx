import React, { useState } from 'react';
import { History } from 'lucide-react';
import { useAttemptHistoryQuery } from '../../hooks/useAttemptHistory';
import { AttemptRecord } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { NavigateFunction } from '../../types/navigation';

interface AttemptHistoryProps {
  onNavigate: NavigateFunction;
}

export const AttemptHistory: React.FC<AttemptHistoryProps> = ({ onNavigate }) => {
  const [page] = useState(1);
  const pageSize = 20;
  const { data, isLoading: loading } = useAttemptHistoryQuery(page, pageSize);

  const attempts: AttemptRecord[] = data?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      <div className="border-b border-[#38281e] pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight flex items-center gap-2.5">
          <History className="w-6 h-6 text-[#d4a373]" />
          Attempt History
        </h1>
        <p className="text-xs sm:text-sm text-[#cbb8a9] mt-2 max-w-2xl">
          Review your historical assessment submissions, scores, and performance records.
        </p>
      </div>

      {loading ? (
        <div className="assess-surface rounded-2xl p-6 space-y-3 border border-[#38281e]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-[#38281e]/40">
              <Skeleton variant="text" width="200px" height="16px" />
              <Skeleton variant="text" width="120px" height="14px" />
              <Skeleton variant="text" width="60px" height="14px" />
              <Skeleton variant="text" width="70px" height="20px" />
            </div>
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <EmptyState
          icon={<History className="w-8 h-8" />}
          title="No Attempt Records"
          description="You have not completed any online assessments yet. Browse the catalog to get started."
          primaryActionLabel="Explore Quizzes"
          onPrimaryAction={() => onNavigate('catalog')}
        />
      ) : (
        <div className="assess-surface rounded-2xl overflow-hidden shadow-xl border border-[#38281e]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#cbb8a9]">
              <thead className="bg-[#110c09] text-[10px] uppercase font-mono tracking-wider text-[#887467] border-b border-[#38281e]">
                <tr>
                  <th className="px-6 py-4">Assessment Title</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38281e]/60">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-[#231a14]/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#faf4ee]">
                      {att.quiz_title}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-[#887467] font-mono">
                      {new Date(att.started_at).toLocaleDateString()} {new Date(att.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-mono text-[#887467]">
                      {Math.round(att.time_taken_seconds / 60)} min
                    </td>
                    <td className="px-6 py-4 text-center font-extrabold text-[#faf4ee] font-mono">
                      {att.percentage}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={att.passed ? 'success' : 'danger'} size="sm">
                        {att.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => onNavigate('result', { attemptId: att.id, quizTitle: att.quiz_title })}
                      >
                        Report
                      </Button>
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
