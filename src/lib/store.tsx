'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
        setStore(prev => ({ ...prev, workouts: [...prev.workouts, w] }));
        await supabase.from('workouts').insert(w);
    }, [setStore]);

    const updateWorkout = useCallback(async (w: Workout) => {
        setStore(prev => ({ ...prev, workouts: prev.workouts.map(x => x.id === w.id ? w : x) }));
        await supabase.from('workouts').update(w).eq('id', w.id);
    }, [setStore]);

    const deleteWorkout = useCallback(async (id: string) => {
        setStore(prev => ({ ...prev, workouts: prev.workouts.filter(x => x.id !== id), logs: prev.logs.filter(x => x.workoutId !== id) }));
        await supabase.from('workout_logs').delete().eq('"workoutId"', id);
        await supabase.from('workouts').delete().eq('id', id);
    }, [setStore]);

    const updateLog = useCallback(async (l: WorkoutLog) => {
        setStore(prev => ({ ...prev, logs: prev.logs.map(log => log.id === l.id ? l : log) }));
        await supabase.from('workout_logs').update(l).eq('id', l.id);
    }, [setStore]);

    const deleteLog = useCallback(async (id: string) => {
        setStore(prev => ({ ...prev, logs: prev.logs.filter(log => log.id !== id) }));
        await supabase.from('workout_logs').delete().eq('id', id);
    }, [setStore]);

    const addLog = useCallback(async (l: WorkoutLog) => {
        setStore(prev => ({ ...prev, logs: [...prev.logs, l] }));
        await supabase.from('workout_logs').insert(l);
    }, [setStore]);

    // ─── Feed & Kudos ─────────────────────────────────────────────────────
    const addFeedEvent = useCallback(async (f: FeedEvent) => {
        setStore(prev => ({ ...prev, feedEvents: [...prev.feedEvents, f] }));
        await supabase.from('feed_events').insert(f);
    }, [setStore]);

    const updateFeedEvent = useCallback(async (f: FeedEvent) => {
        setStore(prev => ({ ...prev, feedEvents: prev.feedEvents.map(x => x.id === f.id ? f : x) }));
        await supabase.from('feed_events').update(f).eq('id', f.id);
    }, [setStore]);

    const deleteFeedEvent = useCallback(async (id: string) => {
        setStore(prev => ({ ...prev, feedEvents: prev.feedEvents.filter(x => x.id !== id), kudos: prev.kudos.filter(k => k.feedEventId !== id) }));
        await supabase.from('kudos').delete().eq('feedEventId', id);
        await supabase.from('feed_events').delete().eq('id', id);
    }, [setStore]);

    const toggleKudo = useCallback(async (kudo: Kudo) => {
        // Check if kudo from this user already exists on this event
        const existing = store.kudos.find(k => k.feedEventId === kudo.feedEventId && k.userId === kudo.userId);
        if (existing) {
            setStore(prev => ({ ...prev, kudos: prev.kudos.filter(x => x.id !== existing.id) }));
            await supabase.from('kudos').delete().eq('id', existing.id);
        } else {
            setStore(prev => ({ ...prev, kudos: [...prev.kudos, kudo] }));
            await supabase.from('kudos').insert(kudo);
        }
    }, [store.kudos, setStore]);

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
