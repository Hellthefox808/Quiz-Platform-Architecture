import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Trophy } from 'lucide-react';
import { useLeaderboardQuery } from '../../hooks/useLeaderboard';
import { useCategoriesQuery } from '../../hooks/useCategories';
import { Card } from '../../components/ui/Card';
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#38281e]">
        <div>
          <span className="text-xs font-bold text-[#d4a373] uppercase tracking-wider">Global Rankings</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight mt-1 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-400" />
            Platform Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-[#cbb8a9] mt-2 max-w-xl">
            Top performers ranked by average assessment percentage, pass rate, and completion speed.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Buttons */}
          <div className="flex rounded-xl bg-[#110c09] border border-[#38281e] p-1">
            {(['ALL_TIME', 'MONTHLY', 'WEEKLY'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  timeframe === tf
                    ? 'bg-gradient-to-r from-[#c89666] to-[#d4a373] text-[#17110d] font-black shadow-sm'
                    : 'text-[#cbb8a9] hover:text-[#faf4ee]'
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
            className="bg-[#110c09] border border-[#38281e] text-[#faf4ee] text-xs font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] cursor-pointer shadow-inner"
          >
            <option value="">All Categories</option>
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
        <Card variant="raised" className="p-5 sm:p-6 flex items-center justify-between shadow-xl relative overflow-hidden border border-[#4e382b]">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#d4a373]" />
          <div className="flex items-center gap-4 pl-2">
            <div className="w-12 h-12 rounded-xl bg-[#c89666]/15 border border-[#c89666]/30 flex items-center justify-center font-black text-xl text-[#d4a373] font-mono shadow-sm">
              #{data.user_entry.rank}
            </div>
            <div>
              <div className="text-sm font-bold text-[#faf4ee] flex items-center gap-2">
                Your Current Ranking
                <span className="text-[10px] font-medium text-[#cbb8a9] bg-[#231a14] px-2 py-0.5 rounded-full border border-[#38281e]">({data.user_entry.user_name})</span>
              </div>
              <div className="text-xs text-[#cbb8a9] mt-1">
                {data.user_entry.quizzes_passed} of {data.user_entry.quizzes_taken} assessments passed
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-extrabold text-[#faf4ee] font-mono tracking-tight">
              {data.user_entry.average_percentage}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#d4a373] font-bold mt-0.5 font-mono">Average Score</div>
          </div>
        </Card>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div className="assess-surface rounded-2xl p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#38281e]/50">
              <Skeleton variant="text" width="60px" height="18px" />
              <Skeleton variant="text" width="180px" height="18px" />
              <Skeleton variant="text" width="60px" height="18px" />
              <Skeleton variant="text" width="80px" height="22px" />
            </div>
          ))}
        </div>
      ) : !data || data.rankings.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-8 h-8" />}
          title="No Rankings Recorded Yet"
          description="Be the first to complete an assessment in this category to establish the leaderboard!"
        />
      ) : (
        <div className="assess-surface rounded-2xl overflow-hidden shadow-xl border border-[#38281e]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#cbb8a9]">
              <thead className="bg-[#110c09] text-[10px] uppercase font-mono tracking-wider text-[#887467] border-b border-[#38281e]">
                <tr>
                  <th className="px-6 py-4 text-center w-16">Rank</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4 text-center">Quizzes Passed</th>
                  <th className="px-6 py-4 text-center">Total Points</th>
                  <th className="px-6 py-4 text-center">Avg Score</th>
                  <th className="px-6 py-4 text-right">Total Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38281e]/60">
                {data.rankings.map((entry) => {
                  const isCurrentUser = user?.id === entry.user_id;

                  return (
                    <tr
                      key={entry.user_id}
                      className={`transition-colors ${
                        isCurrentUser ? 'bg-[#c89666]/15 hover:bg-[#c89666]/20' : 'hover:bg-[#231a14]/40'
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30 font-bold text-lg">
                            🥇
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/15 text-slate-300 border border-slate-300/30 font-bold text-lg">
                            🥈
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/15 text-amber-600 border border-amber-700/30 font-bold text-lg">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] font-bold text-[#887467]">
                            #{entry.rank}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-[#faf4ee] flex items-center gap-2 text-sm">
                          {entry.user_name}
                          {isCurrentUser && (
                            <Badge variant="accent" size="sm">
                              You
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-medium">
                        <span className="text-emerald-400 font-bold font-mono">{entry.quizzes_passed}</span>
                        <span className="text-[11px] text-[#887467] font-mono"> / {entry.quizzes_taken}</span>
                      </td>

                      <td className="px-6 py-4 text-center font-mono font-bold text-[#faf4ee]">
                        {entry.total_score}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <Badge variant="info" size="sm">
                          {entry.average_percentage}%
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right text-[11px] text-[#887467] font-mono">
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
