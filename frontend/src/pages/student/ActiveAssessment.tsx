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
  Shield, 
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
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 bg-[#070b14]">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Initializing secure assessment environment...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-md mx-auto py-16 text-center bg-[#070b14]">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Assessment Session Error</h2>
        <p className="text-xs text-slate-400 mb-6">{error || 'Could not load the assessment session.'}</p>
        <button
          onClick={() => onNavigate('dashboard')}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white text-xs font-semibold rounded-xl"
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
    <div className="min-h-screen bg-[#070b14] flex flex-col text-slate-100">
      {/* Assessment Top Bar */}
      <header className="sticky top-0 z-40 bg-[#090e1a]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-1">
              {attempt.quiz_title}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>Item {currentIndex + 1} of {totalQ}</span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">{answeredCount} Answered</span>
            </div>
          </div>
        </div>

        {/* Sync state & Authoritative Timer */}
        <div className="flex items-center gap-4">
          {/* Autosave Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Syncing...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-rose-400 text-[11px]">
                <WifiOff className="w-3.5 h-3.5" />
                Sync Issue
              </span>
            )}
          </div>

          {/* Timer Display */}
          <div
            aria-live="polite"
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-xs shadow-sm ${
              isTimerCritical
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
                : isTimerWarning
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft !== null ? formatTimer(timeLeft) : '--:--'}</span>
          </div>

          {/* Final Submit Button */}
          <button
            onClick={() => setSubmitModalOpen(true)}
            className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish</span>
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Active Question Workspace */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-[#0b1220] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                  Q{currentQ.question_order}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {currentQ.marks} Marks
                </span>
              </div>

              <button
                onClick={() => toggleFlag(currentQ.attempt_question_id)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                  flagged[currentQ.attempt_question_id]
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-900'
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
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-600/10'
                        : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400'
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {answers[currentQ.attempt_question_id] && (
                <button
                  onClick={() => handleClearAnswer(currentQ.attempt_question_id)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {isLastQuestion ? (
              <button
                onClick={() => setSubmitModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                <span>Review & Submit</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right 1 Col: Question Navigation Palette */}
        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Question Palette</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {attempt.questions.map((q, idx) => {
                const isCurrent = currentIndex === idx;
                const isAnswered = !!answers[q.attempt_question_id];
                const isFlagged = !!flagged[q.attempt_question_id];

                let bgClass = 'bg-slate-900 text-slate-400 border-slate-800';
                if (isCurrent) {
                  bgClass = 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-500/30';
                } else if (isFlagged) {
                  bgClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                } else if (isAnswered) {
                  bgClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                }

                return (
                  <button
                    key={q.attempt_question_id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl border text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette Legend */}
          <div className="pt-4 border-t border-slate-800 space-y-2 text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
              <span>Flagged</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0b1220] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Submit Examination?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You have answered <strong className="text-white font-mono">{answeredCount}</strong> out of <strong className="text-white font-mono">{totalQ}</strong> questions.
              Once submitted, your responses will be locked and graded server-side.
            </p>

            <div className="flex gap-3 justify-end pt-3">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={handleSubmitAssessment}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                {submitting ? 'Scoring...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
