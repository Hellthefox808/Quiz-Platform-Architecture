import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizApi, questionApi, attemptApi } from '../api/client';
import { quizKeys } from '../lib/queryKeys';
import { queryPolicies } from '../lib/queryPolicies';
import { invalidation } from '../lib/invalidation';
import {
  CreateQuizRequest,
  UpdateQuizRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
} from '../types';

export function useQuizzesQuery(filters?: { category_id?: string; search?: string; page?: number; page_size?: number }) {
  return useQuery({
    queryKey: quizKeys.list(filters),
    queryFn: ({ signal }) => quizApi.listStudent(filters, signal),
    ...queryPolicies.quizCatalog,
  });
}

export function useQuizDetailQuery(quizId: string) {
  return useQuery({
    queryKey: quizKeys.detail(quizId),
    queryFn: ({ signal }) => quizApi.getStudentDetail(quizId, signal),
    enabled: !!quizId,
    ...queryPolicies.quizDetail,
  });
}

export function useQuizAdminListQuery(filters?: { page?: number; page_size?: number; category_id?: string }) {
  return useQuery({
    queryKey: quizKeys.adminList(filters),
    queryFn: ({ signal }) => quizApi.listAdmin(filters, signal),
    ...queryPolicies.adminManagement,
  });
}

export function useQuizPublishChecklistQuery(quizId: string | null) {
  return useQuery({
    queryKey: quizKeys.checklist(quizId || ''),
    queryFn: ({ signal }) => quizApi.getPublishChecklist(quizId!, signal),
    enabled: !!quizId,
    ...queryPolicies.adminManagement,
  });
}

export function useQuizQuestionsAdminQuery(quizId: string | null) {
  return useQuery({
    queryKey: quizKeys.questions(quizId || ''),
    queryFn: ({ signal }) => questionApi.listAdmin(quizId!, signal),
    enabled: !!quizId,
    ...queryPolicies.adminManagement,
  });
}

export function useQuizMutations() {
  const queryClient = useQueryClient();

  const createQuiz = useMutation({
    mutationFn: (data: CreateQuizRequest) => quizApi.create(data),
    onSuccess: () => invalidation.onQuizChange(queryClient),
  });

  const updateQuiz = useMutation({
    mutationFn: ({ id, data, version }: { id: string; data: UpdateQuizRequest; version?: number }) =>
      quizApi.update(id, data, version),
    onSuccess: (_, variables) => invalidation.onQuizChange(queryClient, variables.id),
  });

  const publishQuiz = useMutation({
    mutationFn: (quizId: string) => quizApi.publish(quizId),
    onSuccess: (_, quizId) => invalidation.onQuizPublish(queryClient, quizId),
  });

  const unpublishQuiz = useMutation({
    mutationFn: (quizId: string) => quizApi.unpublish(quizId),
    onSuccess: (_, quizId) => invalidation.onQuizPublish(queryClient, quizId),
  });

  const startQuizAttempt = useMutation({
    mutationFn: (quizId: string) => attemptApi.start(quizId),
    onSuccess: (_, quizId) => invalidation.onAttemptStart(queryClient, quizId),
  });

  return {
    createQuiz,
    updateQuiz,
    publishQuiz,
    unpublishQuiz,
    startQuizAttempt,
  };
}

export function useQuestionMutations(quizId: string) {
  const queryClient = useQueryClient();

  const createQuestion = useMutation({
    mutationFn: (data: CreateQuestionRequest) => questionApi.create(quizId, data),
    onSuccess: () => invalidation.onQuestionChange(queryClient, quizId),
  });

  const updateQuestion = useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: UpdateQuestionRequest }) =>
      questionApi.update(questionId, data),
    onSuccess: () => invalidation.onQuestionChange(queryClient, quizId),
  });

  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) => questionApi.delete(questionId),
    onSuccess: () => invalidation.onQuestionChange(queryClient, quizId),
  });

  return {
    createQuestion,
    updateQuestion,
    deleteQuestion,
  };
}

