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
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#cbb8a9] hover:text-[#faf4ee] mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Console
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#38281e]">
          <div>
            <span className="text-xs font-bold text-[#d4a373] uppercase tracking-wider">Item Telemetry</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight flex items-center gap-2 mt-1">
              <BarChart2 className="w-7 h-7 text-[#d4a373]" />
              Item Performance & Question Metrics
            </h1>
            <p className="text-xs sm:text-sm text-[#cbb8a9] mt-2 max-w-xl">
              Statistical item analysis showing question difficulty indices, error rates, and response distributions.
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Table */}
      {loading ? (
        <div className="assess-surface rounded-2xl p-6 space-y-4 border border-[#38281e]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#38281e]/50">
              <Skeleton variant="text" width="280px" height="18px" />
              <Skeleton variant="text" width="60px" height="16px" />
              <Skeleton variant="text" width="60px" height="16px" />
              <Skeleton variant="text" width="80px" height="24px" />
            </div>
          ))}
        </div>
      ) : metrics.length === 0 ? (
        <EmptyState
          icon={<BarChart2 className="w-8 h-8" />}
          title="No Item Metrics Available"
          description="Question difficulty and failure indices will appear as students submit graded assessments."
        />
      ) : (
        <div className="assess-surface rounded-2xl overflow-hidden shadow-xl border border-[#38281e]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#cbb8a9]">
              <thead className="bg-[#110c09] text-[10px] uppercase font-mono tracking-wider text-[#887467] border-b border-[#38281e]">
                <tr>
                  <th className="px-6 py-4">Question & Quiz</th>
                  <th className="px-6 py-4 text-center">Responses</th>
                  <th className="px-6 py-4 text-center">Correct %</th>
                  <th className="px-6 py-4 text-center">Difficulty Index</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38281e]/60">
                {metrics.map((m) => {
                  const isProblematic = m.difficulty_index > 0.7 && m.total_attempts >= 5;

                  return (
                    <tr key={m.question_id} className="hover:bg-[#231a14]/40 transition-colors">
                      <td className="px-6 py-4 max-w-md">
                        <div className="font-semibold text-[#faf4ee] text-xs sm:text-sm line-clamp-2 leading-relaxed">
                          {m.question_text}
                        </div>
                        <div className="text-[10px] text-[#887467] mt-1.5 font-mono">
                          <span className="text-[#cbb8a9] font-bold">{m.quiz_title}</span> • Difficulty: {m.difficulty}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-extrabold text-[#faf4ee] text-[11px] font-mono">
                        {m.total_attempts}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-emerald-400 text-[11px] font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {m.correct_percentage}%
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center font-mono text-[11px] font-bold text-[#faf4ee]">
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
