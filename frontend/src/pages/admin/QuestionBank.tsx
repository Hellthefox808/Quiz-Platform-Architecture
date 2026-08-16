import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { DifficultyLevel, QuestionAdmin, QuestionOptionAdmin, QuizAdmin } from '../../types';
import { 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  Edit3, 
  FileQuestion, 
  FileSpreadsheet, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Upload, 
  X 
} from 'lucide-react';

interface QuestionBankProps {
  quizId: string;
  quizTitle?: string;
  onNavigate: (view: string, params?: any) => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({ quizId, quizTitle, onNavigate }) => {
  const [quiz, setQuiz] = useState<QuizAdmin | null>(null);
  const [questions, setQuestions] = useState<QuestionAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  // Question Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qMarks, setQMarks] = useState(1);
  const [qDifficulty, setQDifficulty] = useState<DifficultyLevel>('MEDIUM');
  const [qExplanation, setQExplanation] = useState('');
  const [options, setOptions] = useState<Array<{ text: string; is_correct: boolean }>>([
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Bulk Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qData = await api.get<QuizAdmin>(`/quizzes/admin/${quizId}`);
      setQuiz(qData);
      setQuestions(qData.current_version?.questions || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [quizId]);

  const openCreateModal = () => {
    setEditingQuestionId(null);
    setQText('');
    setQMarks(2);
    setQDifficulty('MEDIUM');
    setQExplanation('');
    setOptions([
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ]);
    setSaveError(null);
    setModalOpen(true);
  };

  const openEditModal = (q: QuestionAdmin) => {
    setEditingQuestionId(q.id);
    setQText(q.question_text);
    setQMarks(q.marks);
    setQDifficulty(q.difficulty);
    setQExplanation(q.explanation || '');
    setOptions(
      q.options.map((o) => ({
        text: o.option_text,
        is_correct: o.is_correct,
      }))
    );
    setSaveError(null);
    setModalOpen(true);
  };

  const handleCorrectRadioChange = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        is_correct: i === index,
      }))
    );
  };

  const handleOptionTextChange = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, text } : opt))
    );
  };

  const handleAddOptionSlot = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { text: '', is_correct: false }]);
  };

  const handleRemoveOptionSlot = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      // Ensure at least 1 remains correct
      if (!filtered.some((o) => o.is_correct) && filtered.length > 0) {
        filtered[0].is_correct = true;
      }
      return filtered;
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError(null);

    const validOptions = options.filter((o) => o.text.trim().length > 0);
    if (validOptions.length < 2) {
      setSaveError('Please enter at least 2 non-empty options.');
      setSaveLoading(false);
      return;
    }

    const payload = {
      question_text: qText.trim(),
      question_type: 'MCQ_SINGLE',
      marks: qMarks,
      difficulty: qDifficulty,
      explanation: qExplanation.trim() || null,
      options: validOptions.map((o, idx) => ({
        option_text: o.text.trim(),
        position: idx + 1,
        is_correct: o.is_correct,
      })),
    };

    try {
      if (editingQuestionId) {
        await api.put(`/questions/${editingQuestionId}`, payload);
      } else {
        await api.post(`/questions/quizzes/${quizId}`, payload);
      }
      setModalOpen(false);
      fetchQuestions();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save question');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/questions/${qId}`);
      fetchQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete question');
    }
  };

  const handleBulkImportJson = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportLoading(true);
    setImportResult(null);

    try {
      const parsed = JSON.parse(importJsonText);
      const res = await api.post(`/questions/quizzes/${quizId}/bulk-import`, {
        questions: parsed,
      });
      setImportResult(res);
      fetchQuestions();
    } catch (err: any) {
      alert(err.message || 'Invalid JSON format or import error');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <button
          onClick={() => onNavigate('admin-quizzes')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessments
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <FileQuestion className="w-8 h-8 text-indigo-400" />
              Question Bank
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Managing questions for:{' '}
              <strong className="text-white">{quiz?.title || quizTitle}</strong> (Version v
              {quiz?.current_version?.version_number || 1})
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setImportModalOpen(true);
                setImportResult(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              Bulk Import
            </button>

            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <FileQuestion className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Questions Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
            Add at least one multiple-choice question before publishing this assessment.
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
          >
            Add First Question
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {q.marks} Marks
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    {q.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(q)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Edit question"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-base font-semibold text-white">{q.question_text}</div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {q.options.map((opt, optIdx) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      opt.is_correct
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400">
                        {String.fromCharCode(65 + optIdx)}.
                      </span>
                      {opt.option_text}
                    </span>
                    {opt.is_correct && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                        Correct
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {q.explanation && (
                <div className="text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl">
                  <span className="font-bold text-indigo-400">Explanation:</span> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">
                {editingQuestionId ? 'Edit Question' : 'Add Multiple Choice Question'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Question Text *
                </label>
                <textarea
                  rows={3}
                  required
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Enter the complete question problem statement..."
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Marks Awarded
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    required
                    value={qMarks}
                    onChange={(e) => setQMarks(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              {/* Options Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Choice Options (Select 1 Correct Answer)
                  </label>
                  {options.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOptionSlot}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correct_option"
                      checked={opt.is_correct}
                      onChange={() => handleCorrectRadioChange(idx)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
                      title="Mark as correct answer"
                    />
                    <input
                      type="text"
                      required
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                      className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionSlot(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Explanation (Shown to students post-assessment)
                </label>
                <textarea
                  rows={2}
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Rationale and references for the correct choice..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition"
                >
                  {saveLoading ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Bulk Question Import (JSON)
              </h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste an array of question objects. Example format:
            </p>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-indigo-300 font-mono overflow-x-auto">
{`[
  {
    "question_text": "What is ACID in databases?",
    "options": ["Atomicity, Consistency, Isolation, Durability", "Other"],
    "correct_option_index": 0,
    "marks": 2.0,
    "difficulty": "EASY",
    "explanation": "ACID guarantees transactional safety."
  }
]`}
            </pre>

            {importResult && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 space-y-1">
                <div className="font-bold">
                  Import Complete: {importResult.imported_count} imported, {importResult.failed_count} failed.
                </div>
                {importResult.errors?.length > 0 && (
                  <ul className="list-disc pl-4 text-rose-300">
                    {importResult.errors.map((err: any, idx: number) => (
                      <li key={idx}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <form onSubmit={handleBulkImportJson} className="space-y-4">
              <textarea
                rows={6}
                required
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder="[ { ... } ]"
                className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition"
                >
                  {importLoading ? 'Processing...' : 'Run Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
