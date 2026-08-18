import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { attemptApi } from '../api/client';
import { AttemptStudentView, ResultResponse } from '../types';
import {
  ActiveAssessmentSyncEngine,
  GlobalSyncStatus,
  QuestionSyncStatus,
} from '../lib/sync/syncEngine';
import { invalidation } from '../lib/invalidation';
import { attemptKeys } from '../lib/queryKeys';
import { NavigateFunction } from '../types/navigation';

interface UseActiveAssessmentSyncOptions {
  attemptId: string;
  onNavigate: NavigateFunction;
}

export function useActiveAssessmentSync({ attemptId, onNavigate }: UseActiveAssessmentSyncOptions) {
  const queryClient = useQueryClient();

  const [attempt, setAttempt] = useState<AttemptStudentView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [questionSyncStates, setQuestionSyncStates] = useState<Record<string, QuestionSyncStatus>>({});
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  const [globalSyncStatus, setGlobalSyncStatus] = useState<GlobalSyncStatus>('SAVED');
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const syncEngineRef = useRef<ActiveAssessmentSyncEngine | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef<boolean>(false);
  const serverExpiryRef = useRef<number | null>(null);

  // Initialize Sync Engine
  if (!syncEngineRef.current) {
    syncEngineRef.current = new ActiveAssessmentSyncEngine(attemptId);
  }

  // Auto-submit handler (server wins on expiration)
  const executeAutoSubmit = useCallback(async () => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    setIsSubmitting(true);

    try {
      if (syncEngineRef.current) {
        await syncEngineRef.current.flushAndSynchronizeBarrier();
      }
      const res = await attemptApi.submit(attemptId);
      // Seed result query cache
      queryClient.setQueryData(attemptKeys.result(res.id), res);
      await invalidation.onAttemptSubmit(queryClient, attemptId, attempt?.quiz_id);
      onNavigate('result', { attemptId, resultId: res.id });
    } catch {
      onNavigate('result', { attemptId });
    }
  }, [attemptId, attempt?.quiz_id, onNavigate, queryClient]);

  // Load Authoritative Attempt Snapshot from Server
  const loadAttempt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await attemptApi.get(attemptId);
      setAttempt(data);

      // Populate authoritative answers snapshot from server
      const initialAnswers: Record<string, string> = {};
      data.questions.forEach((q) => {
        if (q.selected_option_id) {
          initialAnswers[q.attempt_question_id] = q.selected_option_id;
        }
      });
      setAnswers(initialAnswers);
      syncEngineRef.current?.setInitialConfirmedAnswers(initialAnswers);

      // Initialize server authoritative timer
      const expiresAt = new Date(data.expires_at).getTime();
      const serverNow = new Date(data.server_time).getTime();
      serverExpiryRef.current = expiresAt;

      const remainingSecs = Math.max(0, Math.floor((expiresAt - serverNow) / 1000));
      setTimeLeft(remainingSecs);

      // If attempt is already completed or expired on server, navigate to result immediately
      if (data.status === 'COMPLETED' || data.status === 'EXPIRED') {
        onNavigate('result', { attemptId });
      }
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      setError(errObj?.message || 'Failed to initialize secure assessment.');
    } finally {
      setLoading(false);
    }
  }, [attemptId, onNavigate]);

  // Sync Engine event listeners
  useEffect(() => {
    const engine = syncEngineRef.current;
    if (!engine) return;

    const unsubscribe = engine.subscribe({
      onQueueChange: (count) => setPendingQueueCount(count),
      onQuestionStatusChange: (aqId, status, errorMsg) => {
        setQuestionSyncStates((prev) => ({ ...prev, [aqId]: status }));
        if (errorMsg) {
          setQuestionErrors((prev) => ({ ...prev, [aqId]: errorMsg }));
        } else {
          setQuestionErrors((prev) => {
            const next = { ...prev };
            delete next[aqId];
            return next;
          });
        }
      },
      onGlobalStatusChange: (status) => setGlobalSyncStatus(status),
      onAnswerConfirmed: (aqId, confirmedOptionId) => {
        setAnswers((prev) => {
          if (confirmedOptionId === null) {
            const next = { ...prev };
            delete next[aqId];
            return next;
          }
          return { ...prev, [aqId]: confirmedOptionId };
        });
      },
      onRollback: (aqId, rolledBackOptionId) => {
        setAnswers((prev) => {
          if (rolledBackOptionId === null) {
            const next = { ...prev };
            delete next[aqId];
            return next;
          }
          return { ...prev, [aqId]: rolledBackOptionId };
        });
      },
      onAttemptExpired: () => {
        executeAutoSubmit();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [executeAutoSubmit]);

  // Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncEngineRef.current?.setOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      syncEngineRef.current?.setOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    loadAttempt();

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      syncEngineRef.current?.destroy();
      syncEngineRef.current = null;
    };
  }, [loadAttempt]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null) return;

    if (timeLeft <= 0 && !autoSubmittedRef.current) {
      executeAutoSubmit();
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          if (!autoSubmittedRef.current) {
            executeAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timeLeft, executeAutoSubmit]);

  // Handle option selection with immediate local state + debounced queue
  const selectOption = useCallback(
    (attemptQuestionId: string, optionId: string) => {
      setAnswers((prev) => ({ ...prev, [attemptQuestionId]: optionId }));
      syncEngineRef.current?.enqueueAnswer(attemptQuestionId, optionId, false);
    },
    []
  );

  // Handle clearing answer through identical synchronization pipeline
  const clearOption = useCallback(
    (attemptQuestionId: string) => {
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[attemptQuestionId];
        return next;
      });
      syncEngineRef.current?.enqueueAnswer(attemptQuestionId, null, true);
    },
    []
  );

  const toggleFlag = useCallback((attemptQuestionId: string) => {
    setFlagged((prev) => ({ ...prev, [attemptQuestionId]: !prev[attemptQuestionId] }));
  }, []);

  /**
   * SUBMISSION SYNCHRONIZATION BARRIER
   * 1. Locks all answer modifications
   * 2. Flushes all pending debounce timers & awaits in-flight saves
   * 3. Verifies zero synchronization errors
   * 4. Executes POST /attempts/{id}/submit
   */
  const submitAssessment = useCallback(async (): Promise<ResultResponse> => {
    if (isSubmitting) {
      throw new Error('Submission is already in progress.');
    }

    setIsSubmitting(true);
    syncEngineRef.current?.setLocked(true);

    try {
      // 1. Flush pending answer queue & wait for sync barrier
      const barrierResult = await syncEngineRef.current?.flushAndSynchronizeBarrier();
      if (barrierResult && !barrierResult.success) {
        throw new Error(
          barrierResult.errorMessage ||
          'Some answers could not be synchronized with the server. Please check your connection and retry.'
        );
      }

      // 2. Submit to server
      const idempotencyKey = `submit_${attemptId}_${Date.now()}`;
      const res = await attemptApi.submit(attemptId, idempotencyKey);

      // 3. Seed result cache and reconcile dependent queries
      queryClient.setQueryData(attemptKeys.result(res.id), res);
      await invalidation.onAttemptSubmit(queryClient, attemptId, attempt?.quiz_id);

      onNavigate('result', { attemptId, resultId: res.id });
      return res;
    } catch (err: unknown) {
      syncEngineRef.current?.setLocked(false);
      setIsSubmitting(false);
      throw err;
    }
  }, [attemptId, attempt?.quiz_id, isSubmitting, onNavigate, queryClient]);

  return {
    attempt,
    loading,
    error,
    answers,
    flagged,
    questionSyncStates,
    questionErrors,
    globalSyncStatus,
    pendingQueueCount,
    timeLeft,
    isSubmitting,
    isOnline,
    selectOption,
    clearOption,
    toggleFlag,
    submitAssessment,
    retryInitialLoad: loadAttempt,
  };
}
