import { attemptApi, ApiError } from '../../api/client';
import { SaveAnswerRequest, SaveAnswerResponse } from '../../types';

export type GlobalSyncStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SAVED' | 'DEGRADED' | 'ERROR';
export type QuestionSyncStatus = 'NOT_SAVED' | 'SAVING' | 'SAVED' | 'FAILED' | 'RETRYING' | 'CONFLICT';

export interface QueueItem {
  operationId: string;
  attemptId: string;
  attemptQuestionId: string;
  selectedOptionId: string | null;
  createdAt: number;
  retryCount: number;
  idempotencyKey: string;
}

export interface SyncEngineListener {
  onQueueChange?: (pendingCount: number) => void;
  onQuestionStatusChange?: (attemptQuestionId: string, status: QuestionSyncStatus, error?: string) => void;
  onGlobalStatusChange?: (status: GlobalSyncStatus) => void;
  onAnswerConfirmed?: (attemptQuestionId: string, confirmedOptionId: string | null) => void;
  onRollback?: (attemptQuestionId: string, rolledBackOptionId: string | null, error: string) => void;
  onAttemptExpired?: () => void;
}

export interface SyncBarrierResult {
  success: boolean;
  failedCount: number;
  errorMessage?: string;
}

/**
 * Robust Answer Save Queue & Synchronization Engine
 * Features:
 * - Per-question serialized mutation queue
 * - Server confirmation tracking (confirmed-answer state)
 * - Automatic failure rollback to confirmed server state
 * - Rapid selection race prevention (A -> B -> C)
 * - Clear selection via identical synchronization pipeline
 * - Strict submission barrier locking inputs and ensuring zero unsynced mutations
 */
export class ActiveAssessmentSyncEngine {
  private attemptId: string;
  private queue: Map<string, QueueItem> = new Map(); // Keyed by attemptQuestionId (latest intent)
  private inFlight: Map<string, Promise<SaveAnswerResponse>> = new Map();
  private confirmedAnswers: Map<string, string | null> = new Map(); // Authoritative server state
  private failedQuestions: Map<string, string> = new Map(); // Tracks questions with unrecoverable save failures
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isOffline: boolean = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  private isLocked: boolean = false;
  private listeners: Set<SyncEngineListener> = new Set();
  private globalStatus: GlobalSyncStatus = 'SAVED';

  constructor(attemptId: string) {
    this.attemptId = attemptId;
  }

