import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  TrendingUp,
  Trophy,
  Activity,
  ChevronRight,
  Sparkles,
  Zap,
  Target,
  FileSpreadsheet,
  LineChart as ChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useStudentDashboardQueries } from '../../hooks/useStudentDashboard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Progress } from '../../components/ui/Progress';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { NavigateFunction } from '../../types/navigation';

interface StudentDashboardProps {
  onNavigate: NavigateFunction;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { analytics, recentAttempts, isLoading, isError, refetch } = useStudentDashboardQueries();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <ErrorState
          title="Performance Dashboard Unavailable"
          message="We could not synchronize your assessment and proficiency statistics from the server."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const passRate = analytics?.pass_rate ?? 0;
  const avgScore = analytics?.average_score ?? 0;
  const totalAttempts = analytics?.total_attempts ?? 0;
  const totalMinutes = Math.round((analytics?.total_time_spent_seconds ?? 0) / 60);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
      {/* Command Header / Welcome Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-[#fbf8f4] to-[#f5efe8] p-6 sm:p-8 shadow-sm border border-[#e8dfd5]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#b07238]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b07238]/10 border border-[#b07238]/20 text-[#b46927] text-xs font-bold font-mono">
              <Zap className="w-3.5 h-3.5 text-[#b46927]" />
              <span>Assessment Intelligence Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight">
              Welcome back to your Assessment Hub
            </h1>
            <p className="text-[#5c4738] text-xs sm:text-sm leading-relaxed">
              Track mastery, review question explanations, and unlock verified certificates across technical tracks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="md"
              leftIcon={<BookOpen className="w-4 h-4" />}
              onClick={() => onNavigate('catalog')}
            >
              Explore Quizzes
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Trophy className="w-4 h-4 text-amber-600" />}
              onClick={() => onNavigate('leaderboard')}
            >
              Leaderboard
            </Button>
          </div>
        </div>
      </div>

      {/* Analytical Scorecard & Performance Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Performance Gauge */}
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm lg:col-span-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#8a7465]">
                Primary Accuracy Rating
              </span>
              <Badge variant={avgScore >= 70 ? 'success' : 'warning'} size="sm" dot>
                {avgScore >= 70 ? 'Optimal' : 'Needs Review'}
              </Badge>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-[#1c130d] font-mono tracking-tight">
                {avgScore}%
              </span>
              <span className="text-xs text-[#8a7465] font-mono">Platform Average</span>
            </div>

            <Progress value={avgScore} variant="gradient" size="md" />

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 bg-[#faf7f2] rounded-2xl border border-[#e8dfd5]">
                <span className="text-[10px] text-[#8a7465] uppercase block font-sans font-bold">Highest Score</span>
                <span className="text-emerald-700 font-bold text-base mt-0.5 block">{analytics?.highest_score ?? 0}%</span>
              </div>
              <div className="p-3 bg-[#faf7f2] rounded-2xl border border-[#e8dfd5]">
                <span className="text-[10px] text-[#8a7465] uppercase block font-sans font-bold">Passed / Total</span>
                <span className="text-[#b46927] font-bold text-base mt-0.5 block">{analytics?.passed_attempts ?? 0} / {totalAttempts}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e8dfd5] flex items-center justify-between text-xs text-[#5c4738]">
            <span className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#b46927]" />
              <span>Target Standard: 70%</span>
            </span>
            <span className="font-mono text-[#8a7465]">{totalAttempts > 0 ? 'Active Track' : 'No Submissions'}</span>
          </div>
        </div>

        {/* 4 Analytical KPI Metric Tiles */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8a7465] uppercase tracking-wider">
                Total Assessments Taken
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#b07238]/10 border border-[#b07238]/20 flex items-center justify-center text-[#b46927]">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#1c130d] font-mono tracking-tight">
                {totalAttempts}
              </div>
              <div className="text-[11px] text-[#5c4738] mt-1 font-medium">
                {analytics?.passed_attempts ?? 0} passed • {analytics?.failed_attempts ?? 0} failed
              </div>
            </div>
            <div className="w-full bg-[#f5efe8] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#b07238] to-[#d4a373] h-full rounded-full"
                style={{ width: `${totalAttempts > 0 ? (Number(analytics?.passed_attempts || 0) / totalAttempts) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8a7465] uppercase tracking-wider">
                Pass Clearance Rate
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#1c130d] font-mono tracking-tight">
                {passRate}%
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Computed across graded submissions</span>
              </div>
            </div>
            <div className="w-full bg-[#f5efe8] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${passRate}%` }} />
            </div>
          </div>

          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8a7465] uppercase tracking-wider">
                Historical Mean Percentage
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#1c130d] font-mono tracking-tight">
                {avgScore}%
              </div>
              <div className="text-[11px] text-[#5c4738] mt-1 font-medium font-mono">
                Top Mark: {analytics?.highest_score ?? 0}%
              </div>
            </div>
            <div className="w-full bg-[#f5efe8] h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-600 to-[#d4a373] h-full rounded-full" style={{ width: `${avgScore}%` }} />
            </div>
          </div>

          <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8a7465] uppercase tracking-wider">
                Total Assessment Velocity
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#b07238]/10 border border-[#b07238]/20 flex items-center justify-center text-[#b46927]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black text-[#1c130d] font-mono tracking-tight">
                {totalMinutes} <span className="text-sm font-normal text-[#8a7465]">min</span>
              </div>
              <div className="text-[11px] text-[#5c4738] mt-1 font-medium">
                Active test time across all exams
              </div>
            </div>
            <div className="w-full bg-[#f5efe8] h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-[#b07238] to-[#d4a373] h-full rounded-full" style={{ width: `${Math.min(100, (totalMinutes / 120) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Performance & Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Proficiency Visualizer */}
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#e8dfd5] pb-3">
            <h2 className="text-xs font-bold text-[#1c130d] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#b46927]" />
              <span>Category Proficiency</span>
            </h2>
            <span className="text-[10px] text-[#8a7465] font-mono">Real-time</span>
          </div>

          {!analytics || analytics.category_breakdown.length === 0 ? (
            <div className="text-xs text-[#8a7465] text-center py-8">
              Complete your first assessment to generate category proficiency breakdown.
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.category_breakdown.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-[#1c130d]">{cat.category}</span>
                    <span className="font-mono font-bold text-[#b46927]">{cat.avg_percentage}%</span>
                  </div>
                  <Progress value={cat.avg_percentage} variant="caramel" size="sm" />
                  <div className="flex justify-between text-[10px] text-[#8a7465] font-mono">
                    <span>{cat.attempts} attempts</span>
                    <span className="text-emerald-700 font-bold">{cat.passed} passed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Exam Activity Stream */}
        <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-[#e8dfd5] pb-3">
            <h2 className="text-xs font-bold text-[#1c130d] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8a7465]" />
              <span>Recent Activity Stream</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('history')}
            >
              Full History
            </Button>
          </div>

          {recentAttempts.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-6 h-6 text-[#b46927]" />}
              title="No Attempts Completed Yet"
              description="Start your assessment journey by browsing published quizzes and test your skills."
              primaryActionLabel="Browse Catalog"
              onPrimaryAction={() => onNavigate('catalog')}
            />
          ) : (
            <div className="space-y-6">
              {/* Score Trajectory Area Chart */}
              {recentAttempts.length >= 2 && (
                <div className="p-4 bg-[#faf7f2] rounded-2xl border border-[#e8dfd5] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1c130d] uppercase tracking-wider flex items-center gap-1.5">
                      <ChartIcon className="w-3.5 h-3.5 text-[#b46927]" />
                      <span>Score Trajectory</span>
                    </span>
                    <span className="text-[10px] text-[#8a7465] font-mono">Recent Assessments</span>
                  </div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[...recentAttempts].reverse().map((att, idx) => ({
                          attempt: `#${idx + 1}`,
                          score: att.percentage,
                          title: att.quiz_title,
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#b46927" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#b46927" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="attempt" stroke="#8a7465" fontSize={10} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="#8a7465" fontSize={10} tickLine={false} unit="%" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e8dfd5',
                            borderRadius: '16px',
                            fontSize: '11px',
                            color: '#1c130d',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                          }}
                          formatter={(value: unknown) => [`${value}%`, 'Score']}
                        />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="#b46927"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#scoreGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* List of Recent Attempts */}
              <div className="divide-y divide-[#e8dfd5]">
                {recentAttempts.map((att) => (
                  <div
                    key={att.id}
                    className="py-4 flex items-center justify-between gap-4 group hover:bg-[#faf7f2] px-3 rounded-2xl transition-all"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#1c130d] group-hover:text-[#b46927] transition-colors">
                        {att.quiz_title}
                      </div>
                      <div className="text-[11px] text-[#8a7465] flex items-center gap-2 font-mono">
                        <span>{new Date(att.started_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{Math.round(att.time_taken_seconds / 60)} min duration</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-black text-[#1c130d] font-mono">
                          {att.percentage}%
                        </div>
                        <Badge variant={att.passed ? 'success' : 'danger'} size="sm">
                          {att.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </div>

                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() =>
                          onNavigate('result', { attemptId: att.id, quizTitle: att.quiz_title })
                        }
                      >
                        Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
