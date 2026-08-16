import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Category, LeaderboardData } from '../../types';
import { 
  Award, 
  CheckCircle, 
  Clock, 
  Crown, 
  Medal, 
  Sparkles, 
  Trophy, 
  User as UserIcon 
} from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await api.get<Category[]>('/categories');
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let url = `/leaderboard?timeframe=${timeframe}`;
      if (selectedCategory) {
        url += `&category_id=${selectedCategory}`;
      }
      const res = await api.get<LeaderboardData>(url);
      setData(res);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Trophy className="w-8 h-8 text-amber-400" />
            Platform Leaderboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Top performers ranked by average assessment percentage, pass rate, and completion speed.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Buttons */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            {(['all', 'monthly', 'weekly'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  timeframe === tf
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf === 'all' ? 'All Time' : tf}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <div className="bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-lg text-white shadow-md">
              #{data.user_entry.rank}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Your Current Ranking
                <span className="text-xs font-normal text-indigo-300">({data.user_entry.user_name})</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {data.user_entry.quizzes_passed} of {data.user_entry.quizzes_taken} assessments passed
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xl font-extrabold text-indigo-400">
              {data.user_entry.average_percentage}%
            </div>
            <div className="text-xs text-slate-400 font-mono">Average Score</div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data?.rankings.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Rankings Yet</h3>
          <p className="text-sm text-slate-400">
            Be the first to complete an assessment in this category!
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-850 text-xs uppercase font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-center w-16">Rank</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4 text-center">Quizzes Passed</th>
                  <th className="px-6 py-4 text-center">Total Points</th>
                  <th className="px-6 py-4 text-center">Avg Score</th>
                  <th className="px-6 py-4 text-right">Total Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data?.rankings.map((entry) => {
                  const isCurrentUser = user?.id === entry.user_id;

                  return (
                    <tr
                      key={entry.user_id}
                      className={`transition ${
                        isCurrentUser ? 'bg-indigo-950/30' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-6 py-4 text-center">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/50 font-bold">
                            🥇
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/50 font-bold">
                            🥈
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/50 font-bold">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-bold text-slate-400">
                            #{entry.rank}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          {entry.user_name}
                          {isCurrentUser && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono font-normal">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-medium">
                        <span className="text-emerald-400 font-bold">{entry.quizzes_passed}</span>
                        <span className="text-xs text-slate-500"> / {entry.quizzes_taken}</span>
                      </td>

                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-200">
                        {entry.total_score}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 font-bold text-xs">
                          {entry.average_percentage}%
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right text-xs text-slate-400 font-mono">
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
