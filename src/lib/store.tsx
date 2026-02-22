'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { AppStore, User, Exercise, Workout, WorkoutLog } from './types';

const STORE_KEY = 'fitsync_store';

const defaultStore: AppStore = { users: [], exercises: [], workouts: [], logs: [] };

export function readStore(): AppStore {
    if (typeof window === 'undefined') return defaultStore;
    try {
        const raw = localStorage.getItem(STORE_KEY);
        return raw ? { ...defaultStore, ...JSON.parse(raw) } : defaultStore;
    } catch { return defaultStore; }
}

function writeStore(s: AppStore) {
    if (typeof window !== 'undefined') localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

// ─── Store Context ───────────────────────────────────────────────────────────
interface StoreContextValue {
    store: AppStore;
    mutate: (fn: (prev: AppStore) => AppStore) => void;
}

const StoreContext = createContext<StoreContextValue>({
    store: defaultStore,
    mutate: () => { },
});

export function StoreProvider({ children }: { children: ReactNode }) {
    const [store, setStore] = useState<AppStore>(defaultStore);

    useEffect(() => {
        setStore(readStore());
    }, []);

    const mutate = useCallback((fn: (prev: AppStore) => AppStore) => {
        setStore((prev) => {
            const next = fn(prev);
            writeStore(next);
            return next;
        });
    }, []);

    return <StoreContext.Provider value={{ store, mutate }}> {children} </StoreContext.Provider>;
}

export function useStore() {
    const { store, mutate } = useContext(StoreContext);

    const addUser = useCallback((u: User) => mutate((s) => ({ ...s, users: [...s.users, u] })), [mutate]);
    const addExercise = useCallback((e: Exercise) => mutate((s) => ({ ...s, exercises: [...s.exercises, e] })), [mutate]);
    const updateExercise = useCallback((e: Exercise) => mutate((s) => ({ ...s, exercises: s.exercises.map((x) => x.id === e.id ? e : x) })), [mutate]);
    const deleteExercise = useCallback((id: string) => mutate((s) => ({ ...s, exercises: s.exercises.filter((x) => x.id !== id) })), [mutate]);
    const addWorkout = useCallback((w: Workout) => mutate((s) => ({ ...s, workouts: [...s.workouts, w] })), [mutate]);
    const updateWorkout = useCallback((w: Workout) => mutate((s) => ({ ...s, workouts: s.workouts.map((x) => x.id === w.id ? w : x) })), [mutate]);
    const deleteWorkout = useCallback((id: string) => mutate((s) => ({ ...s, workouts: s.workouts.filter((x) => x.id !== id) })), [mutate]);
    const addLog = useCallback((l: WorkoutLog) => mutate((s) => ({ ...s, logs: [...s.logs, l] })), [mutate]);

    return { store, addUser, addExercise, updateExercise, deleteExercise, addWorkout, updateWorkout, deleteWorkout, addLog };
}

// ─── Session helpers ──────────────────────────────────────────────────────────
export function getSession(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('fitsync_user');
}
export function setSession(userId: string) { sessionStorage.setItem('fitsync_user', userId); }
export function clearSession() { sessionStorage.removeItem('fitsync_user'); }
