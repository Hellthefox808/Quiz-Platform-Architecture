import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileQuestion,
  Plus,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  useQuizAdminListQuery,
  useQuizPublishChecklistQuery,
  useQuizMutations,
} from '../../hooks/useQuizzes';
import { useCategoriesQuery } from '../../hooks/useCategories';
import { QuizAdmin } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { NavigateFunction } from '../../types/navigation';

interface QuizManagerProps {
  onNavigate: NavigateFunction;
}

export const QuizManager: React.FC<QuizManagerProps> = ({ onNavigate }) => {
  const { data: quizData, isLoading: loading } = useQuizAdminListQuery();
  const { data: categories = [] } = useCategoriesQuery(true);
  const { createQuiz, publishQuiz, unpublishQuiz } = useQuizMutations();

  const quizzes: QuizAdmin[] = quizData?.items || [];

  // Create Modal State
  const [createModal, setCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue] = useState(0.5);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Pre-flight checklist modal
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const { data: checklist } = useQuizPublishChecklistQuery(selectedQuizId);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const activeCatId = categoryId || (categories.length > 0 ? categories[0].id : '');
    if (!activeCatId) {
      setCreateError('Please select or create a category first.');
      return;
    }

    try {
      await createQuiz.mutateAsync({
        title,
        description,
        category_id: activeCatId,
        config: {
          duration_seconds: durationMinutes * 60,
          passing_percentage: passingPercentage,
          max_attempts: maxAttempts,
          negative_marking_enabled: negativeMarking,
          negative_mark_value: negativeMarkValue,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
        },
      });
      setCreateModal(false);
      setTitle('');
      setDescription('');
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      setCreateError(errObj?.message || 'Failed to create quiz');
    }
  };

  const handlePublish = async (quizId: string) => {
    try {
      await publishQuiz.mutateAsync(quizId);
      setSelectedQuizId(null);
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      alert(errObj?.message || 'Publishing failed');
    }
  };

  const handleUnpublish = async (quizId: string) => {
    if (!confirm('Are you sure you want to unpublish this quiz to draft state?')) return;
    try {
      await unpublishQuiz.mutateAsync(quizId);
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      alert(errObj?.message || 'Unpublishing failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#38281e]">
        <div>
          <span className="text-xs font-bold text-[#d4a373] uppercase tracking-wider">Assessment Configuration</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight flex items-center gap-2 mt-1">
            <BookOpen className="w-7 h-7 text-[#d4a373]" />
            Quiz Management
          </h1>
          <p className="text-xs sm:text-sm text-[#cbb8a9] mt-2 max-w-xl">
            Author quizzes, manage immutable versions, set evaluation criteria, and publish to students.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateModal(true)}
        >
          Create Assessment
        </Button>
      </div>

      {/* Quizzes Table */}
      {loading ? (
        <div className="assess-surface rounded-2xl p-6 space-y-4 border border-[#38281e]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#38281e]/50">
              <Skeleton variant="text" width="220px" height="18px" />
              <Skeleton variant="text" width="60px" height="16px" />
              <Skeleton variant="text" width="60px" height="16px" />
              <Skeleton variant="text" width="80px" height="24px" />
            </div>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title="No Assessments Configured"
          description="Get started by authoring your first technical assessment."
          primaryActionLabel="Create Assessment"
          onPrimaryAction={() => setCreateModal(true)}
        />
      ) : (
        <div className="assess-surface rounded-2xl overflow-hidden shadow-xl border border-[#38281e]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#cbb8a9]">
              <thead className="bg-[#110c09] text-[10px] uppercase font-mono tracking-wider text-[#887467] border-b border-[#38281e]">
                <tr>
                  <th className="px-6 py-4">Title & Category</th>
                  <th className="px-6 py-4 text-center">Version</th>
                  <th className="px-6 py-4 text-center">Questions</th>
                  <th className="px-6 py-4 text-center">Time Limit</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#38281e]/60">
                {quizzes.map((q) => {
                  const ver = q.current_version;

                  return (
                    <tr key={q.id} className="hover:bg-[#231a14]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#faf4ee] text-sm">{q.title}</div>
                        <div className="text-[10px] text-[#887467] mt-1 uppercase tracking-wider font-medium">
                          {q.category?.name || 'Uncategorized'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center font-mono text-[11px] font-bold text-[#d4a373]">
                        <span className="bg-[#c89666]/15 border border-[#c89666]/30 px-2 py-0.5 rounded">
                          v{ver?.version_number || 1}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center text-[11px] font-bold font-mono text-[#faf4ee]">
                        {ver?.question_count || 0}
                      </td>

                      <td className="px-6 py-4 text-center text-[11px] font-mono text-[#887467]">
                        {Math.round((ver?.duration_seconds || 1200) / 60)} min
                      </td>

                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant={
                            q.status === 'PUBLISHED'
                              ? 'success'
                              : q.status === 'DRAFT'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {q.status}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<FileQuestion className="w-3.5 h-3.5" />}
                            onClick={() => onNavigate('admin-questions', { quizId: q.id, quizTitle: q.title })}
                          >
                            Questions
                          </Button>

                          {q.status === 'DRAFT' ? (
                            <Button
                              variant="glass"
                              size="sm"
                              className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              leftIcon={<Send className="w-3.5 h-3.5" />}
                              onClick={() => setSelectedQuizId(q.id)}
                            >
                              Publish
                            </Button>
                          ) : (
                            <Button
                              variant="glass"
                              size="sm"
                              className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                              onClick={() => handleUnpublish(q.id)}
                            >
                              Revert
                            </Button>
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
      {selectedQuizId && checklist && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedQuizId(null)}
          title="Publishing Validation & Pre-Flight"
          subtitle={checklist.quiz_title}
          maxWidth="lg"
        >
          <div className="space-y-5">
            <div className="space-y-3">
              {checklist.checks.map((c, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    c.passed
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                  }`}
                >
                  {c.passed ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-sm tracking-tight">{c.name}</div>
                    <div className="text-[11px] opacity-80 mt-1 leading-relaxed">{c.details}</div>
                  </div>
                </div>
              ))}
            </div>

            {checklist.blocking_issues.length > 0 && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                <strong className="block uppercase tracking-wider text-[10px] mb-2">Blocking Issues</strong>
                <ul className="list-disc pl-4 space-y-1">
                  {checklist.blocking_issues.map((b, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[#38281e]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedQuizId(null)}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40"
                disabled={!checklist.is_publishable || publishQuiz.isPending}
                isLoading={publishQuiz.isPending}
                onClick={() => handlePublish(selectedQuizId)}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Confirm & Publish
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Quiz Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Create New Assessment"
        subtitle="Configure assessment metadata, duration, pass threshold, and rules."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuiz} className="space-y-5">
          {createError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl font-medium">
              {createError}
            </div>
          )}

          <Input
            label="Quiz Title *"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Distributed Consensus & Raft Algorithm"
          />

          <Select
            label="Category *"
            required
            value={categoryId || (categories[0]?.id ?? '')}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />

          <div>
            <label className="block text-xs font-semibold text-[#cbb8a9] mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview of topics and skills assessed..."
              className="w-full px-3.5 py-2 bg-[#110c09] border border-[#38281e] rounded-xl text-[#faf4ee] text-xs sm:text-sm focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] shadow-inner"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Duration (Min)"
              type="number"
              min={1}
              max={360}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
            <Input
              label="Pass Score (%)"
              type="number"
              min={0}
              max={100}
              value={passingPercentage}
              onChange={(e) => setPassingPercentage(Number(e.target.value))}
            />
            <Input
              label="Max Attempts"
              type="number"
              min={1}
              max={20}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
            />
          </div>

          {/* Assessment Rules Toggles */}
          <div className="pt-3 space-y-2.5 border-t border-[#38281e]">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#887467] mb-2">
              Assessment Rules
            </span>
            <label className="flex items-center gap-3 text-xs text-[#cbb8a9] cursor-pointer p-3 bg-[#110c09] border border-[#38281e] rounded-xl hover:border-[#4e382b] transition">
              <input
                type="checkbox"
                checked={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.checked)}
                className="w-4 h-4 rounded border-[#38281e] text-[#c89666] focus:ring-[#d4a373] cursor-pointer"
              />
              <span>Enable Negative Marking (-{negativeMarkValue} per incorrect answer)</span>
            </label>

            <label className="flex items-center gap-3 text-xs text-[#cbb8a9] cursor-pointer p-3 bg-[#110c09] border border-[#38281e] rounded-xl hover:border-[#4e382b] transition">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="w-4 h-4 rounded border-[#38281e] text-[#c89666] focus:ring-[#d4a373] cursor-pointer"
              />
              <span>Shuffle question order for each attempt</span>
            </label>

            <label className="flex items-center gap-3 text-xs text-[#cbb8a9] cursor-pointer p-3 bg-[#110c09] border border-[#38281e] rounded-xl hover:border-[#4e382b] transition">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="w-4 h-4 rounded border-[#38281e] text-[#c89666] focus:ring-[#d4a373] cursor-pointer"
              />
              <span>Shuffle choice options for each attempt</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#38281e]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={createQuiz.isPending}
            >
              Create Draft
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
