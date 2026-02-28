'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import type { AppStore, Profile, Exercise, Project, Workout, WorkoutLog, FeedEvent, Kudo, Challenge, ChallengeParticipant, ChallengeInvite, ChallengeCheckin, ChallengeComment, ChallengeBadge } from './types';

const defaultStore: AppStore = { profiles: [], exercises: [], projects: [], workouts: [], logs: [], feedEvents: [], kudos: [], challenges: [], challengeParticipants: [], challengeInvites: [], challengeCheckins: [], challengeComments: [], challengeBadges: [] };

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
                const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000));

                const fetchTask = Promise.allSettled([
                    supabase.from('profiles').select('*'),
                    supabase.from('exercises').select('*'),
                    supabase.from('projects').select('*'),
                    supabase.from('workouts').select('*'),
                    supabase.from('workout_logs').select('*'),
                    supabase.from('feed_events').select('*'),
                    supabase.from('kudos').select('*'),
                    supabase.from('challenges').select('*'),
                    supabase.from('challenge_participants').select('*'),
                    supabase.from('challenge_invites').select('*'),
                    supabase.from('challenge_checkins').select('*'),
                    supabase.from('challenge_comments').select('*'),
                    supabase.from('challenge_badges').select('*'),
                ]);

                const result = await Promise.race([fetchTask, timeout]);

                // Timeout — queries travaram (provavelmente auth.uid() é NULL antes do login)
                if (result === null) {
                    console.warn('[Store] Fetch timed out — will retry after login.');
                    return;
                }

                const settled = result;

                const getValue = (res: PromiseSettledResult<any>, name: string) => {
                    if (res.status === 'rejected') {
                        console.error(`[Store] Failed to fetch ${name}:`, res.reason);
                        return [];
                    }
                    if (res.value?.error) {
                        console.error(`[Store] Query error on ${name}:`, res.value.error.message);
                        return [];
                    }
                    return res.value?.data ?? [];
                };

                const [usersRes, exercisesRes, projectsRes, workoutsRes, logsRes, feedRes, kudosRes, challengesRes, challengeParticipantsRes, challengeInvitesRes, challengeCheckinsRes, challengeCommentsRes, challengeBadgesRes] = settled;

                let workouts = getValue(workoutsRes, 'workouts') as Workout[];
                let projects = getValue(projectsRes, 'projects') as Project[];
                let logs = getValue(logsRes, 'workout_logs') as WorkoutLog[];
                const feedEvents = getValue(feedRes, 'feed_events') as FeedEvent[];

                console.log('[Store] Data fetched:', {
                    profiles: getValue(usersRes, 'profiles').length,
                    events: feedEvents.length,
                });

                // Secondary fetch: get friend workout data referenced by feed events
                const existingWorkoutIds = new Set(workouts.map(w => w.id));
                const missingWorkoutIds = [...new Set(
                    feedEvents
                        .filter(e => e.eventType.startsWith('WO_COMPLETED'))
                        .map(e => e.referenceId)
                        .filter(id => !existingWorkoutIds.has(id))
                )];

                if (missingWorkoutIds.length > 0) {
                    try {
                        const { data: extraWorkouts } = await supabase
                            .from('workouts').select('*').in('id', missingWorkoutIds);
                        if (extraWorkouts && extraWorkouts.length > 0) {
                            workouts = [...workouts, ...extraWorkouts as Workout[]];
                            // Also fetch their parent projects and logs
                            const existingProjectIds = new Set(projects.map(p => p.id));
                            const missingProjectIds = [...new Set(
                                (extraWorkouts as Workout[]).map(w => w.projectId).filter(id => !existingProjectIds.has(id))
                            )];
                            const extraWorkoutIds = (extraWorkouts as Workout[]).map(w => w.id);
                            const [projRes, logRes] = await Promise.allSettled([
                                missingProjectIds.length > 0
                                    ? supabase.from('projects').select('*').in('id', missingProjectIds)
                                    : Promise.resolve({ data: [], error: null }),
                                supabase.from('workout_logs').select('*').in('"workoutId"', extraWorkoutIds),
                            ]);
                            const extraProjects = getValue(projRes, 'friend_projects') as Project[];
                            const extraLogs = getValue(logRes, 'friend_logs') as WorkoutLog[];
                            if (extraProjects.length > 0) projects = [...projects, ...extraProjects];
                            if (extraLogs.length > 0) logs = [...logs, ...extraLogs];
                        }
                    } catch (err) {
                        console.warn('[Store] Could not fetch friend workout data:', err);
                    }
                }

                setStore({
                    profiles: getValue(usersRes, 'profiles') as Profile[],
                    exercises: getValue(exercisesRes, 'exercises') as Exercise[],
                    projects,
                    workouts,
                    logs,
                    feedEvents,
                    kudos: getValue(kudosRes, 'kudos') as Kudo[],
                    challenges: getValue(challengesRes, 'challenges') as Challenge[],
                    challengeParticipants: getValue(challengeParticipantsRes, 'challenge_participants') as ChallengeParticipant[],
                    challengeInvites: getValue(challengeInvitesRes, 'challenge_invites') as ChallengeInvite[],
                    challengeCheckins: getValue(challengeCheckinsRes, 'challenge_checkins') as ChallengeCheckin[],
                    challengeComments: getValue(challengeCommentsRes, 'challenge_comments') as ChallengeComment[],
                    challengeBadges: getValue(challengeBadgesRes, 'challenge_badges') as ChallengeBadge[],
                });
            } catch (err) {
                console.error('[Store] Refresh issue:', err);
                // On failure, keep existing store if already populated
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
            await supabase.from('workout_logs').delete().in('"workoutId"', workoutIds);
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

    // ─── Challenges Admin ─────────────────────────────────────────────────
    const addChallengeParticipant = useCallback(async (p: ChallengeParticipant) => {
        const { error } = await supabase.from('challenge_participants').insert(p);
        if (error) throw new Error(error.message);
        await refresh();
    }, [refresh]);

    const removeChallengeParticipant = useCallback(async (id: string) => {
        // ID here is the challenge_participant table ID
        const { error } = await supabase.from('challenge_participants').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await refresh();
    }, [refresh]);

    const deleteChallenge = useCallback(async (id: string) => {
        // supabase might cascade, but we explicitly delete to be safe
        await supabase.from('challenge_participants').delete().eq('challenge_id', id);
        await supabase.from('challenge_checkins').delete().eq('challenge_id', id);
        await supabase.from('challenge_badges').delete().eq('challenge_id', id);
        // ... then delete challenge
        const { error } = await supabase.from('challenges').delete().eq('id', id);
        if (error) throw new Error(error.message);
        await refresh();
    }, [refresh]);

    const updateChallenge = useCallback(async (c: Partial<Challenge> & { id: string }) => {
        const { error } = await supabase.from('challenges').update(c).eq('id', c.id);
        if (error) throw new Error(error.message);
        await refresh();
    }, [refresh]);

    return {
        store, setStore, loading, refresh,
        addProfile, updateProfile,
        addExercise, updateExercise, deleteExercise,
        addProject, updateProject, deleteProject,
        addWorkout, updateWorkout, deleteWorkout,
        addLog, updateLog, deleteLog,
        addFeedEvent, updateFeedEvent, deleteFeedEvent, toggleKudo,
        addChallengeParticipant, removeChallengeParticipant, deleteChallenge, updateChallenge,
    };
}

// ─── Session helpers ──────────────────────────────────────────────────────────
export function getSession(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('fitsync_user');
}
export function setSession(userId: string) { sessionStorage.setItem('fitsync_user', userId); }
export function clearSession() { sessionStorage.removeItem('fitsync_user'); }
