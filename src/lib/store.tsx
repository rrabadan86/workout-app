'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from './supabase';
import type { AppStore, User, Exercise, Workout, WorkoutLog } from './types';

const defaultStore: AppStore = { users: [], exercises: [], workouts: [], logs: [] };

// ─── Store Context ────────────────────────────────────────────────────────────
interface StoreContextValue {
    store: AppStore;
    loading: boolean;
    refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue>({
    store: defaultStore,
    loading: true,
    refresh: async () => { },
});

export function StoreProvider({ children }: { children: ReactNode }) {
    const [store, setStore] = useState<AppStore>(defaultStore);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const [usersRes, exercisesRes, workoutsRes, logsRes] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('exercises').select('*'),
            supabase.from('workouts').select('*'),
            supabase.from('workout_logs').select('*'),
        ]);
        setStore({
            users: (usersRes.data ?? []) as User[],
            exercises: (exercisesRes.data ?? []) as Exercise[],
            workouts: (workoutsRes.data ?? []) as Workout[],
            logs: (logsRes.data ?? []) as WorkoutLog[],
        });
        setLoading(false);
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return (
        <StoreContext.Provider value={{ store, loading, refresh }}>
            {children}
        </StoreContext.Provider>
    );
}

// ─── useStore hook ────────────────────────────────────────────────────────────
export function useStore() {
    const { store, loading, refresh } = useContext(StoreContext);

    const addUser = useCallback(async (u: User) => {
        await supabase.from('users').insert(u);
        await refresh();
    }, [refresh]);

    const addExercise = useCallback(async (e: Exercise) => {
        await supabase.from('exercises').insert(e);
        await refresh();
    }, [refresh]);

    const updateExercise = useCallback(async (e: Exercise) => {
        await supabase.from('exercises').update(e).eq('id', e.id);
        await refresh();
    }, [refresh]);

    const deleteExercise = useCallback(async (id: string) => {
        await supabase.from('exercises').delete().eq('id', id);
        await refresh();
    }, [refresh]);

    const addWorkout = useCallback(async (w: Workout) => {
        await supabase.from('workouts').insert(w);
        await refresh();
    }, [refresh]);

    const updateWorkout = useCallback(async (w: Workout) => {
        await supabase.from('workouts').update(w).eq('id', w.id);
        await refresh();
    }, [refresh]);

    const deleteWorkout = useCallback(async (id: string) => {
        await supabase.from('workouts').delete().eq('id', id);
        await refresh();
    }, [refresh]);

    const addLog = useCallback(async (l: WorkoutLog) => {
        await supabase.from('workout_logs').insert(l);
        await refresh();
    }, [refresh]);

    return {
        store, loading,
        addUser, addExercise, updateExercise, deleteExercise,
        addWorkout, updateWorkout, deleteWorkout, addLog,
    };
}

// ─── Session helpers (sessionStorage — mantidos para auth) ───────────────────
export function getSession(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('fitsync_user');
}
export function setSession(userId: string) { sessionStorage.setItem('fitsync_user', userId); }
export function clearSession() { sessionStorage.removeItem('fitsync_user'); }
