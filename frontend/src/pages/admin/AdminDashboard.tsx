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
import { Card } from '../../components/ui/Card';
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
            <div key={i} className="assess-surface rounded-2xl p-5 space-y-3 border border-[#38281e]">
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#38281e]">
        <div>
          <span className="text-xs font-bold text-[#d4a373] uppercase tracking-wider">Governance Console</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight flex items-center gap-2 mt-1">
            <Activity className="w-7 h-7 text-[#d4a373]" />
            Executive Administration
          </h1>
          <p className="text-xs sm:text-sm text-[#cbb8a9] mt-2 max-w-xl">
            Platform governance, assessment versioning, question banks, and aggregate metrics.
          </p>
        </div>

        {/* Quick Admin Navigation Pills */}
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('admin-quizzes')}
          >
            Quizzes & Versions
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('admin-categories')}
          >
            Categories
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('admin-users')}
          >
            Users
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('admin-audit')}
          >
            Audit Trail
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="surface" className="flex flex-col justify-between space-y-4 border border-[#38281e]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#cbb8a9] uppercase tracking-wider">Registered Users</span>
            <div className="w-8 h-8 rounded-xl bg-[#c89666]/15 border border-[#c89666]/30 flex items-center justify-center text-[#d4a373]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#faf4ee] font-mono tracking-tight">
              {analytics.total_users}
            </div>
            <div className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{analytics.active_users} active accounts</span>
            </div>
          </div>
        </Card>

        <Card variant="surface" className="flex flex-col justify-between space-y-4 border border-[#38281e]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#cbb8a9] uppercase tracking-wider">Published Quizzes</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#faf4ee] font-mono tracking-tight">
              {analytics.published_quizzes}{' '}
              <span className="text-lg font-medium text-[#887467]">/ {analytics.total_quizzes}</span>
            </div>
            <div className="mt-2 text-[11px] text-[#cbb8a9] font-medium">
              {analytics.total_questions} total questions configured
            </div>
          </div>
        </Card>

        <Card variant="surface" className="flex flex-col justify-between space-y-4 border border-[#38281e]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#cbb8a9] uppercase tracking-wider">Total Submissions</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#faf4ee] font-mono tracking-tight">
              {analytics.completed_attempts}
            </div>
            <div className="mt-2 text-[11px] text-[#cbb8a9] font-medium">
              {analytics.total_attempts} total started
            </div>
          </div>
        </Card>

        <Card variant="surface" className="flex flex-col justify-between space-y-4 border border-[#38281e]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#cbb8a9] uppercase tracking-wider">Overall Pass Rate</span>
            <div className="w-8 h-8 rounded-xl bg-[#c89666]/20 border border-[#c89666]/35 flex items-center justify-center text-[#e6ccb2]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-[#faf4ee] font-mono tracking-tight">
              {analytics.overall_pass_rate}%
            </div>
            <div className="mt-2 text-[11px] text-[#cbb8a9] font-medium font-mono">
              Mean score: {analytics.average_score}%
            </div>
          </div>
        </Card>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart */}
        <Card variant="surface" className="space-y-5 border border-[#38281e]">
          <h2 className="text-xs font-bold text-[#faf4ee] uppercase tracking-wider flex items-center gap-2 border-b border-[#38281e]/80 pb-3">
            <BarChart3 className="w-4 h-4 text-[#d4a373]" />
            <span>Score Distribution Breakdown</span>
          </h2>
          <div className="space-y-4">
            {analytics.score_distribution.map((bucket) => (
              <div key={bucket.range_label} className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold font-mono">
                  <span className="text-[#cbb8a9]">{bucket.range_label}</span>
                  <span className="text-[#887467]">{bucket.count} attempts ({bucket.percentage}%)</span>
                </div>
                <Progress value={bucket.percentage} variant="caramel" size="sm" />
              </div>
            ))}
          </div>
        </Card>

        {/* Popular Assessments */}
        <Card variant="surface" className="space-y-5 border border-[#38281e]">
          <div className="flex items-center justify-between border-b border-[#38281e]/80 pb-3">
            <h2 className="text-xs font-bold text-[#faf4ee] uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Popular Assessments</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('admin-questions-analytics')}
            >
              Item Analysis
            </Button>
          </div>

          <div className="space-y-3">
            {analytics.popular_quizzes.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#887467] bg-[#110c09] rounded-xl border border-[#38281e]/50">
                No attempt data recorded yet.
              </div>
            ) : (
              analytics.popular_quizzes.map((q) => (
                <div
                  key={q.quiz_id}
                  className="p-3.5 bg-[#110c09] border border-[#38281e] rounded-xl flex items-center justify-between hover:border-[#4e382b] transition"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs sm:text-sm font-bold text-[#faf4ee]">{q.title}</div>
                    <div className="text-[10px] text-[#887467] font-mono uppercase tracking-wider">
                      {q.category_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#faf4ee] font-mono">{q.total_attempts} attempts</div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{q.pass_rate}% Pass Rate</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
