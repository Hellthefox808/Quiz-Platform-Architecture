import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { AdminAnalytics } from '../../types';
import { 
  BarChart3, 
  BookOpen, 
  CheckCircle2, 
  FileQuestion, 
  Layers, 
  TrendingUp, 
  Users, 
  Zap, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await api.get<AdminAnalytics>('/analytics/admin');
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load admin analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-8 h-8 text-rose-400" />
            Executive Administration Console
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Platform governance, assessment versioning, question banks, and aggregate metrics.
          </p>
        </div>

        {/* Quick Admin Navigation Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('admin-quizzes')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
          >
            Quizzes & Versions
          </button>
          <button
            onClick={() => onNavigate('admin-categories')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Categories
          </button>
          <button
            onClick={() => onNavigate('admin-users')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Users
          </button>
          <button
            onClick={() => onNavigate('admin-audit')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            Audit Logs
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase">Registered Users</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white tracking-tight">
              {analytics?.total_users || 0}
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-400">
            {analytics?.active_users || 0} active accounts
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase">Published Quizzes</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white tracking-tight">
              {analytics?.published_quizzes || 0}{' '}
              <span className="text-base font-normal text-slate-500">/ {analytics?.total_quizzes || 0}</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {analytics?.total_questions || 0} total questions
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase">Total Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white tracking-tight">
              {analytics?.completed_attempts || 0}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {analytics?.total_attempts || 0} total started
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase">Overall Pass Rate</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-white tracking-tight">
              {analytics?.overall_pass_rate || 0}%
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Avg score: {analytics?.average_score || 0}%
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Score Distribution Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-white mb-4">Score Distribution</h2>
          <div className="space-y-3">
            {analytics?.score_distribution.map((bucket) => (
              <div key={bucket.range_label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-slate-300">{bucket.range_label}</span>
                  <span className="text-slate-400">{bucket.count} attempts ({bucket.percentage}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, bucket.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Quizzes */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Popular Assessments</h2>
            <button
              onClick={() => onNavigate('admin-questions-analytics')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>Item Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800">
            {analytics?.popular_quizzes.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No attempt data available yet.
              </div>
            ) : (
              analytics?.popular_quizzes.map((q) => (
                <div key={q.quiz_id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{q.title}</div>
                    <div className="text-xs text-slate-500">{q.category_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">{q.total_attempts} attempts</div>
                    <div className="text-[11px] text-emerald-400 font-mono">{q.pass_rate}% Pass Rate</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
