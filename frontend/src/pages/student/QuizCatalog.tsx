import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Category, QuizStudentSummary } from '../../types';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  HelpCircle, 
  Layers, 
  Search, 
  Sparkles, 
  Tag, 
  Trophy,
  ArrowRight
} from 'lucide-react';

interface QuizCatalogProps {
  onNavigate: (view: string, params?: any) => void;
}

export const QuizCatalog: React.FC<QuizCatalogProps> = ({ onNavigate }) => {
  const [quizzes, setQuizzes] = useState<QuizStudentSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      let url = `/quizzes?page=1&page_size=30`;
      if (selectedCategory) {
        url += `&category_id=${selectedCategory}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const data = await api.get<{ items: QuizStudentSummary[] }>(url);
      setQuizzes(data.items);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuizzes();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Explore Assessments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Standardized technical assessments with immutable versioning and instant verified results.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by quiz title or topic..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </form>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === null
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Topics
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat.name} ({cat.quiz_count})
          </button>
        ))}
      </div>

      {/* Quiz Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No quizzes found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Try adjusting your search criteria or selecting a different category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col justify-between hover:shadow-indigo-500/5"
            >
              <div>
                {/* Thumbnail / Header Area */}
                {quiz.thumbnail_url ? (
                  <div className="h-44 w-full relative overflow-hidden bg-slate-800">
                    <img
                      src={quiz.thumbnail_url}
                      alt={quiz.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-indigo-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      {quiz.category_name}
                    </span>
                  </div>
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900 p-4 flex flex-col justify-between border-b border-slate-800">
                    <span className="self-start bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-indigo-500/30">
                      {quiz.category_name}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition tracking-tight line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {quiz.description || 'No description provided for this assessment.'}
                  </p>

                  {/* Metadata Chips */}
                  <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-800/60 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        Duration
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {Math.round(quiz.duration_seconds / 60)} min
                      </div>
                    </div>

                    <div className="bg-slate-800/60 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <BookOpen className="w-3 h-3 text-emerald-400" />
                        Questions
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {quiz.question_count}
                      </div>
                    </div>

                    <div className="bg-slate-800/60 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        Pass Mark
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {quiz.passing_percentage}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-5 pt-0">
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                  <div className="text-xs text-slate-400">
                    {quiz.user_attempts_count > 0 ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Best: {quiz.user_best_score}% ({quiz.user_attempts_count}/{quiz.max_attempts})
                      </span>
                    ) : (
                      <span>{quiz.max_attempts} attempts allowed</span>
                    )}
                  </div>

                  <button
                    onClick={() => onNavigate('quiz-detail', { quizId: quiz.id })}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <span>View Assessment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
