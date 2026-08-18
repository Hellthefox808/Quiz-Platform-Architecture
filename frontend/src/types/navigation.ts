export type View =
  | 'dashboard'
  | 'catalog'
  | 'quiz-detail'
  | 'assessment'
  | 'result'
  | 'history'
  | 'leaderboard'
  | 'certificates'
  | 'admin-dashboard'
  | 'admin-quizzes'
  | 'admin-questions'
  | 'admin-categories'
  | 'admin-users'
  | 'admin-audit'
  | 'admin-questions-analytics';

export interface ViewParamsMap {
  'dashboard'?: undefined;
  'catalog'?: { categoryId?: string };
  'quiz-detail': { quizId: string };
  'assessment': { attemptId: string };
  'result': { attemptId: string; resultId?: string; quizTitle?: string };
  'history'?: undefined;
  'leaderboard'?: { categoryId?: string };
  'certificates'?: undefined;
  'admin-dashboard'?: undefined;
  'admin-quizzes'?: undefined;
  'admin-questions': { quizId: string; quizTitle?: string };
  'admin-categories'?: undefined;
  'admin-users'?: undefined;
  'admin-audit'?: undefined;
  'admin-questions-analytics'?: undefined;
}

export type NavigationState = {
  [V in View]: undefined extends ViewParamsMap[V]
    ? { view: V; params?: ViewParamsMap[V] }
    : { view: V; params: ViewParamsMap[V] };
}[View];

export interface NavigateFunction {
  <V extends View>(
    view: V,
    ...args: undefined extends ViewParamsMap[V]
      ? [params?: ViewParamsMap[V]]
      : [params: ViewParamsMap[V]]
  ): void;
}

/**
 * Route Parameter Guard Helpers
 */
export function isValidId(id?: string | null): boolean {
  return typeof id === 'string' && id.trim().length > 0;
}

export function isValidQuizRoute(params?: { quizId?: string }): params is { quizId: string; quizTitle?: string } {
  return Boolean(params && isValidId(params.quizId));
}

export function isValidAttemptRoute(params?: { attemptId?: string }): params is { attemptId: string; resultId?: string; quizTitle?: string } {
  return Boolean(params && isValidId(params.attemptId));
}


