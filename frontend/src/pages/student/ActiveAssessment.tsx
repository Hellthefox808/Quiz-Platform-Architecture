import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Flag,
  Send,
  Shield,
  Keyboard,
} from 'lucide-react';
import { useActiveAssessmentSync } from '../../hooks/useActiveAssessmentSync';
import { GlobalSyncIndicator } from '../../components/common/GlobalSyncIndicator';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ErrorState } from '../../components/ui/ErrorState';
import { NavigateFunction } from '../../types/navigation';

interface ActiveAssessmentProps {
  attemptId: string;
  onNavigate: NavigateFunction;
}

export const ActiveAssessment: React.FC<ActiveAssessmentProps> = ({ attemptId, onNavigate }) => {
  const {
    attempt,
    loading,
    error,
    answers,
    flagged,
    questionSyncStates,
    globalSyncStatus,
    pendingQueueCount,
    timeLeft,
    isSubmitting,
    selectOption,
    clearOption,
    toggleFlag,
    submitAssessment,
    retryInitialLoad,
  } = useActiveAssessmentSync({ attemptId, onNavigate });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [paletteFilter, setPaletteFilter] = useState<'all' | 'flagged' | 'unanswered'>('all');

  const currentQ = attempt?.questions[currentIndex];
  const totalQ = attempt?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentIndex === totalQ - 1;

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (submitModalOpen || isSubmitting || !currentQ) return;

      if (e.key >= '1' && e.key <= '4') {
        const optIdx = parseInt(e.key, 10) - 1;
        if (currentQ.options[optIdx]) {
          selectOption(currentQ.attempt_question_id, currentQ.options[optIdx].id);
        }
      } else if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') {
        if (currentIndex < totalQ - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFlag(currentQ.attempt_question_id);
      }
    },
    [submitModalOpen, isSubmitting, currentQ, selectOption, toggleFlag, currentIndex, totalQ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleManualSubmit = async () => {
    setSubmitError(null);
    try {
      await submitAssessment();
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      setSubmitError(errObj?.message || 'Submission failed. Please check your network connection.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0907] flex flex-col items-center justify-center gap-4 text-center p-4">
        <div className="w-10 h-10 border-3 border-[#d4a373] border-t-transparent rounded-full animate-spin" />
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-[#faf4ee] uppercase tracking-wider">Establishing Assessment Session</h2>
          <p className="text-xs text-[#cbb8a9] font-mono">Synchronizing server-authoritative timer and question snapshot...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt || !currentQ) {
    return (
      <div className="min-h-screen bg-[#0d0907] flex items-center justify-center p-4">
        <ErrorState
          title="Assessment Session Error"
          message={error || 'Could not load the active assessment session.'}
          onRetry={retryInitialLoad}
        />
      </div>
    );
  }

  const isTimerCritical = (timeLeft || 0) < 60;
  const isTimerWarning = (timeLeft || 0) < 300 && !isTimerCritical;
  const currentQSyncState = questionSyncStates[currentQ.attempt_question_id] || 'SAVED';

  const filteredQuestions = attempt.questions.filter((q) => {
    if (paletteFilter === 'flagged') return !!flagged[q.attempt_question_id];
    if (paletteFilter === 'unanswered') return !answers[q.attempt_question_id];
    return true;
  });

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col text-[#1c130d] select-none">
      {/* Assessment Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e8dfd5] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#b07238] via-[#c89666] to-[#8c531e] flex items-center justify-center shadow-md shadow-[#b07238]/20 border border-[#dfb58a]/30">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-extrabold text-[#1c130d] tracking-tight line-clamp-1">
              {attempt.quiz_title}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-[#5c4738] font-mono">
              <span>Item {currentIndex + 1} of {totalQ}</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">{answeredCount} Answered</span>
            </div>
          </div>
        </div>

        {/* Sync Status & Authoritative Timer */}
        <div className="flex items-center gap-3 sm:gap-4">
          <GlobalSyncIndicator status={globalSyncStatus} pendingCount={pendingQueueCount} />

          {/* Authoritative Countdown Timer */}
          <div
            aria-live="polite"
            className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-xs shadow-inner ${
              isTimerCritical
                ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                : isTimerWarning
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-[#f5efe8] border-[#e8dfd5] text-[#1c130d]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#b46927]" />
            <span>{timeLeft !== null ? formatTimer(timeLeft) : '--:--'}</span>
          </div>

          {/* Final Submit Action */}
          <Button
            size="sm"
            variant="primary"
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40 shadow-emerald-600/25"
            disabled={isSubmitting}
            onClick={() => setSubmitModalOpen(true)}
            rightIcon={<Send className="w-3.5 h-3.5" />}
          >
            Finish
          </Button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Active Question Workspace (Left 3 Cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between assess-surface rounded-2xl p-6 sm:p-8 shadow-xl border border-[#e8dfd5] bg-white">
          <div className="space-y-6">
            {/* Question Header & Flag Action */}
            <div className="flex items-center justify-between border-b border-[#e8dfd5] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold bg-[#b07238]/10 text-[#b46927] border border-[#b07238]/25 px-2.5 py-1 rounded-lg">
                  Question {currentQ.question_order}
                </span>
                <span className="text-xs font-semibold text-[#5c4738]">
                  {currentQ.marks} Marks
                </span>

                {currentQSyncState === 'SAVING' && (
                  <Badge variant="warning" size="sm">
                    Saving...
                  </Badge>
                )}
                {currentQSyncState === 'RETRYING' && (
                  <Badge variant="danger" size="sm">
                    Retrying sync...
                  </Badge>
                )}
              </div>

              <button
                onClick={() => toggleFlag(currentQ.attempt_question_id)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  flagged[currentQ.attempt_question_id]
                    ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm'
                    : 'text-[#5c4738] hover:text-[#1c130d] border-[#e8dfd5] hover:bg-[#f5efe8]'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flagged[currentQ.attempt_question_id] ? 'Flagged' : 'Flag for Review'}</span>
              </button>
            </div>

            {/* Question Statement */}
            <div className="text-base sm:text-lg font-semibold text-[#1c130d] leading-relaxed">
              {currentQ.question_text}
            </div>

            {/* Option Choices */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt, optIndex) => {
                const isSelected = answers[currentQ.attempt_question_id] === opt.id;
                const letter = String.fromCharCode(65 + optIndex);

                return (
                  <button
                    key={opt.id}
                    onClick={() => selectOption(currentQ.attempt_question_id, opt.id)}
                    disabled={isSubmitting}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#b07238]/10 border-[#b46927] text-[#1c130d] shadow-md shadow-[#b07238]/10'
                        : 'bg-white hover:bg-[#f5efe8] border-[#e8dfd5] text-[#5c4738] hover:text-[#1c130d]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#b07238] to-[#d4a373] text-white shadow-sm font-black'
                          : 'bg-[#f5efe8] text-[#5c4738] border border-[#e8dfd5]'
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

          {/* Bottom Question Controls & Keyboard Shortcuts Hint */}
          <div className="mt-8 pt-6 border-t border-[#e8dfd5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentIndex === 0 || isSubmitting}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>

              {answers[currentQ.attempt_question_id] && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => clearOption(currentQ.attempt_question_id)}
                >
                  Clear Selection
                </Button>
              )}
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-[#8a7465] font-mono">
              <Keyboard className="w-3.5 h-3.5 text-[#b46927]" />
              <span>Keys 1-4: Select • N: Next • P: Prev • F: Flag</span>
            </div>

            <div className="w-full sm:w-auto flex justify-end">
              {isLastQuestion ? (
                <Button
                  variant="primary"
                  size="md"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40"
                  disabled={isSubmitting}
                  onClick={() => setSubmitModalOpen(true)}
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Review & Submit
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  disabled={isSubmitting}
                  onClick={() => setCurrentIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Next Question
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Question Navigation Palette */}
        <div className="assess-surface rounded-2xl p-6 shadow-xl border border-[#e8dfd5] bg-white flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#1c130d] uppercase tracking-wider">
                Question Palette
              </h2>
              <span className="text-[10px] font-mono text-[#5c4738]">
                {answeredCount}/{totalQ} Done
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex rounded-xl bg-[#f5efe8] p-1 border border-[#e8dfd5] text-[10px] font-mono">
              <button
                onClick={() => setPaletteFilter('all')}
                className={`flex-1 py-1 rounded-lg font-bold transition cursor-pointer ${
                  paletteFilter === 'all' ? 'bg-[#b07238] text-white' : 'text-[#5c4738] hover:text-[#1c130d]'
                }`}
              >
                All ({totalQ})
              </button>
              <button
                onClick={() => setPaletteFilter('flagged')}
                className={`flex-1 py-1 rounded-lg font-bold transition cursor-pointer ${
                  paletteFilter === 'flagged' ? 'bg-amber-600 text-white' : 'text-[#5c4738] hover:text-[#1c130d]'
                }`}
              >
                Flag ({Object.keys(flagged).length})
              </button>
              <button
                onClick={() => setPaletteFilter('unanswered')}
                className={`flex-1 py-1 rounded-lg font-bold transition cursor-pointer ${
                  paletteFilter === 'unanswered' ? 'bg-[#ede4d8] text-[#1c130d]' : 'text-[#5c4738] hover:text-[#1c130d]'
                }`}
              >
                Left ({totalQ - answeredCount})
              </button>
            </div>

            {/* Palette Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
              {filteredQuestions.map((q) => {
                const originalIndex = attempt.questions.findIndex(
                  (item) => item.attempt_question_id === q.attempt_question_id
                );
                const isCurrent = currentIndex === originalIndex;
                const isAnswered = !!answers[q.attempt_question_id];
                const isFlagged = !!flagged[q.attempt_question_id];

                let bgClass = 'bg-[#f5efe8] text-[#5c4738] border-[#e8dfd5] hover:border-[#b46927]';
                if (isCurrent) {
                  bgClass = 'bg-gradient-to-r from-[#b07238] to-[#d4a373] text-white font-black border-[#b07238] ring-2 ring-[#b46927]/30';
                } else if (isFlagged) {
                  bgClass = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
                } else if (isAnswered) {
                  bgClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
                }

                return (
                  <button
                    key={q.attempt_question_id}
                    onClick={() => setCurrentIndex(originalIndex)}
                    disabled={isSubmitting}
                    className={`h-9 rounded-xl border text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${bgClass}`}
                  >
                    {originalIndex + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Palette Legend */}
          <div className="pt-4 border-t border-[#e8dfd5] space-y-2 text-[10px] text-[#5c4738] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-400" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-400" />
              <span>Flagged for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded bg-[#f5efe8] border border-[#e8dfd5]" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Barrier Modal */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => !isSubmitting && setSubmitModalOpen(false)}
        title="Finalize & Submit Assessment"
        subtitle="Confirm examination submission and trigger server grading."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#f5efe8] border border-[#e8dfd5] space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-[#5c4738] font-sans">Total Questions:</span>
              <span className="text-[#1c130d] font-bold">{totalQ}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5c4738] font-sans">Answered Questions:</span>
              <span className="text-emerald-600 font-bold">{answeredCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5c4738] font-sans">Unanswered Questions:</span>
              <span className="text-amber-700 font-bold">{totalQ - answeredCount}</span>
            </div>
          </div>

          {totalQ - answeredCount > 0 && (
            <p className="text-xs text-amber-800 font-medium">
              Note: You have {totalQ - answeredCount} unanswered questions. Unanswered questions will receive 0 marks.
            </p>
          )}

          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e8dfd5]">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setSubmitModalOpen(false)}
            >
              Back to Exam
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40"
              isLoading={isSubmitting}
              onClick={handleManualSubmit}
            >
              {isSubmitting ? 'Synchronizing & Scoring...' : 'Confirm Submission'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
