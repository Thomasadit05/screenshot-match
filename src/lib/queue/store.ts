/**
 * Shared mock state. Acts as the "database" for the prototype: every page reads
 * from it, so a change on the capster dashboard shows up on the home page,
 * ticket and waiting-room display. Persisted to localStorage and synced across
 * tabs; reseeded automatically when the stored data is from another day.
 */
import { useSyncExternalStore } from "react";
import { MINUTE } from "./config";
import { createSeed, STATE_VERSION } from "./seed";
import type { QueueState } from "./types";

const STORAGE_KEY = "cukur-rapi-queue-demo";
const MAX_AGE = 8 * 60 * MINUTE;

type Listener = () => void;
const listeners = new Set<Listener>();

const serverSnapshot: QueueState = createSeed(0);
let state: QueueState = serverSnapshot;
let loaded = false;

function load(): QueueState {
  if (typeof window === "undefined") return serverSnapshot;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as QueueState;
      if (parsed.version === STATE_VERSION && Date.now() - parsed.seededAt < MAX_AGE) return parsed;
    }
  } catch {
    /* corrupted storage: fall through to a fresh seed */
  }
  const fresh = createSeed(Date.now());
  persist(fresh);
  return fresh;
}

function persist(s: QueueState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    state = load();
    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        state = JSON.parse(e.newValue) as QueueState;
        listeners.forEach((l) => l());
      } catch {
        /* ignore */
      }
    });
  }
}

export function getState(): QueueState {
  ensureLoaded();
  return state;
}

export function setState(updater: (draft: QueueState) => QueueState | void) {
  ensureLoaded();
  const draft = structuredClone(state);
  const next = updater(draft) ?? draft;
  state = next;
  persist(next);
  listeners.forEach((l) => l());
}

export function resetState() {
  ensureLoaded();
  const session = state.session;
  state = { ...createSeed(Date.now()), session };
  persist(state);
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  ensureLoaded();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useQueueState(): QueueState {
  return useSyncExternalStore(subscribe, getState, () => serverSnapshot);
}
