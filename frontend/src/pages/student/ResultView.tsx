import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldCheck,
  XCircle,
  Award,
  Sparkles,
} from 'lucide-react';
import { useResultQuery } from '../../hooks/useResult';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { NavigateFunction } from '../../types/navigation';

interface ResultViewProps {
  attemptId?: string;
  resultId?: string;
  onNavigate: NavigateFunction;
}

export const ResultView: React.FC<ResultViewProps> = ({ attemptId, resultId, onNavigate }) => {
  const { data: result, isLoading: loading, isError, error, refetch } = useResultQuery(resultId, attemptId);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-pulse">
        <Skeleton variant="text" width="160px" height="20px" />
        <div className="bg-white rounded-3xl p-8 space-y-4 border border-[#e8dfd5]">
          <Skeleton variant="text" width="100px" height="20px" />
          <Skeleton variant="text" width="70%" height="32px" />
          <Skeleton variant="text" width="40%" height="16px" />
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

  if (isError || !result) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <ErrorState
          title="Unable to Load Assessment Result"
          message={error instanceof Error ? error.message : 'Result details are unavailable.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5c4738] hover:text-[#1c130d] transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Result Hero Banner */}
      <div
        className={`bg-white rounded-3xl p-6 sm:p-8 border shadow-sm ${
          result.passed
            ? 'border-emerald-200 shadow-emerald-500/5'
            : 'border-rose-200 shadow-rose-500/5'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <Badge variant={result.passed ? 'success' : 'danger'} size="md" dot>
              {result.passed ? 'Assessment Passed' : 'Assessment Failed'}
            </Badge>

            <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight">
              {result.quiz_title}
            </h1>
            <p className="text-[11px] text-[#8a7465] font-mono">
              Submitted on {new Date(result.submitted_at).toLocaleDateString()} at{' '}
              {new Date(result.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Score Badge Card */}
          <div className="text-center bg-[#faf7f2] border border-[#e8dfd5] rounded-3xl p-6 min-w-44 shadow-sm shrink-0">
            <span className="text-4xl sm:text-5xl font-black text-[#1c130d] tracking-tight font-mono">{result.percentage}%</span>
            <div className="text-xs text-[#5c4738] mt-2 font-bold font-mono">
              Score: {result.obtained_marks} / {result.total_marks}
            </div>
            <div className="text-[10px] text-[#8a7465] mt-1 font-mono uppercase tracking-wider">
              Pass mark: {result.passing_percentage}%
            </div>
          </div>
        </div>

        {/* Certificate Earned Banner */}
        {result.certificate_code && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Official Credential Issued
                </span>
                <span className="text-[#5c4738] font-mono text-[11px]">Verification Code: {result.certificate_code}</span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              rightIcon={<Award className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('certificates')}
            >
              View Certificate
            </Button>
          </div>
        )}
      </div>

      {/* Metrics Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 text-center border border-[#e8dfd5] shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a7465]">Correct</div>
          <div className="text-lg font-bold text-emerald-700 mt-1 font-mono">{result.correct_count}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 text-center border border-[#e8dfd5] shadow-sm">
          <XCircle className="w-5 h-5 text-rose-600 mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a7465]">Incorrect</div>
          <div className="text-lg font-bold text-rose-700 mt-1 font-mono">{result.incorrect_count}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 text-center border border-[#e8dfd5] shadow-sm">
          <HelpCircle className="w-5 h-5 text-[#8a7465] mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a7465]">Unanswered</div>
          <div className="text-lg font-bold text-[#1c130d] mt-1 font-mono">{result.unanswered_count}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 text-center border border-[#e8dfd5] shadow-sm">
          <Clock className="w-5 h-5 text-[#b46927] mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a7465]">Time Taken</div>
          <div className="text-lg font-bold text-[#1c130d] mt-1 font-mono">
            {Math.round(result.time_taken_seconds / 60)} min
          </div>
        </div>
      </div>

      {/* Detailed Question Review List */}
      {result.questions_review && result.questions_review.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#1c130d] uppercase tracking-wider">Item Evaluation Review</h2>
          <div className="space-y-4">
            {result.questions_review.map((q, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-3xl p-6 space-y-4 border shadow-sm ${
                  q.is_correct
                    ? 'border-emerald-200'
                    : q.selected_option_id
                    ? 'border-rose-200'
                    : 'border-[#e8dfd5]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#e8dfd5] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#b46927]">
                      Item {q.question_order}
                    </span>
                    <span className="text-xs text-[#5c4738]">
                      ({q.marks_awarded} / {q.marks} Marks)
                    </span>
                  </div>

                  <Badge variant={q.is_correct ? 'success' : q.selected_option_id ? 'danger' : 'neutral'} size="sm">
                    {q.is_correct ? 'Correct' : q.selected_option_id ? 'Incorrect' : 'Unanswered'}
                  </Badge>
                </div>

                <div className="text-sm font-semibold text-[#1c130d] leading-relaxed">
                  {q.question_text}
                </div>

                {/* Options Review */}
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = opt.is_selected;
                    const isCorrect = opt.is_correct;

                    let optBg = 'bg-[#faf7f2] border-[#e8dfd5] text-[#5c4738]';
                    if (isCorrect) {
                      optBg = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optBg = 'bg-rose-50 border-rose-300 text-rose-900 font-semibold';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${optBg}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold w-5 h-5 rounded-lg flex items-center justify-center bg-white border border-[#e8dfd5] text-[#1c130d] text-[11px]">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt.option_text}</span>
                        </div>
                        {isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono shrink-0">
                            ✓ Correct Answer
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-mono shrink-0">
                            ✕ Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e8dfd5] text-xs text-[#5c4738] space-y-1">
                    <span className="font-bold text-[#b46927] block uppercase tracking-wider text-[10px]">
                      Explanation
                    </span>
                    <p className="leading-relaxed text-[#5c4738]">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
