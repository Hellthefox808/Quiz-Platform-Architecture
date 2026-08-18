import React, { useState } from 'react';
import { History, BookOpen } from 'lucide-react';
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
      <div className="border-b border-[#e8dfd5] pb-5">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight flex items-center gap-2.5">
          <History className="w-7 h-7 text-[#b46927]" />
          Attempt History
        </h1>
        <p className="text-xs sm:text-sm text-[#5c4738] mt-2 max-w-2xl">
          Review your historical assessment submissions, scores, duration velocity, and performance records.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-6 space-y-3 border border-[#e8dfd5] shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#e8dfd5]/60">
              <Skeleton variant="text" width="200px" height="18px" />
              <Skeleton variant="text" width="120px" height="14px" />
              <Skeleton variant="text" width="60px" height="14px" />
              <Skeleton variant="text" width="70px" height="20px" />
            </div>
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-[#b46927]" />}
          title="No Attempt Records Found"
          description="You have not completed any online assessments yet. Browse the catalog to test your skills."
          primaryActionLabel="Explore Quizzes"
          onPrimaryAction={() => onNavigate('catalog')}
        />
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e8dfd5]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#5c4738]">
              <thead className="bg-[#f5efe8] text-[10px] uppercase font-mono tracking-wider text-[#8a7465] border-b border-[#e8dfd5]">
                <tr>
                  <th className="px-6 py-4">Assessment Title</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfd5]">
                {attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-[#faf7f2] transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1c130d]">
                      {att.quiz_title}
                    </td>
                    <td className="px-6 py-4 text-[11px] text-[#8a7465] font-mono">
                      {new Date(att.started_at).toLocaleDateString()} {new Date(att.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-mono text-[#8a7465]">
                      {Math.round(att.time_taken_seconds / 60)} min
                    </td>
                    <td className="px-6 py-4 text-center font-black text-[#1c130d] font-mono text-base">
                      {att.percentage}%
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={att.passed ? 'success' : 'danger'} size="sm">
                        {att.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="font-bold text-xs"
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
