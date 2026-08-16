import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { StudentAnalytics, AttemptRecord } from '../../types';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  TrendingUp, 
  XCircle, 
  Zap, 
  ArrowRight,
  Trophy,
  Activity,
  ChevronRight
} from 'lucide-react';

interface StudentDashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<AttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [anData, histData] = await Promise.all([
          api.get<StudentAnalytics>('/analytics/student'),
          api.get<{ items: AttemptRecord[] }>('/attempts/history/my?page=1&page_size=5'),
        ]);
        setAnalytics(anData);
        setRecentAttempts(histData.items);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0b1220] border border-slate-800 p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Activity className="w-3.5 h-3.5" />
            <span>Active Assessment Track</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ready to test your knowledge today?
          </h1>
          <p className="mt-2 text-slate-400 text-sm leading-relaxed">
            Browse published assessments across cybersecurity, cloud architecture, database systems, and full-stack development.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('catalog')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore Quizzes</span>
            </button>
            <button
              onClick={() => onNavigate('leaderboard')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold uppercase tracking-wider border border-slate-800 transition flex items-center gap-2 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Global Rankings</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Attempts</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {analytics?.total_attempts || 0}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {analytics?.passed_attempts || 0} passed · {analytics?.failed_attempts || 0} failed
          </div>
        </div>

        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pass Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {analytics?.pass_rate || 0}%
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 font-medium">
            Based on completed assessments
          </div>
        </div>

        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {analytics?.average_score || 0}%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Highest score: {analytics?.highest_score || 0}%
          </div>
        </div>

        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Time Invested</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {Math.round((analytics?.total_time_spent_seconds || 0) / 60)} <span className="text-sm font-normal text-slate-400">min</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Across all tests
          </div>
        </div>
      </div>

      {/* Category Performance & Recent Attempts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Breakdown */}
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>Category Proficiency</span>
          </h2>
          {analytics?.category_breakdown.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-8">
              Complete your first assessment to unlock category analytics.
            </div>
          ) : (
            <div className="space-y-4">
              {analytics?.category_breakdown.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">{cat.category}</span>
                    <span className="font-mono font-bold text-blue-400">{cat.avg_percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, cat.avg_percentage))}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {cat.attempts} attempts · {cat.passed} passed
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attempts */}
        <div className="lg:col-span-2 bg-[#0b1220] border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Recent Exam History</span>
            </h2>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <span>View Full History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentAttempts.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">You have not completed any assessments yet.</p>
              <button
                onClick={() => onNavigate('catalog')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Browse Assessments
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentAttempts.map((att) => (
                <div key={att.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{att.quiz_title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span>{new Date(att.started_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{Math.round(att.time_taken_seconds / 60)} min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-white font-mono">{att.percentage}%</div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          att.passed
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {att.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>

                    <button
                      onClick={() => onNavigate('result', { attemptId: att.id, quizTitle: att.quiz_title })}
                      className="px-3 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition border border-slate-800 cursor-pointer font-medium"
                    >
                      Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
