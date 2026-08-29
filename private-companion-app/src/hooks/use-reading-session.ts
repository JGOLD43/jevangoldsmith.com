import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { beginReadingSession, endReadingSession, heartbeatReadingSession } from '@/storage/reading-analytics';

const HEARTBEAT_MS = 15_000;

export function useReadingSession(bookId: string | null, ready: boolean, onSessionEnded?: () => void) {
  const sessionRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const readyRef = useRef(ready);
  const activeRef = useRef(AppState.currentState === 'active');
  const endedCallbackRef = useRef(onSessionEnded);
  readyRef.current = ready;
  endedCallbackRef.current = onSessionEnded;

  const stop = useCallback(async () => {
    const sessionId = sessionRef.current;
    sessionRef.current = null;
    if (!sessionId) return;
    await endReadingSession(sessionId);
    endedCallbackRef.current?.();
  }, []);

  const start = useCallback(async () => {
    if (!bookId || !mountedRef.current || !readyRef.current || !activeRef.current || sessionRef.current || startingRef.current) return;
    startingRef.current = true;
    try {
      const sessionId = await beginReadingSession(bookId);
      if (!mountedRef.current || !readyRef.current || !activeRef.current) await endReadingSession(sessionId);
      else sessionRef.current = sessionId;
    } finally {
      startingRef.current = false;
    }
  }, [bookId]);

  useEffect(() => {
    if (ready) void start();
    else void stop();
  }, [ready, start, stop]);

  useEffect(() => {
    mountedRef.current = true;
    void start();
    const interval = setInterval(() => {
      if (sessionRef.current && activeRef.current) void heartbeatReadingSession(sessionRef.current);
    }, HEARTBEAT_MS);
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      activeRef.current = state === 'active';
      if (state === 'active') void start();
      else void stop();
    });
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      subscription.remove();
      void stop();
    };
  }, [start, stop]);
}
