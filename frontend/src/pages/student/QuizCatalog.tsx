import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Clock,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Cloud,
  Database,
  Binary,
  Layers,
  Code2,
  BrainCircuit,
  Award,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  SlidersHorizontal,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { useQuizzesQuery } from '../../hooks/useQuizzes';
import { useCategoriesQuery } from '../../hooks/useCategories';
import { QuizStudentSummary } from '../../types';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { NavigateFunction } from '../../types/navigation';

interface QuizCatalogProps {
  onNavigate: NavigateFunction;
}

type SortOption = 'default' | 'duration-asc' | 'duration-desc' | 'questions-desc' | 'pass-asc';
type StatusFilter = 'all' | 'unattempted' | 'passed' | 'attempted';

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case 'cybersecurity-web-security':
      return <ShieldCheck className="w-3.5 h-3.5" />;
    case 'cloud-architecture-devops':
      return <Cloud className="w-3.5 h-3.5" />;
    case 'database-engineering-sql':
      return <Database className="w-3.5 h-3.5" />;
    case 'algorithms-data-structures':
      return <Binary className="w-3.5 h-3.5" />;
    case 'system-design-scalability':
      return <Layers className="w-3.5 h-3.5" />;
    case 'fullstack-react-typescript':
      return <Code2 className="w-3.5 h-3.5" />;
    case 'ai-ml-engineering':
      return <BrainCircuit className="w-3.5 h-3.5" />;
    default:
      return <BookOpen className="w-3.5 h-3.5" />;
  }
};

