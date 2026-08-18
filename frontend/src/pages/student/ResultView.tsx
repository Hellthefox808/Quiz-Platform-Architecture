import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useResultQuery } from '../../hooks/useResult';
import { Card } from '../../components/ui/Card';
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
        <div className="assess-surface rounded-2xl p-8 space-y-4 border border-[#38281e]">
          <Skeleton variant="text" width="100px" height="20px" />
          <Skeleton variant="text" width="70%" height="32px" />
          <Skeleton variant="text" width="40%" height="16px" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="assess-surface rounded-2xl p-5 space-y-2 border border-[#38281e]">
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Top Navigation */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#cbb8a9] hover:text-[#faf4ee] transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Result Hero Banner */}
      <Card
        variant="raised"
        className={`p-6 sm:p-8 border ${
          result.passed
            ? 'border-emerald-500/30'
            : 'border-rose-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <Badge variant={result.passed ? 'success' : 'danger'} size="md" dot>
              {result.passed ? 'Assessment Passed' : 'Assessment Failed'}
            </Badge>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight">
              {result.quiz_title}
            </h1>
            <p className="text-[11px] text-[#cbb8a9] font-mono">
              Submitted on {new Date(result.submitted_at).toLocaleDateString()} at{' '}
              {new Date(result.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Score Badge Card */}
          <div className="text-center bg-[#110c09] border border-[#38281e] rounded-2xl p-6 min-w-44 shadow-inner shrink-0">
            <span className="text-4xl font-extrabold text-[#faf4ee] tracking-tight font-mono">{result.percentage}%</span>
            <div className="text-xs text-[#cbb8a9] mt-2 font-medium">
              Score: {result.obtained_marks} / {result.total_marks}
            </div>
            <div className="text-[10px] text-[#887467] mt-1 font-mono uppercase tracking-wider">
              Pass mark: {result.passing_percentage}%
            </div>
          </div>
        </div>

        {/* Certificate Earned Banner */}
        {result.certificate_code && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-300 block">Official Credential Issued</span>
                <span className="text-[#cbb8a9] font-mono text-[10px]">Verification Code: {result.certificate_code}</span>
              </div>
            </div>
            <Button
              variant="glass"
              size="sm"
              onClick={() => onNavigate('certificates')}
            >
              View Certificate
            </Button>
          </div>
        )}
      </Card>

      {/* Metrics Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card variant="surface" className="text-center border border-[#38281e]">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#887467]">Correct</div>
          <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">{result.correct_count}</div>
        </Card>

        <Card variant="surface" className="text-center border border-[#38281e]">
          <XCircle className="w-5 h-5 text-rose-400 mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#887467]">Incorrect</div>
          <div className="text-lg font-bold text-rose-400 mt-1 font-mono">{result.incorrect_count}</div>
        </Card>

        <Card variant="surface" className="text-center border border-[#38281e]">
          <HelpCircle className="w-5 h-5 text-[#887467] mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#887467]">Unanswered</div>
          <div className="text-lg font-bold text-[#faf4ee] mt-1 font-mono">{result.unanswered_count}</div>
        </Card>

        <Card variant="surface" className="text-center border border-[#38281e]">
          <Clock className="w-5 h-5 text-[#d4a373] mx-auto mb-2" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#887467]">Time Taken</div>
          <div className="text-lg font-bold text-[#faf4ee] mt-1 font-mono">
            {Math.round(result.time_taken_seconds / 60)} min
          </div>
        </Card>
      </div>

      {/* Detailed Question Review List */}
      {result.questions_review && result.questions_review.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-[#faf4ee] uppercase tracking-wider">Item Evaluation Review</h2>
          <div className="space-y-4">
            {result.questions_review.map((q, idx) => (
              <Card
                key={idx}
                variant="surface"
                className={`space-y-4 border ${
                  q.is_correct
                    ? 'border-emerald-500/20'
                    : q.selected_option_id
                    ? 'border-rose-500/20'
                    : 'border-[#38281e]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#38281e]/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#d4a373]">
                      Item {q.question_order}
                    </span>
                    <span className="text-xs text-[#cbb8a9]">
                      ({q.marks_awarded} / {q.marks} Marks)
                    </span>
                  </div>

                  <Badge variant={q.is_correct ? 'success' : q.selected_option_id ? 'danger' : 'neutral'} size="sm">
                    {q.is_correct ? 'Correct' : q.selected_option_id ? 'Incorrect' : 'Unanswered'}
                  </Badge>
                </div>

                <div className="text-sm font-medium text-[#faf4ee] leading-relaxed">
                  {q.question_text}
                </div>

                {/* Options Review */}
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = opt.is_selected;
                    const isCorrect = opt.is_correct;

                    let optBg = 'bg-[#110c09] border-[#38281e]/80 text-[#cbb8a9]';
                    if (isCorrect) {
                      optBg = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optBg = 'bg-rose-500/10 border-rose-500/40 text-rose-300 font-semibold';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${optBg}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold w-5 h-5 rounded flex items-center justify-center bg-[#231a14]">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt.option_text}</span>
                        </div>
                        {isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                            Correct Answer
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3.5 rounded-xl bg-[#110c09] border border-[#38281e] text-xs text-[#cbb8a9] space-y-1">
                    <span className="font-bold text-[#d4a373] block uppercase tracking-wider text-[10px]">
                      Explanation
                    </span>
                    <p className="leading-relaxed text-[#cbb8a9]">{q.explanation}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
