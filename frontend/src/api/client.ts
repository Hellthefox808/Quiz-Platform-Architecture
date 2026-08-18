import {
  User,
  UserRole,
  UserAdmin,
  Category,
  QuizAdmin,
  QuizStudentSummary,
  QuizStudentDetail,
  QuizPublishChecklistResponse,
  QuestionAdmin,
  AttemptStudentView,
  SaveAnswerRequest,
  SaveAnswerResponse,
  ResultResponse,
  AttemptRecord,
  StudentAnalytics,
  AdminAnalytics,
  QuestionAnalytics,
  LeaderboardData,
  Certificate,
  Notification,
  AuditLog,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  CreateQuizRequest,
  UpdateQuizRequest,
  PaginatedResult,
} from '../types';


const API_BASE = (import.meta.env?.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '') : '') + '/api/v1';


export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  isNetworkError: boolean;
  isTimeout: boolean;
  isAbort: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
    flags: { isNetworkError?: boolean; isTimeout?: boolean; isAbort?: boolean } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isNetworkError = flags.isNetworkError || false;
    this.isTimeout = flags.isTimeout || false;
    this.isAbort = flags.isAbort || false;
  }
}

export interface ApiRequestOptions extends RequestInit {
  idempotencyKey?: string;
  ifMatch?: string;
  timeoutMs?: number;
}

function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Centralized, observable HTTP request pipeline
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Correlation & Request Tracing ID
  if (!headers.has('X-Request-ID')) {
    headers.set(
      'X-Request-ID',
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    );
  }

  // Idempotency Key for replayable / retry-sensitive mutations
  if (options.idempotencyKey && !headers.has('X-Idempotency-Key')) {
    headers.set('X-Idempotency-Key', options.idempotencyKey);
  }

  // Optimistic Concurrency Control (ETag / Version)
  if (options.ifMatch && !headers.has('If-Match')) {
    headers.set('If-Match', options.ifMatch);
  }

  // Timeout control via AbortController linking
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let effectiveSignal = options.signal;

  if (options.timeoutMs && options.timeoutMs > 0) {
    const controller = new AbortController();
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }
    timeoutId = setTimeout(() => {
      controller.abort(new DOMException('Request timeout', 'TimeoutError'));
    }, options.timeoutMs);
    effectiveSignal = controller.signal;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: effectiveSignal,
    });
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);

    const errorObj = err as Error | undefined;
    if (errorObj?.name === 'AbortError' || errorObj?.name === 'TimeoutError') {
      const isTimeout = errorObj.message === 'Request timeout' || errorObj.name === 'TimeoutError';
      throw new ApiError(
        0,
        isTimeout ? 'REQUEST_TIMEOUT' : 'REQUEST_ABORTED',
        isTimeout ? 'Request timed out waiting for server.' : 'Request was aborted.',
        undefined,
        { isTimeout, isAbort: !isTimeout }
      );
    }

    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot connect to backend server. Please verify your internet connection or that the server is running.',
      undefined,
      { isNetworkError: true }
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 502 || response.status === 504) {
      throw new ApiError(
        response.status,
        'BAD_GATEWAY',
        'Backend server is currently offline or unreachable.'
      );
    }

    let errorData: { error?: { message?: string; code?: string; details?: Record<string, unknown> }; message?: string; code?: string; details?: Record<string, unknown> } = {};
    try {
      errorData = (await response.json()) as typeof errorData;
    } catch {
      errorData = { error: { message: response.statusText, code: `HTTP_${response.status}` } };
    }

    const err = errorData.error || errorData;
    throw new ApiError(
      response.status,
      err.code || `STATUS_${response.status}`,
      err.message || 'An unexpected server error occurred',
      err.details
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// Low-level HTTP verbs
export const api = {
  get: <T>(url: string, options?: ApiRequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string, options?: ApiRequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'DELETE' }),
  upload: <T>(url: string, formData: FormData, options?: ApiRequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'POST', body: formData }),
};