  public subscribe(listener: SyncEngineListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Seed the engine with initial confirmed answers loaded from the server
   */
  public setInitialConfirmedAnswers(initialAnswers: Record<string, string>) {
    for (const [aqId, optId] of Object.entries(initialAnswers)) {
      this.confirmedAnswers.set(aqId, optId);
      this.notifyStatus(aqId, 'SAVED');
    }
  }

  public getConfirmedAnswer(attemptQuestionId: string): string | null {
    return this.confirmedAnswers.get(attemptQuestionId) ?? null;
  }

  public setOffline(offline: boolean) {
    this.isOffline = offline;
    if (offline) {
      this.updateGlobalStatus('OFFLINE');
    } else {
      this.updateGlobalStatus(this.queue.size > 0 || this.inFlight.size > 0 ? 'SYNCING' : 'SAVED');
      this.processQueue();
    }
  }

  public setLocked(locked: boolean) {
    this.isLocked = locked;
  }

  /**
   * Enqueue answer mutation with debouncing and serialized execution
   */
  public enqueueAnswer(
    attemptQuestionId: string,
    selectedOptionId: string | null,
    immediate = false
  ) {
    if (this.isLocked) return;

    // Remove any previous failure state for this question when user initiates a new choice
    this.failedQuestions.delete(attemptQuestionId);

    // Clear existing debounce timer for this question
    const existingTimer = this.debounceTimers.get(attemptQuestionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.debounceTimers.delete(attemptQuestionId);
    }

    const item: QueueItem = {
      operationId: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      attemptId: this.attemptId,
      attemptQuestionId,
      selectedOptionId,
      createdAt: Date.now(),
      retryCount: 0,
      idempotencyKey: `ans_${this.attemptId}_${attemptQuestionId}_${Date.now()}`,
    };

    this.queue.set(attemptQuestionId, item);
    this.notifyStatus(attemptQuestionId, 'SAVING');
    this.notifyQueueChange();

    if (immediate) {
      this.processItem(attemptQuestionId);
    } else {
      const timer = setTimeout(() => {
        this.debounceTimers.delete(attemptQuestionId);
        this.processItem(attemptQuestionId);
      }, 350);
      this.debounceTimers.set(attemptQuestionId, timer);
    }
  }

  /**
   * Process a single queued question save with per-question serialization
   */
  private async processItem(attemptQuestionId: string) {
    if (this.isOffline) {
      this.notifyStatus(attemptQuestionId, 'RETRYING', 'Offline. Paused until connection is restored.');
      this.updateGlobalStatus('OFFLINE');
      return;
    }

    const item = this.queue.get(attemptQuestionId);
    if (!item) return;

    // If an operation is already in flight for this question, let it complete;
    // the finally block will automatically check and process this newer item.
    if (this.inFlight.has(attemptQuestionId)) {
      return;
    }

    this.updateGlobalStatus('SYNCING');
    this.notifyStatus(attemptQuestionId, item.retryCount > 0 ? 'RETRYING' : 'SAVING');

    const req: SaveAnswerRequest = {
      attempt_question_id: item.attemptQuestionId,
      selected_option_id: item.selectedOptionId,
    };

    const promise = attemptApi.saveAnswer(this.attemptId, req, {
      idempotencyKey: item.idempotencyKey,
    });

    this.inFlight.set(attemptQuestionId, promise);

    try {
      const response = await promise;
      
      // Server confirmed this answer
      const serverConfirmedId = response.selected_option_id ?? null;
      
      // Check if a newer mutation was queued while this request was in flight
      const currentQueued = this.queue.get(attemptQuestionId);
      if (currentQueued && currentQueued.operationId === item.operationId) {
        // No newer mutation pending: commit confirmed answer state
        this.queue.delete(attemptQuestionId);
        this.confirmedAnswers.set(attemptQuestionId, serverConfirmedId);
        this.failedQuestions.delete(attemptQuestionId);
        this.notifyStatus(attemptQuestionId, 'SAVED');
        this.notifyAnswerConfirmed(attemptQuestionId, serverConfirmedId);
        this.notifyQueueChange();
      } else {
        // A newer mutation was enqueued: update interim confirmed state
        this.confirmedAnswers.set(attemptQuestionId, serverConfirmedId);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === 'ATTEMPT_EXPIRED' || (err.status === 400 && err.message.includes('expired'))) {
          this.queue.delete(attemptQuestionId);
          this.failedQuestions.set(attemptQuestionId, 'Assessment expired.');
          this.notifyStatus(attemptQuestionId, 'FAILED', 'Assessment expired.');
          this.listeners.forEach((l) => l.onAttemptExpired?.());
          return;
        }

        if (err.status === 409) {
          this.queue.delete(attemptQuestionId);
          this.failedQuestions.set(attemptQuestionId, 'Server conflict detected.');
          this.notifyStatus(attemptQuestionId, 'CONFLICT', 'Server conflict detected.');
          this.performRollback(attemptQuestionId, 'Server conflict detected.');
          return;
        }

        // Fatal client error (e.g. invalid option ID, attempt completed) -> rollback immediately
        if (err.status === 400 || err.status === 404 || err.status === 422) {
          this.queue.delete(attemptQuestionId);
          this.failedQuestions.set(attemptQuestionId, err.message);
          this.notifyStatus(attemptQuestionId, 'FAILED', err.message);
          this.performRollback(attemptQuestionId, err.message);
          this.updateGlobalStatus('ERROR');
          this.notifyQueueChange();
          return;
        }
      }

      // Handle transient failure with bounded exponential backoff
      if (item.retryCount < 3) {
        item.retryCount += 1;
        const delay = Math.min(800 * 2 ** item.retryCount, 8000) + Math.random() * 300;
        this.notifyStatus(attemptQuestionId, 'RETRYING', `Retrying save in ${(delay / 1000).toFixed(1)}s...`);
        this.updateGlobalStatus('DEGRADED');

        const retryTimer = setTimeout(() => {
          this.retryTimers.delete(attemptQuestionId);
          this.processItem(attemptQuestionId);
        }, delay);
        this.retryTimers.set(attemptQuestionId, retryTimer);
      } else {
        // Max retries exceeded: rollback UI to confirmed state and mark as failed
        this.queue.delete(attemptQuestionId);
        const errMsg = 'Failed to save answer after multiple attempts. Restored last confirmed answer.';
        this.failedQuestions.set(attemptQuestionId, errMsg);
        this.notifyStatus(attemptQuestionId, 'FAILED', errMsg);
        this.performRollback(attemptQuestionId, errMsg);
        this.updateGlobalStatus('ERROR');
        this.notifyQueueChange();
      }
    } finally {
      this.inFlight.delete(attemptQuestionId);

      // Per-question serialization continuation:
      // If a newer mutation is still queued for this question, immediately process it
      if (this.queue.has(attemptQuestionId)) {
        this.processItem(attemptQuestionId);
      }

      this.checkRemainingStatus();
    }
  }

