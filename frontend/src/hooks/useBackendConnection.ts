import { useState, useEffect, useCallback, useRef } from 'react';
import { healthApi } from '../api/client';

export interface BackendConnectionState {
  isConnected: boolean;
  isChecking: boolean;
  latencyMs: number | null;
  lastChecked: Date | null;
  error: string | null;
  checkConnection: () => Promise<boolean>;
}

export function useBackendConnection(pollIntervalMs = 15000): BackendConnectionState {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    const start = performance.now();
    try {
      await healthApi.check();
      const duration = Math.round(performance.now() - start);
      if (isMounted.current) {
        setIsConnected(true);
        setLatencyMs(duration);
        setError(null);
        setLastChecked(new Date());
      }
      return true;
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      if (isMounted.current) {
        setIsConnected(false);
        setLatencyMs(null);
        setError(errObj?.message || 'Cannot reach backend server (http://localhost:8000)');
        setLastChecked(new Date());
      }
      return false;
    } finally {
      if (isMounted.current) {
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    // Initial probe
    checkConnection();

    // Heartbeat interval
    const interval = setInterval(() => {
      checkConnection();
    }, pollIntervalMs);

    // Re-check on browser focus or network online event
    const handleFocusOrOnline = () => {
      checkConnection();
    };

    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
    };
  }, [checkConnection, pollIntervalMs]);

  return {
    isConnected,
    isChecking,
    latencyMs,
    lastChecked,
    error,
    checkConnection,
  };
}
