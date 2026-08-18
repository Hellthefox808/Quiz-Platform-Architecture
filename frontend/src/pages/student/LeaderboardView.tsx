import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Trophy } from 'lucide-react';
import { useLeaderboardQuery } from '../../hooks/useLeaderboard';
import { useCategoriesQuery } from '../../hooks/useCategories';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

export const LeaderboardView: React.FC = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('ALL_TIME');

  const { data: categories = [] } = useCategoriesQuery(false);
  const {
    data,
    isLoading: loading,
  } = useLeaderboardQuery(timeframe, selectedCategory || undefined);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#e8dfd5]">
        <div>
          <span className="text-xs font-bold text-[#b46927] uppercase tracking-wider">Global Rankings</span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight mt-1 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-600" />
            Platform Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-[#5c4738] mt-2 max-w-xl">
            Top performers ranked by average assessment percentage, pass rate, and completion speed.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Buttons */}
          <div className="flex rounded-2xl bg-white border border-[#e8dfd5] p-1 shadow-sm">
            {(['ALL_TIME', 'MONTHLY', 'WEEKLY'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#1c130d] text-white shadow-sm'
                    : 'text-[#5c4738] hover:text-[#1c130d]'
                }`}
              >
                {tf === 'ALL_TIME' ? 'All Time' : tf.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-[#e8dfd5] text-[#1c130d] text-xs font-bold rounded-2xl px-4 py-2.5 focus:outline-none focus:border-[#b46927] cursor-pointer shadow-sm"
          >
            <option value="">All Domains</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Current User Rank Card (If applicable) */}
      {data?.user_entry && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 flex items-center justify-between shadow-sm relative overflow-hidden border border-[#e8dfd5]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#b46927]" />
          <div className="flex items-center gap-4 pl-2">
            <div className="w-12 h-12 rounded-2xl bg-[#b07238]/10 border border-[#b07238]/20 flex items-center justify-center font-black text-xl text-[#b46927] font-mono shadow-sm">
              #{data.user_entry.rank}
            </div>
            <div>
              <div className="text-sm font-black text-[#1c130d] flex items-center gap-2">
                Your Current Ranking
                <span className="text-[10px] font-semibold text-[#5c4738] bg-[#f5efe8] px-2 py-0.5 rounded-full border border-[#e8dfd5]">({data.user_entry.user_name})</span>
              </div>
              <div className="text-xs text-[#5c4738] mt-1 font-medium">
                {data.user_entry.quizzes_passed} of {data.user_entry.quizzes_taken} assessments passed
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black text-[#1c130d] font-mono tracking-tight">
              {data.user_entry.average_percentage}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#b46927] font-bold mt-0.5 font-mono">Average Score</div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-6 space-y-4 border border-[#e8dfd5] shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#e8dfd5]/60">
              <Skeleton variant="text" width="60px" height="18px" />
              <Skeleton variant="text" width="180px" height="18px" />
              <Skeleton variant="text" width="60px" height="18px" />
              <Skeleton variant="text" width="80px" height="22px" />
            </div>
          ))}
        </div>
      ) : !data || data.rankings.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-10 h-10 text-amber-600" />}
          title="No Rankings Recorded Yet"
          description="Be the first to complete an assessment in this category to establish the leaderboard!"
        />
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e8dfd5]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#5c4738]">
              <thead className="bg-[#f5efe8] text-[10px] uppercase font-mono tracking-wider text-[#8a7465] border-b border-[#e8dfd5]">
                <tr>
                  <th className="px-6 py-4 text-center w-16">Rank</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4 text-center">Quizzes Passed</th>
                  <th className="px-6 py-4 text-center">Total Points</th>
                  <th className="px-6 py-4 text-center">Avg Score</th>
                  <th className="px-6 py-4 text-right">Total Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfd5]">
                {data.rankings.map((entry) => {
                  const isCurrentUser = user?.id === entry.user_id;

                  return (
                    <tr
                      key={entry.user_id}
                      className={`transition-colors ${
                        isCurrentUser ? 'bg-[#b07238]/5 font-semibold hover:bg-[#b07238]/10' : 'hover:bg-[#faf7f2]'
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 border border-amber-300 font-bold text-lg">
                            🥇
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-300 font-bold text-lg">
                            🥈
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 border border-amber-200 font-bold text-lg">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] font-bold text-[#8a7465]">
                            #{entry.rank}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1c130d] flex items-center gap-2 text-sm">
                          {entry.user_name}
                          {isCurrentUser && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#b07238]/10 text-[#b46927] border border-[#b07238]/20 font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-medium">
                        <span className="text-emerald-700 font-bold font-mono">{entry.quizzes_passed}</span>
                        <span className="text-[11px] text-[#8a7465] font-mono"> / {entry.quizzes_taken}</span>
                      </td>

                      <td className="px-6 py-4 text-center font-mono font-bold text-[#1c130d]">
                        {entry.total_score}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <Badge variant="info" size="sm">
                          {entry.average_percentage}%
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right text-[11px] text-[#8a7465] font-mono">
                        {Math.round(entry.total_time_seconds / 60)} min
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
