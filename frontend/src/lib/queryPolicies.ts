import { ApiError } from '../api/client';

/**
 * Domain-Specific Query Freshness & Staleness Policies
 * 
 * Every query domain explicitly defines:
 * - staleTime (how long data remains fresh before background refetch)
 * - gcTime (how long inactive cache stays in memory)
 * - refetchOnWindowFocus
 * - refetchOnReconnect
 * - refetchOnMount
 * - retry rules
 */

export const queryPolicies = {
  // Reference data (rarely mutated during a session)
  categories: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
  },

  // Published Quiz Catalog & Discovery
  quizCatalog: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Single Quiz Detail
  quizDetail: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Student Dashboard & Historical Submissions
  studentDashboard: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  attemptHistory: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },

  // Result view (immutable historical record once scored)
  assessmentResult: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Competitive Leaderboard
  leaderboard: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // Certificates
  certificates: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
  },

  // Admin Views & Analytics
  adminAnalytics: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  adminManagement: {
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  },

  // Notifications (polled or background refreshed)
  notifications: {
    staleTime: 15 * 1000, // 15 seconds
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000, // poll every 30s
  },

  // Active Assessment (CRITICAL: Never rely on generic background refetch)
  activeAssessment: {
    staleTime: 0, // Always consider server check when mounting
    gcTime: 0, // Do not persist or retain in generic cache
    refetchOnWindowFocus: false, // Prevent background refetch replacing in-flight inputs
    refetchOnMount: true,
    refetchOnReconnect: false, // Reconnect handled by dedicated sync engine
    retry: 1, // Controlled retry only
  },
} as const;

/**
 * Intelligent error retry policy
 * Retries transient network failures and 5xx errors; immediately rejects client errors (400, 401, 403, 404, 409, 422).
 */
export function defaultRetryPolicy(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;

  if (error instanceof ApiError) {
    // Never retry auth/permission/validation/conflict/not found errors
    if ([400, 401, 403, 404, 409, 422].includes(error.status)) {
      return false;
    }
    // Retry network errors, timeouts, 500, 502, 503, 504
    if (error.isNetworkError || error.isTimeout || error.status >= 500 || error.status === 0) {
      return true;
    }
  }

  return failureCount < 2;
}

/**
 * Exponential backoff with jitter
 */
export function defaultRetryDelay(attemptIndex: number): number {
  const base = Math.min(1000 * 2 ** attemptIndex, 10000);
  const jitter = Math.random() * 500;
  return base + jitter;
}
