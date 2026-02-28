'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import type { AppStore, Profile, Exercise, Project, Workout, WorkoutLog, FeedEvent, Kudo } from './types';

const defaultStore: AppStore = { profiles: [], exercises: [], projects: [], workouts: [], logs: [], feedEvents: [], kudos: [] };

// ─── Store Context ────────────────────────────────────────────────────────────
interface StoreContextValue {
    store: AppStore;
    setStore: React.Dispatch<React.SetStateAction<AppStore>>;
    loading: boolean;
    refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue>({
    store: defaultStore,
    setStore: () => { },
    loading: true,
    refresh: async () => { },
});

export function StoreProvider({ children }: { children: ReactNode }) {
    const [store, setStore] = useState<AppStore>(defaultStore);
    const [loading, setLoading] = useState(true);
    const refreshPromiseRef = useRef<Promise<void> | null>(null);

    const refresh = useCallback(async () => {
        if (refreshPromiseRef.current) return refreshPromiseRef.current;

        const runRefresh = async () => {
            console.log('[Store] Refreshing data...');
            try {
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Store fetch timeout')), 8000));

                const fetchTask = Promise.all([
                    supabase.from('profiles').select('*'),
                    supabase.from('exercises').select('*'),
                    supabase.from('projects').select('*'),
                    supabase.from('workouts').select('*'),
                    supabase.from('workout_logs').select('*'),
                    supabase.from('feed_events').select('*'),
                    supabase.from('kudos').select('*'),
                ]);

                const results = await Promise.race([fetchTask, timeout]) as any[];
                const [usersRes, exercisesRes, projectsRes, workoutsRes, logsRes, feedRes, kudosRes] = results;

                console.log('[Store] Data fetched:', { profiles: usersRes.data?.length, events: feedRes.data?.length });

                setStore({
                    profiles: (usersRes.data ?? []) as Profile[],
                    exercises: (exercisesRes.data ?? []) as Exercise[],
                    projects: (projectsRes.data ?? []) as Project[],
                    workouts: (workoutsRes.data ?? []) as Workout[],
                    logs: (logsRes.data ?? []) as WorkoutLog[],
                    feedEvents: (feedRes.data ?? []) as FeedEvent[],
                    kudos: (kudosRes.data ?? []) as Kudo[],
                });
            } catch (err) {
                console.error('[Store] Refresh issue:', err);
                // On failure, we keep the existing store if it was already populated
            } finally {
                setLoading(false);
                refreshPromiseRef.current = null;
            }
        };

        refreshPromiseRef.current = runRefresh();
        return refreshPromiseRef.current;
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    return (
        <StoreContext.Provider value={{ store, setStore, loading, refresh }}>
            {children}
        </StoreContext.Provider>
    );
}

// ─── useStore hook ────────────────────────────────────────────────────────────
export function useStore() {
    const { store, setStore, loading, refresh } = useContext(StoreContext);

    const addProfile = useCallback(async (u: Profile) => {
        await supabase.from('profiles').insert(u);
        await refresh();
    }, [refresh]);

    const updateProfile = useCallback(async (u: Profile) => {
        const { error } = await supabase.from('profiles').update(u).eq('id', u.id);
        if (error) {
            console.error('updateProfile error:', error);
            throw new Error(error.message);
        }
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

    // ─── Projects ─────────────────────────────────────────────────────────
    const addProject = useCallback(async (p: Project) => {
        const { error } = await supabase.from('projects').insert(p);
        if (error) { console.error('addProject error:', error); throw new Error(error.message); }
        await refresh();
    }, [refresh]);

    const updateProject = useCallback(async (p: Project) => {
        const { error } = await supabase.from('projects').update(p).eq('id', p.id);
        if (error) { console.error('updateProject error:', error); throw new Error(error.message); }
        await refresh();
    }, [refresh]);

    const deleteProject = useCallback(async (id: string) => {
        // cascade: delete feed_events (+ kudos), workout_logs e workouts
        const workoutIds = store.workouts.filter((w) => w.projectId === id).map((w) => w.id);
        if (workoutIds.length > 0) {
            // 1. Deletar kudos dos feed_events desses workouts
            const feedEventIds = store.feedEvents
                .filter((f) => workoutIds.includes(f.referenceId))
                .map((f) => f.id);
            if (feedEventIds.length > 0) {
                await supabase.from('kudos').delete().in('feedEventId', feedEventIds);
            }
            // 2. Deletar feed_events referenciando esses workouts
            await supabase.from('feed_events').delete().in('referenceId', workoutIds);
            // 3. Deletar logs
            for (const wid of workoutIds) {
                await supabase.from('workout_logs').delete().eq('"workoutId"', wid);
            }
            // 4. Deletar workouts
            await supabase.from('workouts').delete().in('id', workoutIds);
        }
        await supabase.from('projects').delete().eq('id', id);
        await refresh();
    }, [refresh, store.workouts, store.feedEvents]);

    // ─── Workouts ─────────────────────────────────────────────────────────
    const addWorkout = useCallback(async (w: Workout) => {
        await supabase.from('workouts').insert(w);
        await refresh();
    }, [refresh]);

    const updateWorkout = useCallback(async (w: Workout) => {
        await supabase.from('workouts').update(w).eq('id', w.id);
        await refresh();
    }, [refresh]);

    const deleteWorkout = useCallback(async (id: string) => {
        // 1. Buscar feed_events que referenciam este workout
        const feedEventIds = store.feedEvents
            .filter((f) => f.referenceId === id)
            .map((f) => f.id);
        // 2. Deletar kudos desses feed_events
        if (feedEventIds.length > 0) {
            await supabase.from('kudos').delete().in('feedEventId', feedEventIds);
        }
        // 3. Deletar feed_events
        await supabase.from('feed_events').delete().eq('referenceId', id);
        // 4. Deletar logs
        await supabase.from('workout_logs').delete().eq('"workoutId"', id);
        // 5. Deletar workout
        await supabase.from('workouts').delete().eq('id', id);
        await refresh();
    }, [refresh, store.feedEvents]);

    const updateLog = useCallback(async (l: WorkoutLog) => {
        await supabase.from('workout_logs').update(l).eq('id', l.id);
        await refresh();
    }, [refresh]);

    const deleteLog = useCallback(async (id: string) => {
        await supabase.from('workout_logs').delete().eq('id', id);
        await refresh();
    }, [refresh]);

    const addLog = useCallback(async (l: WorkoutLog) => {
        await supabase.from('workout_logs').insert(l);
        await refresh();
    }, [refresh]);

    // ─── Feed & Kudos ─────────────────────────────────────────────────────
    const addFeedEvent = useCallback(async (f: FeedEvent) => {
        await supabase.from('feed_events').insert(f);
        await refresh();
    }, [refresh]);

    const updateFeedEvent = useCallback(async (f: FeedEvent) => {
        await supabase.from('feed_events').update(f).eq('id', f.id);
        await refresh();
    }, [refresh]);

    const deleteFeedEvent = useCallback(async (id: string) => {
        await supabase.from('kudos').delete().eq('feedEventId', id);
        await supabase.from('feed_events').delete().eq('id', id);
        await refresh();
    }, [refresh]);

    const toggleKudo = useCallback(async (kudo: Kudo) => {
        // Check if kudo from this user already exists on this event
        const existing = store.kudos.find(k => k.feedEventId === kudo.feedEventId && k.userId === kudo.userId);
        if (existing) {
            await supabase.from('kudos').delete().eq('id', existing.id);
        } else {
            await supabase.from('kudos').insert(kudo);
        }
        await refresh();
    }, [refresh, store.kudos]);

    return {
        store, setStore, loading, refresh,
        addProfile, updateProfile,
        addExercise, updateExercise, deleteExercise,
        addProject, updateProject, deleteProject,
        addWorkout, updateWorkout, deleteWorkout,
        addLog, updateLog, deleteLog,
        addFeedEvent, updateFeedEvent, deleteFeedEvent, toggleKudo,
    };
}

// ─── Session helpers ──────────────────────────────────────────────────────────
export function getSession(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('fitsync_user');
}
export function setSession(userId: string) { sessionStorage.setItem('fitsync_user', userId); }
export function clearSession() { sessionStorage.removeItem('fitsync_user'); }