// Typed Domain APIs
export const authApi = {
  getMe: (signal?: AbortSignal) => api.get<User>('/auth/me', { signal }),
  login: (data: { email: string; password: string }) =>
    api.post<{
      access_token: string;
      user_id: string;
      name: string;
      email: string;
      role: UserRole;
      status: string;
    }>('/auth/login', data),
  register: (data: { name: string; email: string; password: string }) =>
    api.post<User>('/auth/register', data),
};

export const categoryApi = {
  list: (includeInactive = false, signal?: AbortSignal) =>
    api.get<Category[]>(`/categories${includeInactive ? '?include_inactive=true' : ''}`, { signal }),
  create: (data: CreateCategoryRequest) =>
    api.post<Category>('/categories', data),
  update: (id: string, data: UpdateCategoryRequest) =>
    api.put<Category>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const quizApi = {
  listStudent: (params?: { category_id?: string; search?: string; page?: number; page_size?: number }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    q.set('page', String(params?.page || 1));
    q.set('page_size', String(params?.page_size || 30));
    if (params?.category_id) q.set('category_id', params.category_id);
    if (params?.search) q.set('search', params.search);
    return api.get<PaginatedResult<QuizStudentSummary>>(`/quizzes?${q.toString()}`, { signal });
  },
  getStudentDetail: (quizId: string, signal?: AbortSignal) =>
    api.get<QuizStudentDetail>(`/quizzes/details/${quizId}`, { signal }),
  listAdmin: (params?: { page?: number; page_size?: number; category_id?: string }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    q.set('page', String(params?.page || 1));
    q.set('page_size', String(params?.page_size || 50));
    if (params?.category_id) q.set('category_id', params.category_id);
    return api.get<PaginatedResult<QuizAdmin>>(`/quizzes/admin?${q.toString()}`, { signal });
  },
  getAdminDetail: (quizId: string, signal?: AbortSignal) =>
    api.get<QuizAdmin>(`/quizzes/admin/${quizId}`, { signal }),
  create: (data: CreateQuizRequest) =>
    api.post<QuizAdmin>('/quizzes', data, {
      idempotencyKey: `create-quiz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }),
  update: (id: string, data: UpdateQuizRequest, version?: number) =>
    api.put<QuizAdmin>(`/quizzes/${id}`, data, {
      ifMatch: version !== undefined ? `"${version}"` : undefined,
    }),
  getPublishChecklist: (quizId: string, signal?: AbortSignal) =>
    api.get<QuizPublishChecklistResponse>(`/quizzes/${quizId}/publish-checklist`, { signal }),
  publish: (quizId: string) =>
    api.post<QuizAdmin>(`/quizzes/${quizId}/publish`, {}, {
      idempotencyKey: `publish-quiz-${quizId}-${Date.now()}`,
    }),
  unpublish: (quizId: string) =>
    api.post<QuizAdmin>(`/quizzes/${quizId}/unpublish`, {}),
};

export const questionApi = {
  listAdmin: (quizId: string, signal?: AbortSignal) =>
    api.get<QuestionAdmin[]>(`/questions/quizzes/${quizId}`, { signal }),
  create: (quizId: string, data: CreateQuestionRequest) =>
    api.post<QuestionAdmin>(`/questions/quizzes/${quizId}`, data),
  update: (questionId: string, data: UpdateQuestionRequest) =>
    api.put<QuestionAdmin>(`/questions/${questionId}`, data),
  delete: (questionId: string) =>
    api.delete(`/questions/${questionId}`),
};


export const attemptApi = {
  start: (quizId: string) =>
    api.post<AttemptStudentView>(`/attempts/quizzes/${quizId}/start`, {}, {
      idempotencyKey: `start-attempt-${quizId}-${Date.now()}`,
    }),
  get: (attemptId: string, signal?: AbortSignal) =>
    api.get<AttemptStudentView>(`/attempts/${attemptId}`, { signal }),
  saveAnswer: (attemptId: string, data: SaveAnswerRequest, options?: { idempotencyKey?: string; signal?: AbortSignal }) =>
    api.patch<SaveAnswerResponse>(`/attempts/${attemptId}/answers`, data, {
      idempotencyKey: options?.idempotencyKey,
      signal: options?.signal,
      timeoutMs: 8000,
    }),
  submit: (attemptId: string, idempotencyKey?: string) =>
    api.post<ResultResponse>(`/attempts/${attemptId}/submit`, {}, {
      idempotencyKey: idempotencyKey || `submit-attempt-${attemptId}-${Date.now()}`,
      timeoutMs: 15000,
    }),
  getResult: (resultId: string, signal?: AbortSignal) =>
    api.get<ResultResponse>(`/attempts/results/${resultId}`, { signal }),
  getMyHistory: (page = 1, pageSize = 15, signal?: AbortSignal) =>
    api.get<PaginatedResult<AttemptRecord>>(`/attempts/history/my?page=${page}&page_size=${pageSize}`, { signal }),
  listAdmin: (params?: { page?: number; page_size?: number; quiz_id?: string; user_id?: string }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    q.set('page', String(params?.page || 1));
    q.set('page_size', String(params?.page_size || 20));
    if (params?.quiz_id) q.set('quiz_id', params.quiz_id);
    if (params?.user_id) q.set('user_id', params.user_id);
    return api.get<PaginatedResult<AttemptRecord>>(`/attempts/admin/all?${q.toString()}`, { signal });
  },
};

export const userApi = {
  listAdmin: (page = 1, pageSize = 30, search = '', signal?: AbortSignal) => {
    const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (search) q.set('search', search);
    return api.get<PaginatedResult<UserAdmin>>(`/users/admin?${q.toString()}`, { signal });
  },
  updateStatus: (userId: string, status: 'ACTIVE' | 'SUSPENDED') =>
    api.patch<User>(`/users/admin/${userId}/status`, { status }),
  updateRole: (userId: string, role: UserRole) =>
    api.patch<User>(`/users/admin/${userId}/role`, { role }),
};

export const analyticsApi = {
  getStudent: (signal?: AbortSignal) =>
    api.get<StudentAnalytics>('/analytics/student', { signal }),
  getAdmin: (signal?: AbortSignal) =>
    api.get<AdminAnalytics>('/analytics/admin/overview', { signal }),
  getQuestions: (signal?: AbortSignal) =>
    api.get<QuestionAnalytics[]>('/analytics/admin/questions', { signal }),
};

export const leaderboardApi = {
  get: (timeframe = 'ALL_TIME', categoryId?: string, signal?: AbortSignal) => {
    const q = new URLSearchParams({ timeframe });
    if (categoryId) q.set('category_id', categoryId);
    return api.get<LeaderboardData>(`/leaderboard?${q.toString()}`, { signal });
  },
};

export const certificateApi = {
  getMy: (signal?: AbortSignal) =>
    api.get<Certificate[]>('/certificates/my', { signal }),
};

export const notificationApi = {
  list: (signal?: AbortSignal) =>
    api.get<Notification[]>('/notifications', { signal }),
  markAllRead: () =>
    api.post('/notifications/mark-all-read', {}),
};

export const auditApi = {
  list: (page = 1, pageSize = 40, signal?: AbortSignal) =>
    api.get<PaginatedResult<AuditLog>>(`/audit-logs?page=${page}&page_size=${pageSize}`, { signal }),
};

export const healthApi = {
  check: (signal?: AbortSignal) =>
    api.get<{ status: string; timestamp: string; service: string }>('/health', { signal, timeoutMs: 3000 }),
  ready: (signal?: AbortSignal) =>
    api.get<{ status: string; database: string; timestamp: string }>('/ready', { signal, timeoutMs: 3000 }),
};

