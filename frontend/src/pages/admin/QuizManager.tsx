import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Category, QuizAdmin, QuizPublishChecklistResponse } from '../../types';
import { 
  AlertCircle, 
  ArrowLeft, 
  BookOpen, 
  CheckCircle2, 
  Edit3, 
  Eye, 
  FileQuestion, 
  HelpCircle, 
  Layers, 
  Plus, 
  RotateCcw, 
  Send, 
  ShieldAlert, 
  Sparkles, 
  Trash2, 
  X 
} from 'lucide-react';

interface QuizManagerProps {
  onNavigate: (view: string, params?: any) => void;
}

export const QuizManager: React.FC<QuizManagerProps> = ({ onNavigate }) => {
  const [quizzes, setQuizzes] = useState<QuizAdmin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal State
  const [createModal, setCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0.5);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Pre-flight checklist modal
  const [checklist, setChecklist] = useState<QuizPublishChecklistResponse | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const [qData, cData] = await Promise.all([
        api.get<{ items: QuizAdmin[] }>('/quizzes/admin?page=1&page_size=50'),
        api.get<Category[]>('/categories?include_inactive=true'),
      ]);
      setQuizzes(qData.items);
      setCategories(cData);
      if (cData.length > 0 && !categoryId) {
        setCategoryId(cData[0].id);
      }
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      await api.post('/quizzes', {
        title,
        description,
        category_id: categoryId,
        config: {
          duration_seconds: durationMinutes * 60,
          passing_percentage: passingPercentage,
          max_attempts: maxAttempts,
          negative_marking_enabled: negativeMarking,
          negative_mark_value: negativeMarkValue,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
        }
      });
      setCreateModal(false);
      setTitle('');
      setDescription('');
      fetchQuizzes();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create quiz');
    } finally {
      setCreateLoading(false);
    }
  };

  const openChecklist = async (quizId: string) => {
    setSelectedQuizId(quizId);
    setChecklistLoading(true);
    try {
      const data = await api.get<QuizPublishChecklistResponse>(`/quizzes/${quizId}/publish-checklist`);
      setChecklist(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load checklist');
    } finally {
      setChecklistLoading(false);
    }
  };

  const handlePublish = async (quizId: string) => {
    try {
      await api.post(`/quizzes/${quizId}/publish`);
      setChecklist(null);
      fetchQuizzes();
    } catch (err: any) {
      alert(err.message || 'Publishing failed');
    }
  };

  const handleUnpublish = async (quizId: string) => {
    if (!confirm('Are you sure you want to unpublish this quiz to draft state?')) return;
    try {
      await api.post(`/quizzes/${quizId}/unpublish`);
      fetchQuizzes();
    } catch (err: any) {
      alert(err.message || 'Unpublishing failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-indigo-400" />
            Assessment Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Author quizzes, manage immutable versions, set evaluation criteria, and publish to students.
          </p>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Assessment
        </button>
      </div>

      {/* Quizzes Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Assessments Configured</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            Get started by authoring your first technical assessment.
          </p>
          <button
            onClick={() => setCreateModal(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
          >
            Create Assessment
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-850 text-xs uppercase font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Title & Category</th>
                  <th className="px-6 py-4 text-center">Version</th>
                  <th className="px-6 py-4 text-center">Questions</th>
                  <th className="px-6 py-4 text-center">Time Limit</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {quizzes.map((q) => {
                  const ver = q.current_version;

                  return (
                    <tr key={q.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{q.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {q.category?.name || 'Uncategorized'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-mono text-xs font-bold text-indigo-400">
                        v{ver?.version_number || 1}
                      </td>

                      <td className="px-6 py-4 text-center text-xs font-bold text-slate-200">
                        {ver?.question_count || 0}
                      </td>

                      <td className="px-6 py-4 text-center text-xs text-slate-400">
                        {Math.round((ver?.duration_seconds || 1200) / 60)} min
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            q.status === 'PUBLISHED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : q.status === 'DRAFT'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onNavigate('admin-questions', { quizId: q.id, quizTitle: q.title })}
                            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold border border-indigo-500/30 transition flex items-center gap-1.5"
                          >
                            <FileQuestion className="w-3.5 h-3.5" />
                            <span>Question Bank</span>
                          </button>

                          {q.status === 'DRAFT' ? (
                            <button
                              onClick={() => openChecklist(q.id)}
                              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold border border-emerald-500/30 transition flex items-center gap-1"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Publish</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnpublish(q.id)}
                              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-semibold border border-amber-500/30 transition"
                            >
                              Unpublish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pre-flight Checklist Modal */}
      {checklist && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Publishing Validation Checklist</h3>
              <p className="text-xs text-slate-400 mt-0.5">{checklist.quiz_title}</p>
            </div>

            <div className="space-y-3">
              {checklist.checks.map((c, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                    c.passed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {c.passed ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">{c.name}</div>
                    <div className="text-[11px] opacity-80 mt-0.5">{c.details}</div>
                  </div>
                </div>
              ))}
            </div>

            {checklist.blocking_issues.length > 0 && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                <strong>Blocking Issues:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {checklist.blocking_issues.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setChecklist(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!checklist.is_publishable}
                onClick={() => selectedQuizId && handlePublish(selectedQuizId)}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Quiz Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">Create New Assessment</h3>
              <button onClick={() => setCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus & Raft Algorithm"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of topics and skills assessed..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Pass Score (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              {/* Assessment Rules Toggles */}
              <div className="pt-2 space-y-2 border-t border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={negativeMarking}
                    onChange={(e) => setNegativeMarking(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable Negative Marking (-{negativeMarkValue} per incorrect answer)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Shuffle question order for each attempt</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Shuffle choice options for each attempt</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition"
                >
                  {createLoading ? 'Creating...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
