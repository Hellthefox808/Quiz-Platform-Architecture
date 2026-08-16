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
  ArrowRight,
  ArrowUpRight
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search and Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Exam Discovery</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Explore Assessments
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Select a verified technical domain or search by topic to launch a timed, server-scored examination.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assessment..."
              className="w-full pl-10 pr-4 py-2 bg-[#0b1220] border border-slate-800 rounded-xl text-white text-xs placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === null
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-[#0b1220] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Domains
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#0b1220] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat.name} ({cat.quiz_count})
          </button>
        ))}
      </div>

      {/* Quiz Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 bg-[#0b1220] border border-slate-800 rounded-2xl p-8">
          <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No assessments found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query or choosing another domain filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="group bg-[#0b1220] border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail / Header Area */}
                {quiz.thumbnail_url ? (
                  <div className="h-40 w-full relative overflow-hidden bg-slate-900">
                    <img
                      src={quiz.thumbnail_url}
                      alt={quiz.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 text-blue-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                      {quiz.category_name}
                    </span>
                  </div>
                ) : (
                  <div className="h-28 w-full bg-slate-900/60 p-4 flex flex-col justify-between border-b border-slate-800">
                    <span className="self-start bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-blue-500/20">
                      {quiz.category_name}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition tracking-tight line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {quiz.description || 'No description provided for this assessment.'}
                  </p>

                  {/* Metadata Chips */}
                  <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-blue-400" />
                        Time
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5 font-mono">
                        {Math.round(quiz.duration_seconds / 60)} min
                      </div>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-medium">
                        <BookOpen className="w-3 h-3 text-emerald-400" />
                        Items
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5 font-mono">
                        {quiz.question_count}
                      </div>
                    </div>

                    <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-medium">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        Pass %
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5 font-mono">
                        {quiz.passing_percentage}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-5 pt-0">
                <button
                  onClick={() => onNavigate('quiz-detail', { quizId: quiz.id })}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-800 hover:border-blue-600 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition duration-150 cursor-pointer"
                >
                  <span>Assessment Brief</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
