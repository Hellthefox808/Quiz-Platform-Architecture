import React, { useState } from 'react';
import { api } from '../../api/client';
import { DifficultyLevel, QuestionAdmin, CreateQuestionRequest } from '../../types';
import {
  ArrowLeft,
  Edit3,
  FileQuestion,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useQuizQuestionsAdminQuery, useQuestionMutations } from '../../hooks/useQuizzes';
import { useQuery } from '@tanstack/react-query';
import { quizApi } from '../../api/client';
import { quizKeys } from '../../lib/queryKeys';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { NavigateFunction } from '../../types/navigation';

interface QuestionBankProps {
  quizId: string;
  quizTitle?: string;
  onNavigate: NavigateFunction;
}

interface BulkImportResult {
  imported_count?: number;
  failed_count?: number;
  errors?: Array<{ row: number; error: string }>;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({ quizId, quizTitle, onNavigate }) => {
  const { data: quiz } = useQuery({
    queryKey: quizKeys.adminDetail(quizId),
    queryFn: ({ signal }) => quizApi.getAdminDetail(quizId, signal),
  });

  const { data: questions = [], isLoading: loading } = useQuizQuestionsAdminQuery(quizId);
  const { createQuestion, updateQuestion, deleteQuestion } = useQuestionMutations(quizId);

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
  const [saveError, setSaveError] = useState<string | null>(null);

  // Bulk Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

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
      if (!filtered.some((o) => o.is_correct) && filtered.length > 0) {
        filtered[0].is_correct = true;
      }
      return filtered;
    });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const validOptions = options.filter((o) => o.text.trim().length > 0);
    if (validOptions.length < 2) {
      setSaveError('Please enter at least 2 non-empty options.');
      return;
    }

    const payload: CreateQuestionRequest = {
      question_text: qText.trim(),
      question_type: 'MCQ_SINGLE',
      marks: qMarks,
      difficulty: qDifficulty,
      explanation: qExplanation.trim() || undefined,
      options: validOptions.map((o, idx) => ({
        option_text: o.text.trim(),
        position: idx + 1,
        is_correct: o.is_correct,
      })),
    };

    try {
      if (editingQuestionId) {
        await updateQuestion.mutateAsync({ questionId: editingQuestionId, data: payload });
      } else {
        await createQuestion.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      setSaveError(errObj?.message || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion.mutateAsync(qId);
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      alert(errObj?.message || 'Failed to delete question');
    }
  };

  const handleBulkImportJson = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportLoading(true);
    setImportResult(null);

    try {
      const parsed = JSON.parse(importJsonText);
      const res = await api.post<BulkImportResult>(`/questions/quizzes/${quizId}/bulk-import`, {
        questions: parsed,
      });
      setImportResult(res);
      createQuestion.reset();
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      alert(errObj?.message || 'Invalid JSON format or import error');
    } finally {
      setImportLoading(false);
    }
  };

  const saveLoading = createQuestion.isPending || updateQuestion.isPending;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Top Header */}
      <div>
        <button
          onClick={() => onNavigate('admin-quizzes')}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#cbb8a9] hover:text-[#faf4ee] mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessments
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#38281e]">
          <div>
            <span className="text-xs font-bold text-[#d4a373] uppercase tracking-wider">Content Editor</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight flex items-center gap-2 mt-1">
              <FileQuestion className="w-7 h-7 text-[#d4a373]" />
              Question Bank
            </h1>
            <p className="text-xs sm:text-sm text-[#cbb8a9] mt-2 max-w-xl">
              Managing questions for:{' '}
              <strong className="text-[#faf4ee]">{quiz?.title || quizTitle}</strong>{' '}
              <span className="font-mono text-[11px] bg-[#231a14] text-[#d4a373] border border-[#38281e] px-2 py-0.5 rounded ml-1">
                v{quiz?.current_version?.version_number || 1}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Upload className="w-4 h-4 text-emerald-400" />}
              onClick={() => {
                setImportModalOpen(true);
                setImportResult(null);
              }}
            >
              Bulk Import
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              Add Question
            </Button>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="assess-surface rounded-2xl p-6 space-y-4 border border-[#38281e]">
              <div className="flex justify-between items-center">
                <Skeleton variant="text" width="80px" height="18px" />
                <Skeleton variant="text" width="60px" height="20px" />
              </div>
              <Skeleton variant="text" width="90%" height="24px" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton variant="rectangular" height="40px" />
                <Skeleton variant="rectangular" height="40px" />
              </div>
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<FileQuestion className="w-8 h-8" />}
          title="No Questions Configured"
          description="Add multiple-choice questions to this assessment before publishing."
          primaryActionLabel="Add First Question"
          onPrimaryAction={openCreateModal}
        />
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <Card
              key={q.id}
              variant="surface"
              className="p-6 space-y-5 border border-[#38281e]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#38281e]/80 pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#d4a373]">
                    Q{idx + 1}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#110c09] border border-[#38281e] text-[#cbb8a9]">
                    {q.marks} Marks
                  </span>
                  <Badge
                    variant={
                      q.difficulty === 'EASY'
                        ? 'success'
                        : q.difficulty === 'MEDIUM'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {q.difficulty}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(q)}
                    className="p-1.5 rounded-lg text-[#887467] hover:text-[#faf4ee] hover:bg-[#231a14] transition cursor-pointer"
                    title="Edit question"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 rounded-lg text-[#887467] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-base font-semibold text-[#faf4ee] leading-relaxed">{q.question_text}</div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {q.options.map((opt, optIdx) => (
                  <div
                    key={opt.id}
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                      opt.is_correct
                        ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300 font-semibold'
                        : 'bg-[#110c09] border-[#38281e] text-[#cbb8a9]'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold shrink-0 ${
                          opt.is_correct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#231a14] text-[#887467]'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="leading-relaxed">{opt.option_text}</span>
                    </span>
                    {opt.is_correct && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider shrink-0">
                        Correct
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {q.explanation && (
                <div className="text-xs text-[#cbb8a9] bg-[#110c09] border border-[#38281e] p-4 rounded-xl space-y-1.5 mt-2">
                  <span className="font-bold text-[#d4a373] uppercase tracking-wider text-[10px] block">
                    Explanation
                  </span>
                  <p className="leading-relaxed text-[#cbb8a9]">{q.explanation}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Question Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingQuestionId ? 'Edit Question' : 'Add Question'}
        subtitle="Specify statement, mark weight, difficulty, choices, and explanation."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveQuestion} className="space-y-5">
          {saveError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl font-medium">
              {saveError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#cbb8a9] mb-1.5 uppercase tracking-wider">
              Question Text *
            </label>
            <textarea
              rows={3}
              required
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Enter the complete question problem statement..."
              className="w-full px-3.5 py-2 bg-[#110c09] border border-[#38281e] rounded-xl text-[#faf4ee] text-xs sm:text-sm focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Marks Awarded"
              type="number"
              step="0.5"
              min="0.5"
              max="100"
              required
              value={qMarks}
              onChange={(e) => setQMarks(Number(e.target.value))}
            />

            <Select
              label="Difficulty Level"
              value={qDifficulty}
              onChange={(e) => setQDifficulty(e.target.value as DifficultyLevel)}
              options={[
                { label: 'Easy', value: 'EASY' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'Hard', value: 'HARD' },
              ]}
            />
          </div>

          {/* Options Builder */}
          <div className="space-y-3 pt-3 border-t border-[#38281e]">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#cbb8a9] uppercase tracking-wider">
                Choice Options (Select 1 Correct)
              </label>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOptionSlot}
                  className="text-xs text-[#d4a373] hover:text-[#e6ccb2] font-bold uppercase tracking-wider transition cursor-pointer"
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
                  className="w-4 h-4 text-[#c89666] focus:ring-[#d4a373] bg-[#110c09] border-[#38281e] cursor-pointer"
                  title="Mark as correct answer"
                />
                <input
                  type="text"
                  required
                  value={opt.text}
                  onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                  className={`flex-1 px-3.5 py-2 bg-[#110c09] border rounded-xl text-[#faf4ee] text-xs sm:text-sm focus:outline-none focus:ring-1 shadow-inner ${
                    opt.is_correct
                      ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500'
                      : 'border-[#38281e] focus:border-[#d4a373] focus:ring-[#d4a373]'
                  }`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOptionSlot(idx)}
                    className="text-[#887467] hover:text-rose-400 p-1.5 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#38281e]">
            <label className="block text-xs font-semibold text-[#cbb8a9] mb-1.5 mt-2 uppercase tracking-wider">
              Explanation (Shown post-assessment)
            </label>
            <textarea
              rows={2}
              value={qExplanation}
              onChange={(e) => setQExplanation(e.target.value)}
              placeholder="Rationale and references for the correct choice..."
              className="w-full px-3.5 py-2 bg-[#110c09] border border-[#38281e] rounded-xl text-[#faf4ee] text-xs sm:text-sm focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] shadow-inner"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#38281e]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={saveLoading}
            >
              Save Question
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Bulk Question Import"
        subtitle="Import multiple questions formatted as JSON array."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#cbb8a9]">
            Paste an array of question objects (JSON):
          </p>
          <pre className="p-4 rounded-xl bg-[#110c09] border border-[#38281e] text-[10px] text-[#d4a373] font-mono overflow-x-auto shadow-inner">
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
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 space-y-1.5 shadow-sm">
              <div className="font-bold">
                Import Complete: {importResult.imported_count} imported, {importResult.failed_count} failed.
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <ul className="list-disc pl-4 text-rose-300 mt-2">
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <form onSubmit={handleBulkImportJson} className="space-y-4">
            <textarea
              rows={5}
              required
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="[ { ... } ]"
              className="w-full p-3.5 font-mono text-xs bg-[#110c09] border border-[#38281e] rounded-xl text-[#faf4ee] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40"
                isLoading={importLoading}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                {importLoading ? 'Processing...' : 'Run Import'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
