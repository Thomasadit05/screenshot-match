/**
 * Simulated live updates: one shared poll every 5 seconds. Exposes loading,
 * offline and server-error states plus retry, so every page can show them.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useHydrated } from "@tanstack/react-router";
import { ApiError, poll } from "./api";
import { POLL_INTERVAL_MS } from "./config";
import { useQueueState } from "./store";
import type { QueueState } from "./types";

export type FeedStatus = "loading" | "ready" | "offline" | "error";

interface FeedValue {
  status: FeedStatus;
  lastUpdated: number | null;
  retrying: boolean;
  retry: () => void;
}

const FeedContext = createContext<FeedValue>({
  status: "loading",
  lastUpdated: null,
  retrying: false,
  retry: () => {},
});

export function LiveFeedProvider({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const busy = useRef(false);

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await poll();
      setStatus("ready");
      setLastUpdated(Date.now());
    } catch (e) {
      setStatus(e instanceof ApiError && e.kind === "offline" ? "offline" : "error");
    } finally {
      busy.current = false;
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void run();
    const t = setInterval(() => void run(), POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [hydrated, run]);

  const retry = useCallback(() => {
    setRetrying(true);
    void run();
  }, [run]);

  return (
    <FeedContext.Provider value={{ status, lastUpdated, retrying, retry }}>{children}</FeedContext.Provider>
  );
}

export function useFeed() {
  return useContext(FeedContext);
}

/** Store data as the "API" returns it; empty when the demo simulates empty data. */
export function useQueueData(): QueueState {
  const state = useQueueState();
  if (state.network === "empty") return { ...state, capsters: [], bookings: [] };
  return state;
}

/** Re-render on an interval (for countdowns and ETAs). */
export function useNow(intervalMs = 1000): number {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hydrated) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [hydrated, intervalMs]);
  return now;
}
