import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { AttemptStudentView, ResultResponse } from '../../types';
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Flag, 
  HelpCircle, 
  RotateCcw, 
  Send, 
  ShieldCheck, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

interface ActiveAssessmentProps {
  attemptId: string;
  onNavigate: (view: string, params?: any) => void;
}

export const ActiveAssessment: React.FC<ActiveAssessmentProps> = ({ attemptId, onNavigate }) => {
  const [attempt, setAttempt] = useState<AttemptStudentView | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const autoSubmittedRef = useRef(false);

  // Load Attempt Snapshot from Server
  const loadAttempt = async () => {
    try {
      const data = await api.get<AttemptStudentView>(`/attempts/${attemptId}`);
      setAttempt(data);

      // Initialize answers from server
      const initialAnswers: Record<string, string> = {};
      data.questions.forEach((q) => {
        if (q.selected_option_id) {
          initialAnswers[q.attempt_question_id] = q.selected_option_id;
        }
      });
      setAnswers(initialAnswers);

      // Compute server-authoritative remaining time
      const expiresAt = new Date(data.expires_at).getTime();
      const serverNow = new Date(data.server_time).getTime();
      const remainingSecs = Math.max(0, Math.floor((expiresAt - serverNow) / 1000));
      setTimeLeft(remainingSecs);

      if (data.status === 'COMPLETED' || data.status === 'EXPIRED') {
        // Already finalized, redirect to result
        onNavigate('result', { attemptId });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttempt();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attemptId]);

  // Countdown Timer Interval
  useEffect(() => {
    if (timeLeft === null) return;

    if (timeLeft <= 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      handleAutoSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  const handleAutoSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await api.post<ResultResponse>(`/attempts/${attemptId}/submit`);
      onNavigate('result', { attemptId, resultId: res.id });
    } catch (err) {
      onNavigate('result', { attemptId });
    }
  };

  const handleSelectOption = async (attemptQuestionId: string, optionId: string) => {
    // Update local state immediately for snappy UX
    setAnswers((prev) => ({ ...prev, [attemptQuestionId]: optionId }));
    setSaveStatus('saving');

    try {
      await api.patch(`/attempts/${attemptId}/answers`, {
        attempt_question_id: attemptQuestionId,
        selected_option_id: optionId,
      });
      setSaveStatus('saved');
    } catch (err: any) {
      if (err.code === 'ATTEMPT_EXPIRED') {
        handleAutoSubmit();
      } else {
        setSaveStatus('error');
      }
    }
  };

  const handleClearAnswer = async (attemptQuestionId: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[attemptQuestionId];
      return next;
    });
    setSaveStatus('saving');

    try {
      await api.patch(`/attempts/${attemptId}/answers`, {
        attempt_question_id: attemptQuestionId,
        selected_option_id: null,
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const toggleFlag = (attemptQuestionId: string) => {
    setFlagged((prev) => ({ ...prev, [attemptQuestionId]: !prev[attemptQuestionId] }));
  };

  const handleSubmitAssessment = async () => {
    setSubmitting(true);
    try {
      const res = await api.post<ResultResponse>(`/attempts/${attemptId}/submit`);
      onNavigate('result', { attemptId, resultId: res.id });
    } catch (err: any) {
      setError(err.message || 'Submission failed');
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-mono">Initializing secure assessment environment...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Assessment Error</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'Could not load the assessment session.'}</p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQ = attempt.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalQ = attempt.questions.length;
  const isLastQuestion = currentIndex === totalQ - 1;

  const isTimerCritical = (timeLeft || 0) < 60;
  const isTimerWarning = (timeLeft || 0) < 300 && !isTimerCritical;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Assessment Top Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight line-clamp-1">
              {attempt.quiz_title}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span>Question {currentIndex + 1} of {totalQ}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{answeredCount} Answered</span>
            </div>
          </div>
        </div>

        {/* Sync state & Authoritative Timer */}
        <div className="flex items-center gap-4">
          {/* Autosave Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-400">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-rose-400">
                <WifiOff className="w-3.5 h-3.5" />
                Sync Issue
              </span>
            )}
          </div>

          {/* Timer Display */}
          <div
            aria-live="polite"
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-sm shadow-sm ${
              isTimerCritical
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                : isTimerWarning
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{timeLeft !== null ? formatTimer(timeLeft) : '--:--'}</span>
          </div>

          {/* Final Submit Button */}
          <button
            onClick={() => setSubmitModalOpen(true)}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish</span>
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Active Question Workspace */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                  Q{currentQ.question_order}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {currentQ.marks} Marks
                </span>
              </div>

              <button
                onClick={() => toggleFlag(currentQ.attempt_question_id)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${
                  flagged[currentQ.attempt_question_id]
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flagged[currentQ.attempt_question_id] ? 'Flagged for Review' : 'Mark for Review'}</span>
              </button>
            </div>

            {/* Question Text */}
            <div className="text-base sm:text-lg font-semibold text-white leading-relaxed">
              {currentQ.question_text}
            </div>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt, optIndex) => {
                const isSelected = answers[currentQ.attempt_question_id] === opt.id;
                const letter = String.fromCharCode(65 + optIndex);

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQ.attempt_question_id, opt.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {letter}
                    </div>
                    <span className="text-sm font-medium mt-0.5 leading-normal">
                      {opt.option_text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              {answers[currentQ.attempt_question_id] && (
                <button
                  onClick={() => handleClearAnswer(currentQ.attempt_question_id)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {isLastQuestion ? (
              <button
                onClick={() => setSubmitModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <span>Review & Submit</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right 1 Col: Question Navigation Palette */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white mb-4">Question Palette</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {attempt.questions.map((q, idx) => {
                const isCurrent = currentIndex === idx;
                const isAnswered = !!answers[q.attempt_question_id];
                const isFlagged = !!flagged[q.attempt_question_id];

                let bgClass = 'bg-slate-800 text-slate-400 border-slate-700';
                if (isFlagged) {
                  bgClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
                } else if (isAnswered) {
                  bgClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
                }

                return (
                  <button
                    key={q.attempt_question_id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl text-xs font-mono border transition flex items-center justify-center relative cursor-pointer ${bgClass} ${
                      isCurrent ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 border-indigo-400' : ''
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette Legend */}
          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500/30 border border-emerald-500/50" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-amber-500/30 border border-amber-500/50" />
              <span>Flagged ({Object.values(flagged).filter(Boolean).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700" />
              <span>Unanswered ({totalQ - answeredCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {submitModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Submit Assessment?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you ready to submit your assessment for automatic grading?
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 divide-y divide-slate-700/50 text-xs">
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Total Questions</span>
                <span className="font-bold text-white">{totalQ}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-emerald-400 font-semibold">Answered</span>
                <span className="font-bold text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-amber-400 font-semibold">Unanswered</span>
                <span className="font-bold text-amber-400">{totalQ - answeredCount}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setSubmitModalOpen(false)}
                className="w-1/2 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Continue Test
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitAssessment}
                className="w-1/2 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Confirm & Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
