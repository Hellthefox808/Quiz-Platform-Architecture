/**
 * Deterministic Query Key Architecture & Factories
 * 
 * Strict hierarchy ensuring consistent key structure across the entire codebase.
 * Never construct ad-hoc arrays like ['quiz', id] vs ['quizzes', id].
 */

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters?: { includeInactive?: boolean }) =>
    [...categoryKeys.lists(), filters ?? {}] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

export const quizKeys = {
  all: ['quizzes'] as const,
  lists: () => [...quizKeys.all, 'list'] as const,
  list: (filters?: { category_id?: string; search?: string; page?: number; page_size?: number }) =>
    [...quizKeys.lists(), filters ?? {}] as const,
  adminLists: () => [...quizKeys.all, 'admin-list'] as const,
  adminList: (filters?: { page?: number; page_size?: number; category_id?: string }) =>
    [...quizKeys.adminLists(), filters ?? {}] as const,
  details: () => [...quizKeys.all, 'detail'] as const,
  detail: (id: string) => [...quizKeys.details(), id] as const,
  adminDetails: () => [...quizKeys.all, 'admin-detail'] as const,
  adminDetail: (id: string) => [...quizKeys.adminDetails(), id] as const,
  checklists: () => [...quizKeys.all, 'checklist'] as const,
  checklist: (id: string) => [...quizKeys.checklists(), id] as const,
  questions: (quizId: string) => [...quizKeys.all, 'questions', quizId] as const,
};

export const attemptKeys = {
  all: ['attempts'] as const,
  details: () => [...attemptKeys.all, 'detail'] as const,
  detail: (attemptId: string) => [...attemptKeys.details(), attemptId] as const,
  results: () => [...attemptKeys.all, 'result'] as const,
  result: (resultId: string) => [...attemptKeys.results(), resultId] as const,
  history: (filters?: { page?: number; page_size?: number }) =>
    [...attemptKeys.all, 'history', 'my', filters ?? {}] as const,
  adminList: (filters?: { page?: number; page_size?: number; quiz_id?: string; user_id?: string }) =>
    [...attemptKeys.all, 'admin-list', filters ?? {}] as const,
};

export const studentKeys = {
  all: ['student'] as const,
  analytics: () => [...studentKeys.all, 'analytics'] as const,
  certificates: () => [...studentKeys.all, 'certificates'] as const,
};

export const adminKeys = {
  all: ['admin'] as const,
  analytics: () => [...adminKeys.all, 'analytics'] as const,
  questionAnalytics: () => [...adminKeys.all, 'question-analytics'] as const,
  users: (filters?: { page?: number; page_size?: number; search?: string }) =>
    [...adminKeys.all, 'users', filters ?? {}] as const,
  auditLogs: (filters?: { page?: number; page_size?: number }) =>
    [...adminKeys.all, 'audit-logs', filters ?? {}] as const,
};

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  list: (filters?: { timeframe?: string; categoryId?: string }) =>
    [...leaderboardKeys.all, filters ?? {}] as const,
};

export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};
