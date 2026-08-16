import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { ResultResponse } from '../../types';
import { 
  AlertCircle, 
  ArrowLeft, 
  Award, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  RotateCcw, 
  ShieldCheck, 
  Trophy, 
  XCircle 
} from 'lucide-react';

interface ResultViewProps {
  attemptId?: string;
  resultId?: string;
  onNavigate: (view: string, params?: any) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ attemptId, resultId, onNavigate }) => {
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResult = async () => {
      try {
        let resData: ResultResponse;
        if (resultId) {
          resData = await api.get<ResultResponse>(`/attempts/results/${resultId}`);
        } else if (attemptId) {
          // Attempt submit returns result
          resData = await api.post<ResultResponse>(`/attempts/${attemptId}/submit`);
        } else {
          throw new Error('No result or attempt ID specified');
        }
        setResult(resData);
      } catch (err: any) {
        setError(err.message || 'Failed to load assessment result');
      } finally {
        setLoading(false);
      }
    };
    loadResult();
  }, [attemptId, resultId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Evaluating assessment responses...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Unable to Load Result</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'Result details are unavailable.'}</p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top action */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Result Hero Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border shadow-2xl relative overflow-hidden ${
          result.passed
            ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/30'
            : 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border-rose-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span
              className={`inline-block text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                result.passed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {result.passed ? 'Assessment Passed' : 'Assessment Failed'}
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {result.quiz_title}
            </h1>
            <p className="text-xs text-slate-400">
              Completed on {new Date(result.submitted_at).toLocaleDateString()} at{' '}
              {new Date(result.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Score Circle */}
          <div className="text-center bg-slate-900/80 border border-slate-800 rounded-3xl p-6 min-w-44 shadow-lg shrink-0">
            <span className="text-4xl font-black text-white tracking-tight">{result.percentage}%</span>
            <div className="text-xs text-slate-400 mt-1">
              Score: {result.obtained_marks} / {result.total_marks}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
              Pass mark: {result.passing_percentage}%
            </div>
          </div>
        </div>

        {/* Certificate Badge if issued */}
        {result.certificate_code && (
          <div className="mt-6 pt-6 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-300">Official Certificate Issued</div>
                <div className="text-[11px] text-slate-400 font-mono">Code: {result.certificate_code}</div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('certificates')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition self-start sm:self-auto cursor-pointer"
            >
              View Certificate
            </button>
          </div>
        )}
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
          <div className="text-xs text-slate-400">Correct</div>
          <div className="text-lg font-bold text-emerald-400 mt-0.5">{result.correct_count}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <XCircle className="w-5 h-5 text-rose-400 mx-auto mb-1.5" />
          <div className="text-xs text-slate-400">Incorrect</div>
          <div className="text-lg font-bold text-rose-400 mt-0.5">{result.incorrect_count}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <HelpCircle className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
          <div className="text-xs text-slate-400">Unanswered</div>
          <div className="text-lg font-bold text-slate-300 mt-0.5">{result.unanswered_count}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <Clock className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
          <div className="text-xs text-slate-400">Time Taken</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {Math.round(result.time_taken_seconds / 60)} min
          </div>
        </div>
      </div>

      {/* Detailed Question Review (If enabled) */}
      {result.questions_review && result.questions_review.length > 0 ? (
        <div className="space-y-6 pt-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            Detailed Question Review
          </h2>

          <div className="space-y-4">
            {result.questions_review.map((q, idx) => (
              <div
                key={idx}
                className={`bg-slate-900 border rounded-2xl p-6 space-y-4 ${
                  q.is_correct
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : q.selected_option_id
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-400">Question {q.question_order}</span>
                  <span
                    className={`font-semibold px-2.5 py-0.5 rounded-full ${
                      q.is_correct
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : q.selected_option_id
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {q.is_correct ? `+${q.marks_awarded} Marks` : `${q.marks_awarded} Marks`}
                  </span>
                </div>

                <div className="text-base font-semibold text-white">{q.question_text}</div>

                {/* Options Review */}
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    let optBg = 'bg-slate-800/60 border-slate-700/60 text-slate-300';

                    if (opt.is_correct) {
                      optBg = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold';
                    } else if (opt.is_selected && !opt.is_correct) {
                      optBg = 'bg-rose-500/20 border-rose-500/60 text-rose-200';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${optBg}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-slate-700/60 flex items-center justify-center font-mono font-bold">
                            {letter}
                          </span>
                          <span>{opt.option_text}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {opt.is_selected && (
                            <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-mono">
                              Your Selection
                            </span>
                          )}
                          {opt.is_correct && (
                            <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-3 p-3.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-slate-300 space-y-1">
                    <span className="font-bold text-indigo-400 block">Explanation:</span>
                    <p className="leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
          Answer review is not permitted for this assessment according to platform policy.
        </div>
      )}
    </div>
  );
};