export const QuizCatalog: React.FC<QuizCatalogProps> = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: categories = [] } = useCategoriesQuery(false);
  const {
    data: quizData,
    isLoading: loading,
    isError,
    refetch,
  } = useQuizzesQuery({
    category_id: selectedCategory || undefined,
    search: debouncedSearch || undefined,
    page: 1,
    page_size: 50,
  });

  const rawQuizzes: QuizStudentSummary[] = useMemo(() => quizData?.items || [], [quizData?.items]);

  // Filter and sort client-side
  const filteredQuizzes = useMemo(() => {
    let result = [...rawQuizzes];

    // Status filter
    if (statusFilter === 'passed') {
      result = result.filter((q) => q.user_has_passed);
    } else if (statusFilter === 'attempted') {
      result = result.filter((q) => q.user_attempts_count > 0 && !q.user_has_passed);
    } else if (statusFilter === 'unattempted') {
      result = result.filter((q) => q.user_attempts_count === 0);
    }

    // Sort order
    if (sortBy === 'duration-asc') {
      result.sort((a, b) => a.duration_seconds - b.duration_seconds);
    } else if (sortBy === 'duration-desc') {
      result.sort((a, b) => b.duration_seconds - a.duration_seconds);
    } else if (sortBy === 'questions-desc') {
      result.sort((a, b) => b.question_count - a.question_count);
    } else if (sortBy === 'pass-asc') {
      result.sort((a, b) => a.passing_percentage - b.passing_percentage);
    }

    return result;
  }, [rawQuizzes, statusFilter, sortBy]);

  const totalPublishedCount = categories.reduce((acc, cat) => acc + cat.quiz_count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-br from-white via-[#fbf8f4] to-[#f5efe8] border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#b07238]/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b07238]/10 border border-[#b07238]/20 text-[#b46927] text-xs font-bold font-mono">
              <Sparkles className="w-3.5 h-3.5 text-[#b46927]" />
              <span>Enterprise Assessment Engine • v2.0</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-[#1c130d] tracking-tight">
              Explore Technical Quizzes & Certifications
            </h1>
            
            <p className="text-xs sm:text-sm text-[#5c4738] leading-relaxed">
              Curated examination catalog covering systems design, cloud engineering, cybersecurity, algorithms, databases, and fullstack architecture. Verified with server-authoritative scoring.
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e8dfd5] text-xs font-semibold text-[#1c130d] shadow-sm">
                <BookOpen className="w-3.5 h-3.5 text-[#b46927]" />
                <span>{totalPublishedCount || rawQuizzes.length} Assessments</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e8dfd5] text-xs font-semibold text-[#1c130d] shadow-sm">
                <Layers className="w-3.5 h-3.5 text-[#b46927]" />
                <span>{categories.length} Categories</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e8dfd5] text-xs font-semibold text-[#1c130d] shadow-sm">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Certificates</span>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="w-full lg:w-80 space-y-2">
            <label className="text-xs font-bold text-[#5c4738] uppercase tracking-wider block">
              Instant Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#8a7465] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search topics, skills, keywords..."
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#e8dfd5] rounded-2xl text-[#1c130d] text-xs sm:text-sm focus:outline-none focus:border-[#b46927] focus:ring-2 focus:ring-[#b46927]/20 placeholder:text-[#8a7465] shadow-sm transition"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7465] hover:text-[#1c130d] p-0.5 rounded-full hover:bg-[#f5efe8]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills (Scrollable & Responsive) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#5c4738] uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#b46927]" />
            Filter by Domain
          </span>
          <span className="text-xs text-[#8a7465] font-mono">
            {filteredQuizzes.length} {filteredQuizzes.length === 1 ? 'quiz' : 'quizzes'} displayed
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#e8dfd5] scrollbar-track-transparent">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
              selectedCategory === null
                ? 'bg-[#1c130d] text-white shadow-md shadow-black/10 ring-2 ring-[#1c130d]/20'
                : 'bg-white text-[#5c4738] border border-[#e8dfd5] hover:border-[#b46927] hover:text-[#1c130d] hover:bg-[#faf7f2]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>All Domains</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedCategory === null ? 'bg-white/20 text-white' : 'bg-[#f5efe8] text-[#8a7465]'
            }`}>
              {totalPublishedCount || rawQuizzes.length}
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold tracking-normal transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#b07238] to-[#c89666] text-white font-black shadow-md shadow-[#b07238]/25 ring-2 ring-[#b07238]/30'
                    : 'bg-white text-[#5c4738] border border-[#e8dfd5] hover:border-[#b46927] hover:text-[#1c130d] hover:bg-[#faf7f2]'
                }`}
              >
                {getCategoryIcon(cat.slug)}
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-[#f5efe8] text-[#8a7465]'
                }`}>
                  {cat.quiz_count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Filter & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-white border border-[#e8dfd5] rounded-2xl shadow-sm text-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[#8a7465] font-semibold mr-1 shrink-0">Status:</span>
          {(['all', 'unattempted', 'passed', 'attempted'] as StatusFilter[]).map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider text-[11px] transition cursor-pointer capitalize shrink-0 ${
                  active
                    ? 'bg-[#b07238]/15 text-[#b46927] border border-[#b07238]/30'
                    : 'text-[#5c4738] hover:text-[#1c130d] hover:bg-[#f5efe8]'
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[#8a7465] font-semibold shrink-0">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2.5 py-1 bg-[#faf7f2] border border-[#e8dfd5] rounded-xl text-xs font-semibold text-[#1c130d] focus:outline-none focus:border-[#b46927] cursor-pointer"
          >
            <option value="default">Featured / Default</option>
            <option value="duration-asc">Duration (Shortest First)</option>
            <option value="duration-desc">Duration (Longest First)</option>
            <option value="questions-desc">Most Questions</option>
            <option value="pass-asc">Passing Score (Lowest First)</option>
          </select>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-6 space-y-4 border border-[#e8dfd5] shadow-sm">
              <div className="flex justify-between items-center">
                <Skeleton variant="text" width="90px" height="20px" />
                <Skeleton variant="text" width="60px" height="16px" />
              </div>
              <Skeleton variant="text" width="85%" height="24px" />
              <Skeleton variant="text" width="100%" height="40px" />
              <div className="flex justify-between items-center pt-4 border-t border-[#e8dfd5]">
                <Skeleton variant="text" width="100px" height="16px" />
                <Skeleton variant="rectangular" width="90px" height="34px" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Catalog Synchronization Failed"
          message="Unable to retrieve the list of published quizzes from the server."
          onRetry={() => refetch()}
        />
      ) : filteredQuizzes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-[#b46927]" />}
          title="No Matching Assessments Found"
          description={
            debouncedSearch || selectedCategory || statusFilter !== 'all'
              ? 'No quizzes match your current domain filter, status, or search query. Try clearing filters.'
              : 'No quizzes are currently published in the catalog. Check back soon for new assessments.'
          }
          primaryActionLabel="Clear All Filters"
          onPrimaryAction={() => {
            setSelectedCategory(null);
            setSearchInput('');
            setStatusFilter('all');
            setSortBy('default');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => {
            const hasAttempts = quiz.user_attempts_count > 0;
            const hasPassed = quiz.user_has_passed;

            return (
              <div
                key={quiz.id}
                onClick={() => onNavigate('quiz-detail', { quizId: quiz.id })}
                className="group flex flex-col justify-between bg-white border border-[#e8dfd5] hover:border-[#b07238]/60 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer relative overflow-hidden"
              >
                {/* Subtle Top Gradient Stripe */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#b07238] via-[#d4a373] to-[#e8dfd5] opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-4">
                  {/* Category Pill & Status Indicators */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#b46927] bg-[#b07238]/10 border border-[#b07238]/20 px-2.5 py-1 rounded-full">
                      {getCategoryIcon(quiz.category_slug)}
                      <span className="truncate max-w-[160px]">{quiz.category_name}</span>
                    </span>

                    {hasPassed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full font-mono shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Passed ({quiz.user_best_score}%)</span>
                      </span>
                    ) : hasAttempts ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full font-mono shrink-0">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Attempted ({quiz.user_best_score}%)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#8a7465] font-bold uppercase tracking-wider bg-[#f5efe8] px-2 py-0.5 rounded-md">
                        New
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-[#1c130d] tracking-tight group-hover:text-[#b46927] transition-colors line-clamp-1">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-[#5c4738] mt-1.5 line-clamp-2 leading-relaxed">
                      {quiz.description || 'Comprehensive examination designed to test domain proficiency with server-authoritative timer enforcement.'}
                    </p>
                  </div>

                  {/* Technical Meta Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#5c4738] bg-[#f5efe8] px-2.5 py-1 rounded-lg">
                      <Clock className="w-3 h-3 text-[#b46927]" />
                      <span>{Math.round(quiz.duration_seconds / 60)} min</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#5c4738] bg-[#f5efe8] px-2.5 py-1 rounded-lg">
                      <GraduationCap className="w-3 h-3 text-[#b46927]" />
                      <span>{quiz.question_count} Questions</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-[#5c4738] bg-[#f5efe8] px-2.5 py-1 rounded-lg">
                      <Award className="w-3 h-3 text-amber-600" />
                      <span>{quiz.passing_percentage}% Pass</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer & Action Button */}
                <div className="pt-4 mt-5 border-t border-[#e8dfd5] flex items-center justify-between">
                  <div className="text-[11px] font-mono text-[#8a7465]">
                    {quiz.max_attempts > 1 ? (
                      <span>{quiz.user_attempts_count} of {quiz.max_attempts} attempts</span>
                    ) : (
                      <span>Single attempt</span>
                    )}
                  </div>

                  <Button
                    variant={hasPassed ? "secondary" : "primary"}
                    size="sm"
                    className="font-bold text-xs group-hover:shadow-md transition-all"
                    rightIcon={hasAttempts && !hasPassed ? <RotateCcw className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('quiz-detail', { quizId: quiz.id });
                    }}
                  >
                    {hasPassed ? 'Review' : hasAttempts ? 'Retake' : 'Start Exam'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