  /**
   * Roll back UI to last confirmed server value
   */
  private performRollback(attemptQuestionId: string, error: string) {
    const rolledBackVal = this.confirmedAnswers.get(attemptQuestionId) ?? null;
    this.listeners.forEach((l) => l.onRollback?.(attemptQuestionId, rolledBackVal, error));
  }

  /**
   * Process all items currently queued
   */
  public processQueue() {
    if (this.isOffline) return;
    for (const attemptQuestionId of Array.from(this.queue.keys())) {
      this.processItem(attemptQuestionId);
    }
  }

  /**
   * SUBMISSION SYNCHRONIZATION BARRIER
   * 1. Locks all answer modifications
   * 2. Flushes all debounce timers immediately
   * 3. Awaits all in-flight and pending saves
   * 4. Ensures zero unsaved or failed answers before returning success
   */
  public async flushAndSynchronizeBarrier(): Promise<SyncBarrierResult> {
    this.isLocked = true;

    // 1. Clear all pending debounce timers and trigger immediate save
    for (const [aqId, timer] of this.debounceTimers.entries()) {
      clearTimeout(timer);
      this.debounceTimers.delete(aqId);
    }

    // 2. Clear retry timers and trigger immediately
    for (const [aqId, timer] of this.retryTimers.entries()) {
      clearTimeout(timer);
      this.retryTimers.delete(aqId);
    }

    // 3. Process all remaining queue items
    const queueKeys = Array.from(this.queue.keys());
    await Promise.all(queueKeys.map((aqId) => this.processItem(aqId)));

    // 4. Wait for all in-flight promises to settle
    while (this.inFlight.size > 0) {
      await Promise.all(Array.from(this.inFlight.values()));
    }

    // 5. Verify synchronization integrity
    if (this.failedQuestions.size > 0 || this.queue.size > 0) {
      const failedCount = this.failedQuestions.size + this.queue.size;
      return {
        success: false,
        failedCount,
        errorMessage: `${failedCount} answer mutation(s) could not be synchronized with the server.`,
      };
    }

    return {
      success: true,
      failedCount: 0,
    };
  }

  public getPendingCount(): number {
    return this.queue.size + this.inFlight.size;
  }

  public getFailedCount(): number {
    return this.failedQuestions.size;
  }

  public destroy() {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.retryTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
    this.retryTimers.clear();
    this.listeners.clear();
  }

  private notifyStatus(aqId: string, status: QuestionSyncStatus, error?: string) {
    this.listeners.forEach((l) => l.onQuestionStatusChange?.(aqId, status, error));
  }

  private notifyAnswerConfirmed(aqId: string, confirmedOptionId: string | null) {
    this.listeners.forEach((l) => l.onAnswerConfirmed?.(aqId, confirmedOptionId));
  }

  private notifyQueueChange() {
    const total = this.getPendingCount();
    this.listeners.forEach((l) => l.onQueueChange?.(total));
  }

  private updateGlobalStatus(status: GlobalSyncStatus) {
    this.globalStatus = status;
    this.listeners.forEach((l) => l.onGlobalStatusChange?.(status));
  }

  private checkRemainingStatus() {
    if (this.isOffline) {
      this.updateGlobalStatus('OFFLINE');
    } else if (this.failedQuestions.size > 0) {
      this.updateGlobalStatus('ERROR');
    } else if (this.getPendingCount() > 0) {
      this.updateGlobalStatus('SYNCING');
    } else {
      this.updateGlobalStatus('SAVED');
    }
  }
}
