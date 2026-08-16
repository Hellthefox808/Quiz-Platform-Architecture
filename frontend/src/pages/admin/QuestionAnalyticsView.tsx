import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { QuestionAnalytics } from '../../types';
import { 
  AlertTriangle, 
  ArrowLeft, 
  BarChart2, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  XCircle 
} from 'lucide-react';

interface QuestionAnalyticsViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const QuestionAnalyticsView: React.FC<QuestionAnalyticsViewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<QuestionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await api.get<QuestionAnalytics[]>('/analytics/admin/questions');
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load question metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

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
              <BarChart2 className="w-8 h-8 text-indigo-400" />
              Item Performance & Question Metrics
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Statistical item analysis showing question difficulty indices, error rates, and response distributions.
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : metrics.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Attempt Data</h3>
          <p className="text-sm text-slate-400">
            Question difficulty metrics will appear as students complete assessments.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-850 text-xs uppercase font-mono text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Question & Quiz</th>
                <th className="px-6 py-4 text-center">Responses</th>
                <th className="px-6 py-4 text-center">Correct %</th>
                <th className="px-6 py-4 text-center">Difficulty Index</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {metrics.map((m) => {
                const isProblematic = m.difficulty_index > 0.7 && m.total_attempts >= 5;

                return (
                  <tr key={m.question_id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 max-w-md">
                      <div className="font-semibold text-white text-xs sm:text-sm line-clamp-2">
                        {m.question_text}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono">
                        {m.quiz_title} • Difficulty: {m.difficulty}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-white text-xs">
                      {m.total_attempts}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-emerald-400 text-xs font-mono">
                        {m.correct_percentage}%
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-xs font-bold text-slate-300">
                        {m.difficulty_index}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {isProblematic ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          High Failure Rate
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                          Balanced
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
