import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Trophy,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useQuizDetailQuery, useQuizMutations } from '../../hooks/useQuizzes';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { NavigateFunction } from '../../types/navigation';

interface QuizDetailProps {
  quizId: string;
  onNavigate: NavigateFunction;
}

export const QuizDetail: React.FC<QuizDetailProps> = ({ quizId, onNavigate }) => {
  const { data: quiz, isLoading: loading, isError, refetch } = useQuizDetailQuery(quizId);
  const { startQuizAttempt } = useQuizMutations();
  const [startError, setStartError] = useState<string | null>(null);

  const handleStartOrResume = async () => {
    setStartError(null);
    try {
      if (quiz?.active_attempt_id) {
        onNavigate('assessment', { attemptId: quiz.active_attempt_id });
        return;
      }
      const attempt = await startQuizAttempt.mutateAsync(quizId);
      onNavigate('assessment', { attemptId: attempt.id });
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      setStartError(errObj?.message || 'Unable to start assessment session.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-pulse">
        <Skeleton variant="text" width="160px" height="20px" />
        <div className="bg-white rounded-3xl p-8 space-y-4 border border-[#e8dfd5]">
          <Skeleton variant="text" width="100px" height="20px" />
          <Skeleton variant="text" width="60%" height="32px" />
          <Skeleton variant="text" width="80%" height="16px" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-5 space-y-2 border border-[#e8dfd5]">
              <Skeleton variant="text" width="60px" height="14px" className="mx-auto" />
              <Skeleton variant="text" width="80px" height="24px" className="mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <ErrorState
          title="Assessment Unavailable"
          message="We could not load this assessment's configuration and snapshot from the server."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const starting = startQuizAttempt.isPending;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Back button */}
      <button
        onClick={() => onNavigate('catalog')}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5c4738] hover:text-[#1c130d] transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Assessments
      </button>

      {/* Hero Card */}
      <div className="bg-white border border-[#e8dfd5] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b46927] bg-[#b07238]/10 border border-[#b07238]/20 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{quiz.category_name}</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight">
              {quiz.title}
            </h1>
            <p className="text-sm text-[#5c4738] leading-relaxed max-w-xl">
              {quiz.description || 'Test your proficiency with standardized technical questions and verified server-authoritative grading.'}
            </p>
            {startError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                {startError}
              </div>
            )}
          </div>

          {/* Start CTA Card */}
          <div className="sm:w-64 bg-[#faf7f2] border border-[#e8dfd5] rounded-3xl p-5 text-center flex flex-col justify-between shrink-0 shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-[#8a7465] uppercase tracking-wider block">
                Attempts Remaining
              </span>
              <span className="text-3xl font-black text-[#1c130d] mt-1 block font-mono">
                {Math.max(0, quiz.max_attempts - quiz.user_attempts_count)}{' '}
                <span className="text-sm font-normal text-[#8a7465]">/ {quiz.max_attempts}</span>
              </span>
            </div>

            <div className="mt-6">
              <Button
                variant={quiz.active_attempt_id ? 'primary' : quiz.user_can_attempt ? 'primary' : 'secondary'}
                size="md"
                className="w-full font-bold shadow-md"
                disabled={starting || !quiz.user_can_attempt}
                isLoading={starting}
                onClick={handleStartOrResume}
                leftIcon={
                  quiz.active_attempt_id ? (
                    <RotateCcw className="w-4 h-4" />
                  ) : quiz.user_can_attempt ? (
                    <Play className="w-4 h-4 fill-current" />
                  ) : undefined
                }
              >
                {quiz.active_attempt_id
                  ? 'Resume Attempt'
                  : quiz.user_can_attempt
                  ? 'Start Assessment'
                  : 'Limit Reached'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 text-center border border-[#e8dfd5] shadow-sm">
          <Clock className="w-5 h-5 text-[#b46927] mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a7465]">Time Limit</div>
          <div className="text-lg font-bold text-[#1c130d] mt-1 font-mono">
            {Math.round(quiz.duration_seconds / 60)} min
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 text-center border border-[#e8dfd5] shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a7465]">Questions</div>
          <div className="text-lg font-bold text-[#1c130d] mt-1 font-mono">
            {quiz.question_count}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 text-center border border-[#e8dfd5] shadow-sm">
          <Trophy className="w-5 h-5 text-amber-600 mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a7465]">Pass Score</div>
          <div className="text-lg font-bold text-[#1c130d] mt-1 font-mono">
            {quiz.passing_percentage}%
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 text-center border border-[#e8dfd5] shadow-sm">
          <Award className="w-5 h-5 text-[#b46927] mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a7465]">Total Marks</div>
          <div className="text-lg font-bold text-[#1c130d] mt-1 font-mono">
            {quiz.total_marks}
          </div>
        </div>
      </div>

      {/* Assessment Guidelines & Rules */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 space-y-5 border border-[#e8dfd5] shadow-sm">
        <h2 className="text-xs font-bold text-[#1c130d] uppercase tracking-wider flex items-center gap-2 border-b border-[#e8dfd5] pb-4">
          <Info className="w-4 h-4 text-[#b46927]" />
          Examination Integrity & Guidelines
        </h2>
        <ul className="space-y-3.5 text-xs text-[#5c4738] leading-relaxed">
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#b46927] mt-1.5 shrink-0" />
            <div>
              <strong className="text-[#1c130d]">Server-Authoritative Timing:</strong> The countdown timer is strictly verified and enforced by the backend server. Modifying local clocks will not extend testing duration.
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#b46927] mt-1.5 shrink-0" />
            <div>
              <strong className="text-[#1c130d]">Continuous Autosave:</strong> Every choice is debounced and synchronized with exponential backoff. In the event of a momentary network dropout, saves pause safely and resume on reconnect.
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#b46927] mt-1.5 shrink-0" />
            <div>
              <strong className="text-[#1c130d]">Negative Marking Policy:</strong>{' '}
              {quiz.negative_marking_enabled ? (
                <span className="text-rose-700 font-semibold">
                  Enabled (-{quiz.negative_mark_value} marks per incorrect answer). Unanswered questions receive 0 marks with no penalty.
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">
                  Disabled. No negative penalty for incorrect answers.
                </span>
              )}
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#b46927] mt-1.5 shrink-0" />
            <div>
              <strong className="text-[#1c130d]">Verifiable Credential:</strong> Achieving {quiz.passing_percentage}% or higher generates an immutable verified certificate.
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};
