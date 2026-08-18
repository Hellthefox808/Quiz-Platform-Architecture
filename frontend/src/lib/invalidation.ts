import { QueryClient } from '@tanstack/react-query';
import {
  categoryKeys,
  quizKeys,
  attemptKeys,
  studentKeys,
  adminKeys,
  leaderboardKeys,
  notificationKeys,
  authKeys,
} from './queryKeys';

/**
 * Targeted Invalidation Matrix & Cache Reconciliation
 * 
 * Reconciles dependent query caches after mutations without blindly clearing the whole cache.
 */

export const invalidation = {
  /**
   * After category created, updated, or deleted
   */
  onCategoryChange: async (qc: QueryClient) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: categoryKeys.all }),
      qc.invalidateQueries({ queryKey: quizKeys.lists() }),
    ]);
  },

  /**
   * After a quiz is created or updated
   */
  onQuizChange: async (qc: QueryClient, quizId?: string) => {
    const promises: Promise<unknown>[] = [
      qc.invalidateQueries({ queryKey: quizKeys.lists() }),
      qc.invalidateQueries({ queryKey: quizKeys.adminLists() }),
      qc.invalidateQueries({ queryKey: adminKeys.analytics() }),
    ];
    if (quizId) {
      promises.push(
        qc.invalidateQueries({ queryKey: quizKeys.detail(quizId) }),
        qc.invalidateQueries({ queryKey: quizKeys.adminDetail(quizId) }),
        qc.invalidateQueries({ queryKey: quizKeys.checklist(quizId) })
      );
    }
    await Promise.all(promises);
  },

  /**
   * After a quiz is published or unpublished
   */
  onQuizPublish: async (qc: QueryClient, _quizId: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: quizKeys.all }),
      qc.invalidateQueries({ queryKey: adminKeys.analytics() }),
      qc.invalidateQueries({ queryKey: studentKeys.analytics() }),
    ]);
  },

  /**
   * After question created, updated, reordered, or deleted
   */
  onQuestionChange: async (qc: QueryClient, quizId: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: quizKeys.questions(quizId) }),
      qc.invalidateQueries({ queryKey: quizKeys.detail(quizId) }),
      qc.invalidateQueries({ queryKey: quizKeys.adminDetail(quizId) }),
      qc.invalidateQueries({ queryKey: quizKeys.checklist(quizId) }),
      qc.invalidateQueries({ queryKey: adminKeys.questionAnalytics() }),
    ]);
  },

  /**
   * After starting a new assessment attempt
   */
  onAttemptStart: async (qc: QueryClient, quizId: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: quizKeys.detail(quizId) }),
      qc.invalidateQueries({ queryKey: attemptKeys.history() }),
      qc.invalidateQueries({ queryKey: studentKeys.analytics() }),
    ]);
  },

  /**
   * After an attempt is completed / submitted
   * Reconciles all dependent downstream views
   */
  onAttemptSubmit: async (qc: QueryClient, attemptId: string, quizId?: string) => {
    // 1. Invalidate active attempt
    qc.removeQueries({ queryKey: attemptKeys.detail(attemptId) });

    // 2. Invalidate dependent history, dashboard, rankings, certificates, and admin metrics
    const promises: Promise<unknown>[] = [
      qc.invalidateQueries({ queryKey: attemptKeys.history() }),
      qc.invalidateQueries({ queryKey: attemptKeys.adminList() }),
      qc.invalidateQueries({ queryKey: studentKeys.analytics() }),
      qc.invalidateQueries({ queryKey: studentKeys.certificates() }),
      qc.invalidateQueries({ queryKey: leaderboardKeys.all }),
      qc.invalidateQueries({ queryKey: adminKeys.analytics() }),
      qc.invalidateQueries({ queryKey: adminKeys.questionAnalytics() }),
    ];

    if (quizId) {
      promises.push(qc.invalidateQueries({ queryKey: quizKeys.detail(quizId) }));
    }

    await Promise.all(promises);
  },

  /**
   * After user status or role change
   */
  onUserChange: async (qc: QueryClient, userId?: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: adminKeys.users() }),
      qc.invalidateQueries({ queryKey: adminKeys.analytics() }),
      userId ? qc.invalidateQueries({ queryKey: authKeys.me() }) : Promise.resolve(),
    ]);
  },

  /**
   * User Switch & Logout Purge
   * Prevents Student A's cached state from leaking to Student B
   */
  clearUserCacheOnLogout: (qc: QueryClient) => {
    // Cancel in-flight queries
    qc.cancelQueries();

    // Evict all user-specific and protected queries
    qc.removeQueries({ queryKey: authKeys.all });
    qc.removeQueries({ queryKey: attemptKeys.all });
    qc.removeQueries({ queryKey: studentKeys.all });
    qc.removeQueries({ queryKey: adminKeys.all });
    qc.removeQueries({ queryKey: notificationKeys.all });

    // Invalidate remaining queries to force fresh fetch on next login
    qc.invalidateQueries({ queryKey: quizKeys.all });
  },
};
