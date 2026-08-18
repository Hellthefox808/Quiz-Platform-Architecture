import React from 'react';
import {
  ArrowLeft,
  BarChart2,
} from 'lucide-react';
import { useQuestionAnalyticsQuery } from '../../hooks/useAdminManagement';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { NavigateFunction } from '../../types/navigation';

interface QuestionAnalyticsViewProps {
  onNavigate: NavigateFunction;
}

export const QuestionAnalyticsView: React.FC<QuestionAnalyticsViewProps> = ({ onNavigate }) => {
  const { data: metrics = [], isLoading: loading } = useQuestionAnalyticsQuery();

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
            <span className="text-xs font-bold text-[#b46927] uppercase tracking-wider">Item Telemetry</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight flex items-center gap-2 mt-1">
              <BarChart2 className="w-7 h-7 text-[#b46927]" />
              Item Performance & Question Analytics
            </h1>
            <p className="text-xs sm:text-sm text-[#5c4738] mt-2 max-w-xl">
              Statistical item analysis showing question difficulty indices, error rates, and response distributions.
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-6 space-y-4 border border-[#e8dfd5] shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#e8dfd5]/60">
              <Skeleton variant="text" width="280px" height="18px" />
              <Skeleton variant="text" width="60px" height="16px" />
              <Skeleton variant="text" width="60px" height="16px" />
              <Skeleton variant="text" width="80px" height="24px" />
            </div>
          ))}
        </div>
      ) : metrics.length === 0 ? (
        <EmptyState
          icon={<BarChart2 className="w-10 h-10 text-[#b46927]" />}
          title="No Item Metrics Available"
          description="Question difficulty and failure indices will appear as candidates submit graded assessments."
        />
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e8dfd5]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#5c4738]">
              <thead className="bg-[#f5efe8] text-[10px] uppercase font-mono tracking-wider text-[#8a7465] border-b border-[#e8dfd5]">
                <tr>
                  <th className="px-6 py-4">Question & Quiz</th>
                  <th className="px-6 py-4 text-center">Responses</th>
                  <th className="px-6 py-4 text-center">Correct %</th>
                  <th className="px-6 py-4 text-center">Difficulty Index</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfd5]">
                {metrics.map((m) => {
                  const isProblematic = m.difficulty_index > 0.7 && m.total_attempts >= 5;

                  return (
                    <tr key={m.question_id} className="hover:bg-[#faf7f2] transition-colors">
                      <td className="px-6 py-4 max-w-md">
                        <div className="font-bold text-[#1c130d] text-xs sm:text-sm line-clamp-2 leading-relaxed">
                          {m.question_text}
                        </div>
                        <div className="text-[10px] text-[#8a7465] mt-1.5 font-mono">
                          <span className="text-[#b46927] font-bold">{m.quiz_title}</span> • Difficulty: {m.difficulty}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-black text-[#1c130d] text-[11px] font-mono">
                        {m.total_attempts}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-emerald-800 text-[11px] font-mono bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                          {m.correct_percentage}%
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center font-mono text-[11px] font-black text-[#1c130d]">
                        {m.difficulty_index}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isProblematic ? (
                          <Badge variant="danger" size="sm" dot>
                            High Failure Rate
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm" dot>
                            Balanced
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
