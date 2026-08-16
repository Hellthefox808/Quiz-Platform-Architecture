import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { QuizStudentDetail } from '../../types';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Award, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Play, 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Trophy, 
  Zap 
} from 'lucide-react';

interface QuizDetailProps {
  quizId: string;
  onNavigate: (view: string, params?: any) => void;
}

export const QuizDetail: React.FC<QuizDetailProps> = ({ quizId, onNavigate }) => {
  const [quiz, setQuiz] = useState<QuizStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const data = await api.get<QuizStudentDetail>(`/quizzes/details/${quizId}`);
        setQuiz(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load assessment details');
      } finally {
        setLoading(false);
      }
    };
    loadQuiz();
  }, [quizId]);

  const handleStartOrResume = async () => {
    setStarting(true);
    setError(null);
    try {
      if (quiz?.active_attempt_id) {
        // Resume existing active attempt
        onNavigate('assessment', { attemptId: quiz.active_attempt_id, quizId });
        return;
      }
      const attempt = await api.post<{ id: string }>(`/attempts/quizzes/${quizId}/start`);
      onNavigate('assessment', { attemptId: attempt.id, quizId });
    } catch (err: any) {
      setError(err.message || 'Unable to start assessment');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Assessment Unavailable</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'This quiz is currently unavailable.'}</p>
        <button
          onClick={() => onNavigate('catalog')}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={() => onNavigate('catalog')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Assessments
      </button>

      {/* Hero Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              {quiz.category_name}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {quiz.title}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {quiz.description || 'Test your proficiency with standardized questions and verified grading.'}
            </p>
          </div>

          {/* Start CTA Card */}
          <div className="sm:w-64 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 text-center flex flex-col justify-between shrink-0">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Attempts Remaining
              </span>
              <span className="text-3xl font-black text-white mt-1 block">
                {Math.max(0, quiz.max_attempts - quiz.user_attempts_count)}{' '}
                <span className="text-sm font-normal text-slate-400">/ {quiz.max_attempts}</span>
              </span>
            </div>

            <button
              onClick={handleStartOrResume}
              disabled={starting || !quiz.user_can_attempt}
              className={`w-full mt-6 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-lg cursor-pointer ${
                quiz.active_attempt_id
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                  : quiz.user_can_attempt
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {starting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : quiz.active_attempt_id ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Resume Attempt</span>
                </>
              ) : quiz.user_can_attempt ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Assessment</span>
                </>
              ) : (
                <span>Attempt Limit Reached</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Assessment Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <Clock className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
          <div className="text-xs text-slate-400">Time Limit</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {Math.round(quiz.duration_seconds / 60)} minutes
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
          <div className="text-xs text-slate-400">Total Questions</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {quiz.question_count} Questions
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
          <div className="text-xs text-slate-400">Passing Grade</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {quiz.passing_percentage}%
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
          <Award className="w-5 h-5 text-violet-400 mx-auto mb-1.5" />
          <div className="text-xs text-slate-400">Total Points</div>
          <div className="text-lg font-bold text-white mt-0.5">
            {quiz.total_marks} Marks
          </div>
        </div>
      </div>

      {/* Assessment Guidelines & Rules */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Examination Guidelines & Assessment Rules
        </h2>
        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
            <span>
              <strong>Server-Authoritative Clock:</strong> The countdown timer is computed by the assessment server. Changing local browser time will not extend testing duration.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
            <span>
              <strong>Autosave:</strong> Every choice is synchronized to the assessment server in real-time. You can safely navigate between questions and refresh your browser.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
            <span>
              <strong>Negative Marking:</strong>{' '}
              {quiz.negative_marking_enabled ? (
                <span className="text-rose-300 font-semibold">
                  Enabled (-{quiz.negative_mark_value} mark per incorrect answer). Unanswered questions carry no penalty.
                </span>
              ) : (
                <span className="text-emerald-300 font-semibold">
                  Disabled. There is no penalty for incorrect answers.
                </span>
              )}
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
            <span>
              <strong>Certification:</strong> Scoring {quiz.passing_percentage}% or higher generates an official verifiable certificate on your profile.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
