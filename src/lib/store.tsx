'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from './supabase';
import type { AppStore, Profile, Exercise, Project, Workout, WorkoutLog, FeedEvent, Kudo } from './types';

const defaultStore: AppStore = { profiles: [], exercises: [], projects: [], workouts: [], logs: [], feedEvents: [], kudos: [] };

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
        const [usersRes, exercisesRes, projectsRes, workoutsRes, logsRes, feedRes, kudosRes] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('exercises').select('*'),
            supabase.from('projects').select('*'),
            supabase.from('workouts').select('*'),
            supabase.from('workout_logs').select('*'),
            supabase.from('feed_events').select('*'),
            supabase.from('kudos').select('*'),
        ]);
        setStore({
            profiles: (usersRes.data ?? []) as Profile[],
            exercises: (exercisesRes.data ?? []) as Exercise[],
            projects: (projectsRes.data ?? []) as Project[],
            workouts: (workoutsRes.data ?? []) as Workout[],
            logs: (logsRes.data ?? []) as WorkoutLog[],
            feedEvents: (feedRes.data ?? []) as FeedEvent[],
            kudos: (kudosRes.data ?? []) as Kudo[],
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
        // cascade: delete workouts and their logs
        const workoutIds = store.workouts.filter((w) => w.projectId === id).map((w) => w.id);
        if (workoutIds.length > 0) {
            for (const wid of workoutIds) {
                await supabase.from('workout_logs').delete().eq('"workoutId"', wid);
            }
            await supabase.from('workouts').delete().in('id', workoutIds);
        }
        await supabase.from('projects').delete().eq('id', id);
        await refresh();
    }, [refresh, store.workouts]);

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
        await supabase.from('workout_logs').delete().eq('"workoutId"', id);
        await supabase.from('workouts').delete().eq('id', id);
        await refresh();
    }, [refresh]);

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
        store, loading, refresh,
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
