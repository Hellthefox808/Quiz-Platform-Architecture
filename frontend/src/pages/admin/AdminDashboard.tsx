import React from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useAdminAnalyticsQuery } from '../../hooks/useAdminManagement';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Progress } from '../../components/ui/Progress';
import { NavigateFunction } from '../../types/navigation';

interface AdminDashboardProps {
  onNavigate: NavigateFunction;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { data: analytics, isLoading: loading, isError, refetch } = useAdminAnalyticsQuery();

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto px-4 py-8 animate-pulse">
        <Skeleton variant="text" width="200px" height="24px" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-5 space-y-3 border border-[#e8dfd5]">
              <Skeleton variant="text" width="100px" height="14px" />
              <Skeleton variant="text" width="60px" height="32px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <ErrorState
          title="Admin Metrics Unavailable"
          message="Could not load platform metrics and aggregate telemetry from the server."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-150">
      {/* Header & Quick Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e8dfd5]">
        <div>
          <span className="text-xs font-bold text-[#b46927] uppercase tracking-wider">Governance Console</span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight flex items-center gap-2 mt-1">
            <Activity className="w-7 h-7 text-[#b46927]" />
            Executive Administration
          </h1>
          <p className="text-xs sm:text-sm text-[#5c4738] mt-2 max-w-xl">
            Platform governance, assessment versioning, question banks, and aggregate telemetry.
          </p>
        </div>

        {/* Quick Admin Navigation Pills */}
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="primary"
            size="sm"
            className="font-bold text-xs"
            onClick={() => onNavigate('admin-quizzes')}
          >
            Quizzes & Versions
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="font-bold text-xs"
            onClick={() => onNavigate('admin-categories')}
          >
            Domains & Categories
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="font-bold text-xs"
            onClick={() => onNavigate('admin-users')}
          >
            User Directory
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="font-bold text-xs"
            onClick={() => onNavigate('admin-audit')}
          >
            Audit Trail
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-[#e8dfd5] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#b46927]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8a7465] uppercase tracking-wider">Registered Users</span>
            <div className="w-9 h-9 rounded-2xl bg-[#b07238]/10 border border-[#b07238]/20 flex items-center justify-center text-[#b46927]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1c130d] font-mono tracking-tight">
              {analytics.total_users}
            </div>
            <div className="mt-2 text-[11px] text-emerald-700 font-bold flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{analytics.active_users} active accounts</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#e8dfd5] shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8a7465] uppercase tracking-wider">Published Quizzes</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1c130d] font-mono tracking-tight">
              {analytics.published_quizzes}{' '}
              <span className="text-base font-bold text-[#8a7465]">/ {analytics.total_quizzes}</span>
            </div>
            <div className="mt-2 text-[11px] text-[#5c4738] font-medium">
              {analytics.total_questions} total questions configured
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#e8dfd5] shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8a7465] uppercase tracking-wider">Total Submissions</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1c130d] font-mono tracking-tight">
              {analytics.completed_attempts}
            </div>
            <div className="mt-2 text-[11px] text-[#5c4738] font-medium font-mono">
              {analytics.total_attempts} total started
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#e8dfd5] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#b46927]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#8a7465] uppercase tracking-wider">Overall Pass Rate</span>
            <div className="w-9 h-9 rounded-2xl bg-[#b07238]/10 border border-[#b07238]/25 flex items-center justify-center text-[#b46927]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1c130d] font-mono tracking-tight">
              {analytics.overall_pass_rate}%
            </div>
            <div className="mt-2 text-[11px] text-[#5c4738] font-bold font-mono">
              Mean score: {analytics.average_score}%
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e8dfd5] shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-[#1c130d] uppercase tracking-wider flex items-center gap-2 border-b border-[#e8dfd5] pb-3">
            <BarChart3 className="w-4 h-4 text-[#b46927]" />
            <span>Score Distribution Breakdown</span>
          </h2>
          <div className="space-y-4">
            {analytics.score_distribution.map((bucket) => (
              <div key={bucket.range_label} className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold font-mono">
                  <span className="text-[#1c130d]">{bucket.range_label}</span>
                  <span className="text-[#8a7465]">{bucket.count} attempts ({bucket.percentage}%)</span>
                </div>
                <Progress value={bucket.percentage} variant="caramel" size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Popular Assessments */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e8dfd5] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#e8dfd5] pb-3">
            <h2 className="text-xs font-bold text-[#1c130d] uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Popular Assessments</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-[#b46927]"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('admin-questions-analytics')}
            >
              Item Analysis
            </Button>
          </div>

          <div className="space-y-3">
            {analytics.popular_quizzes.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#8a7465] bg-[#faf7f2] rounded-2xl border border-[#e8dfd5]">
                No attempt data recorded yet.
              </div>
            ) : (
              analytics.popular_quizzes.map((q) => (
                <div
                  key={q.quiz_id}
                  className="p-4 bg-[#faf7f2] border border-[#e8dfd5] rounded-2xl flex items-center justify-between hover:border-[#b46927]/50 transition-all shadow-sm"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-sm font-black text-[#1c130d]">{q.title}</div>
                    <div className="text-[10px] text-[#8a7465] font-mono uppercase tracking-wider font-bold">
                      {q.category_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-[#1c130d] font-mono">{q.total_attempts} attempts</div>
                    <div className="text-[10px] text-emerald-700 font-bold font-mono mt-0.5">{q.pass_rate}% Pass Rate</div>
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
