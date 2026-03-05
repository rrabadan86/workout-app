'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp, Dumbbell, Save, Play, Square, Timer, Trash2, Edit2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ExerciseThumbnail from '@/components/ExerciseThumbnail';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import WorkoutPhotoCapture from '@/components/WorkoutPhotoCapture';
import ShareCard from '@/components/ShareCard';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { uid, formatDate, today } from '@/lib/utils';
import { evaluateBadges } from '@/lib/badges';
import type { WorkoutLog } from '@/lib/types';

const ExerciseChart = dynamic(() => import('@/components/ExerciseChart'), {
    ssr: false,
    loading: () => <div className="h-48 w-full bg-slate-50 rounded-2xl animate-pulse" />,
});

function ActiveWorkoutGif({ url, name }: { url: string; name: string }) {
    const [useProxy, setUseProxy] = useState(false);

    useEffect(() => {
        setUseProxy(false);
    }, [url]);

    if (!url) return null;

    const actualUrl = url.trim();
    const getProxiedUrl = (u: string) => {
        if (u.includes('supabase.co')) return u;
        return `/api/proxy-image?url=${encodeURIComponent(u)}`;
    };

    return (
        <img
            key={actualUrl}
            src={useProxy ? getProxiedUrl(actualUrl) : actualUrl}
            alt={`Execução de ${name}`}
            className="w-full h-auto object-contain rounded-xl"
            style={{ maxHeight: '250px' }}
            loading="lazy"
            onError={() => {
                if (!useProxy && !actualUrl.includes('supabase.co')) {
                    setUseProxy(true);
                }
            }}
        />
    );
}

export default function WorkoutDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, loading, addLog, updateLog, deleteLog, addFeedEvent, refresh } = useStore();
    const [expanded, setExpanded] = useState<string | null>(null);
    const [weights, setWeights] = useState<Record<string, string[]>>({});
    const [loadedStorage, setLoadedStorage] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // ─── Timer ────────────────────────────────────────────────────────────
    const [timerRunning, setTimerRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [confirmingFinish, setConfirmingFinish] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [finalDuration, setFinalDuration] = useState(0);
    const startedAtRef = useRef<number | null>(null);

    // ─── Photo & Share Card ───────────────────────────────────────────────
    const [workoutPhoto, setWorkoutPhoto] = useState<File | null>(null);
    const [showShareCard, setShowShareCard] = useState(false);
    const [shareCardData, setShareCardData] = useState<{
        workoutName: string; projectName?: string; date: string; duration: string;
        totalSets: number; completedSets: number; totalVolume: number;
        exercises: { name: string; sets: string }[]; photoUrl?: string | null; userName?: string;
    } | null>(null);

    useEffect(() => {
        if (!timerRunning) return;
        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - (startedAtRef.current ?? Date.now())) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [timerRunning]);

    function fmtTime(s: number) {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return h > 0
            ? `${h}h ${String(m).padStart(2, '0')}min ${String(sec).padStart(2, '0')}s`
            : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    function startWorkout() {
        startedAtRef.current = Date.now();
        setElapsedSeconds(0);
        setTimerRunning(true);
    }

    async function finishWorkout() {
        console.log('[Workout] Finishing workout...', { id, elapsedSeconds });
        const finalSecs = elapsedSeconds;
        const capturedWeights = { ...weights };
        setTimerRunning(false);
        setFinalDuration(finalSecs);
        setIsFinished(true);

        // Zera UI
        setElapsedSeconds(0);
        startedAtRef.current = null;
        setWeights((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach(k => next[k] = Array(next[k].length).fill(''));
            return next;
        });

        localStorage.removeItem(`vimu_active_${id}`);

        if (workout) {
            try {
                const totalEx = workout.exercises.length;
                let doneEx = Object.values(capturedWeights).filter(arr =>
                    arr.some(v => v !== '')).length;

                // Capture the log IDs for TODAY's entries for this workout
                // This allows feed to correctly show only THIS session's exercises
                const todayStr = today();
                const sessionLogIds = store.logs
                    .filter(l => l.workoutId === workout.id && l.userId === userId && l.date === todayStr)
                    .map(l => l.id)
                    .join(',');

                // Save payload as WO_COMPLETED|Workout Name|done|total|logId1,logId2,...
                const payloadType = `WO_COMPLETED|${workout.name}|${doneEx}|${totalEx}|${sessionLogIds}`;

                console.log('[Workout] Creating feed event...');
                const newFeedEventId = uid();

                // ─── Photo Upload ──────────────────────────────────────────
                let photoUrl: string | null = null;
                if (workoutPhoto) {
                    try {
                        const storagePath = `${userId}/${newFeedEventId}.webp`;
                        const { error: uploadErr } = await supabase.storage
                            .from('workout-photos')
                            .upload(storagePath, workoutPhoto, { contentType: 'image/webp', upsert: false });
                        if (uploadErr) {
                            console.error('[Workout] Photo upload error:', uploadErr);
                        } else {
                            const { data: publicData } = supabase.storage
                                .from('workout-photos')
                                .getPublicUrl(storagePath);
                            photoUrl = publicData.publicUrl;
                            console.log('[Workout] Photo uploaded:', photoUrl);
                        }
                    } catch (photoErr) {
                        console.error('[Workout] Photo upload failed:', photoErr);
                    }
                }

                await addFeedEvent({
                    id: newFeedEventId,
                    userId,
                    eventType: payloadType,
                    referenceId: workout.id,
                    createdAt: new Date().toISOString(),
                    duration: finalSecs > 0 ? finalSecs : undefined,
                    photoUrl,
                });
                console.log('[Workout] Feed event created successfully.');

                // ─── Build Share Card Data ─────────────────────────────────
                const todayLogs = store.logs.filter(l => l.workoutId === workout.id && l.userId === userId && l.date === todayStr);
                let totalVolume = 0;
                let totalSetsCount = 0;
                const exerciseList: { name: string; sets: string }[] = [];

                for (const log of todayLogs) {
                    const exObj = store.exercises.find(e => e.id === log.exerciseId);
                    const vol = log.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
                    totalVolume += vol;
                    totalSetsCount += log.sets.length;
                    const weightsStr = log.sets.map(s => `${s.weight}kg`).join(' / ');
                    exerciseList.push({ name: exObj?.name || 'Exercício', sets: `${log.sets.length}x · ${weightsStr}` });
                }

                const plannedSetsTotal = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
                const fmtDur = finalSecs > 0 ? (
                    Math.floor(finalSecs / 3600) > 0
                        ? `${Math.floor(finalSecs / 3600)}h${String(Math.floor((finalSecs % 3600) / 60)).padStart(2, '0')}min`
                        : `${String(Math.floor(finalSecs / 60)).padStart(2, '0')}:${String(finalSecs % 60).padStart(2, '0')}`
                ) : '00:00';
                const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
                const userName = store.profiles.find(p => p.id === userId)?.name;
                const projName = project?.name;

                setShareCardData({
                    workoutName: workout.name,
                    projectName: projName,
                    date: dateStr,
                    duration: fmtDur,
                    totalSets: plannedSetsTotal,
                    completedSets: totalSetsCount,
                    totalVolume,
                    exercises: exerciseList,
                    photoUrl: photoUrl || (workoutPhoto ? URL.createObjectURL(workoutPhoto) : null),
                    userName,
                });
                setShowShareCard(true);
                setWorkoutPhoto(null);

                // --- 🏆 Challenge Auto Check-in Logic ---
                console.log('[Workout] Processing auto check-ins...');
                try {
                    const todayStr = today();
                    const myChallengeIds = store.challengeParticipants.filter(p => p.user_id === userId).map(p => p.challenge_id);
                    const activeChallenges = store.challenges.filter(c =>
                        myChallengeIds.includes(c.id) &&
                        c.status === 'active' &&
                        todayStr >= c.start_date && todayStr <= c.end_date
                    );

                    const checkinsToInsert = [];
                    for (const challenge of activeChallenges) {
                        // Validate Specific Workout Rule
                        if (challenge.checkin_type === 'specific_workout' && challenge.specific_workout_id !== workout.id) continue;

                        // Validate check-in doesn't already exist for today
                        const alreadyCheckedIn = store.challengeCheckins.some(ck => ck.challenge_id === challenge.id && ck.user_id === userId && ck.checkin_date === todayStr);
                        if (alreadyCheckedIn) continue;

                        checkinsToInsert.push({
                            id: uid(),
                            challenge_id: challenge.id,
                            user_id: userId,
                            checkin_date: todayStr,
                            checkin_type: 'auto',
                            workout_id: workout.id,
                            feed_event_id: newFeedEventId
                        });
                    }

                    if (checkinsToInsert.length > 0) {
                        const { error } = await supabase.from('challenge_checkins').insert(checkinsToInsert);
                        if (error) console.error('[Workout] Failed array insert for checkins:', error);
                        else {
                            console.log(`[Workout] Auto check-in completed for ${checkinsToInsert.length} challenges.`);
                            const updatedCheckins = [...store.challengeCheckins, ...(checkinsToInsert as any[])];
                            for (const ck of checkinsToInsert) {
                                await evaluateBadges(userId, ck.challenge_id, updatedCheckins, store.challengeBadges);
                            }
                            await refresh();
                        }
                    }
                } catch (ckErr) {
                    console.error('[Workout] Auto check-in error:', ckErr);
                }
                // ----------------------------------------
            } catch (err) {
                console.error('[Workout] Failed to create feed event:', err);
                setToast({ msg: 'Erro ao salvar atividade no feed. Tente novamente.', type: 'error' });
            }
        } else {
            console.warn('[Workout] No workout found in store during finalization.');
        }
    }

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    const workout = store.workouts.find((x) => x.id === id) ?? null;
    const project = workout ? store.projects.find((p) => p.id === workout.projectId) ?? null : null;

    useEffect(() => {
        if (!workout) return;
        try {
            const saved = localStorage.getItem(`vimu_active_${id}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.weights && Object.keys(parsed.weights).length > 0) {
                    setWeights(parsed.weights);
                } else {
                    initWeights();
                }
                if (parsed.timerRunning) setTimerRunning(true);
                if (parsed.startedAt) startedAtRef.current = parsed.startedAt;

                if (parsed.timerRunning && parsed.startedAt) {
                    setElapsedSeconds(Math.floor((Date.now() - parsed.startedAt) / 1000));
                }
            } else {
                initWeights();
            }
        } catch (e) {
            initWeights();
        }
        setLoadedStorage(true);

        function initWeights() {
            setWeights((prev) => {
                const next = { ...prev };
                workout!.exercises.forEach(({ exerciseId, sets }, idx) => {
                    const key = `${exerciseId}-${idx}`;
                    if (!next[key]) {
                        // Pre-fill with last workout values
                        const lastLogs = store.logs
                            .filter((l) => l.workoutId === id && l.exerciseId === exerciseId && l.userId === userId)
                            .sort((a, b) => a.date.localeCompare(b.date));
                        const lastLog = lastLogs[lastLogs.length - 1];
                        if (lastLog && lastLog.sets.length > 0) {
                            next[key] = sets.map((_, sIdx) =>
                                lastLog.sets[sIdx] ? String(lastLog.sets[sIdx].weight) : ''
                            );
                        } else {
                            next[key] = Array(sets.length).fill('');
                        }
                    }
                });
                return next;
            });
        }
    }, [id, workout?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!workout || !loadedStorage || isFinished) return;
        localStorage.setItem(`vimu_active_${id}`, JSON.stringify({
            timerRunning,
            startedAt: startedAtRef.current,
            weights
        }));
    }, [id, workout?.id, timerRunning, weights, loadedStorage, isFinished]);

    // Pre-fill weights from last workout once logs are available
    useEffect(() => {
        if (!workout || !loadedStorage || store.logs.length === 0) return;
        setWeights((prev) => {
            const next = { ...prev };
            let changed = false;
            workout.exercises.forEach(({ exerciseId, sets }, idx) => {
                const key = `${exerciseId}-${idx}`;
                const current = next[key];
                // Only pre-fill if all values are empty (user hasn't typed anything)
                if (current && current.every((v) => v === '')) {
                    const lastLogs = store.logs
                        .filter((l) => l.workoutId === id && l.exerciseId === exerciseId && l.userId === userId)
                        .sort((a, b) => a.date.localeCompare(b.date));
                    const lastLog = lastLogs[lastLogs.length - 1];
                    if (lastLog && lastLog.sets.length > 0) {
                        next[key] = sets.map((_, sIdx) =>
                            lastLog.sets[sIdx] ? String(lastLog.sets[sIdx].weight) : ''
                        );
                        changed = true;
                    }
                }
            });
            return changed ? next : prev;
        });
    }, [workout?.id, loadedStorage, store.logs.length]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!ready || !userId || loading) return null;

    if (!workout) return (
        <>
            <Navbar />
            <div className="container" style={{ paddingTop: 40 }}>
                <div className="empty-state"><p>Treino não encontrado.</p></div>
            </div>
        </>
    );

    // Determine comparison friend from project sharedWith
    const projectSharedWith = project?.sharedWith ?? [];
    const comparisonFriendId = projectSharedWith.includes(userId)
        ? workout.ownerId   // I'm a shared user → compare with owner
        : (projectSharedWith[0] ?? undefined); // I'm owner → compare with first shared user
    const friendName = comparisonFriendId
        ? store.profiles.find((u) => u.id === comparisonFriendId)?.name ?? 'Amigo'
        : '';

    const hasAccess = workout.ownerId === userId || projectSharedWith.includes(userId) || project?.prescribed_to === userId;
    // Personal que prescreveu → pode VER mas NÃO executar
    const isPersonalViewing = !!(project?.prescribed_by === userId && project?.prescribed_to);
    const canExecute = hasAccess && !isPersonalViewing;
    // Quem é o dono dos registros que vamos exibir?
    const targetUserId = isPersonalViewing ? project!.prescribed_to! : userId;

    function getUserLogs(exId: string, uid: string): WorkoutLog[] {
        return store.logs
            .filter((l) => l.workoutId === id && l.exerciseId === exId && l.userId === uid)
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    function buildChartData(exId: string) {
        const myLogs = getUserLogs(exId, targetUserId);
        const frLogs = comparisonFriendId ? getUserLogs(exId, comparisonFriendId) : [];
        const dates = [...new Set([...myLogs.map((l) => l.date), ...frLogs.map((l) => l.date)])].sort();
        return dates.map((date) => {
            const m = myLogs.find((l) => l.date === date);
            const f = frLogs.find((l) => l.date === date);
            const point: Record<string, unknown> = { date: formatDate(date) };
            if (m) point['Você'] = Math.max(...m.sets.map((s) => s.weight));
            if (f && friendName) point[friendName] = Math.max(...f.sets.map((s) => s.weight));
            return point;
        });
    }

    async function handleSaveLog(slotKey: string, exId: string, setsDef: { reps: number }[]) {
        const ws = weights[slotKey] ?? [];
        const validSets = setsDef
            .map((def, i) => {
                const val = ws[i];
                const weight = parseFloat(val);
                return { weight, reps: def.reps, isValid: val !== undefined && val.trim() !== '' && !isNaN(weight) && weight >= 0 };
            })
            .filter(s => s.isValid)
            .map(s => ({ weight: s.weight, reps: s.reps }));

        if (validSets.length === 0) {
            setToast({ msg: 'Informe o peso de pelo menos uma série.', type: 'error' }); return;
        }

        const existingToday = store.logs.find(l => l.workoutId === id && l.exerciseId === exId && l.userId === userId && l.date === today());
        if (existingToday) {
            if (!window.confirm('Você já salvou um registro para este exercício hoje. Deseja salvar um novo registro mesmo assim?')) {
                return;
            }
        }

        setSaving(slotKey);
        await addLog({
            id: uid(), workoutId: id, userId, exerciseId: exId, date: today(),
            sets: validSets
        });
        setWeights((prev) => ({ ...prev, [slotKey]: Array(setsDef.length).fill('') }));
        setSaving(null);
        setToast({ msg: 'Registro salvo!', type: 'success' });
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <div className="w-full max-w-[1000px] mx-auto px-6 py-10 flex-1">
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-6">
                        <button onClick={() => router.push(project ? `/projects/${project.id}` : '/projects')} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-secondary)' }}>
                            ← Voltar para {project?.name ?? 'Treinos'}
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="page-title" style={{ marginBottom: 4 }}>{workout.name}</h1>
                            <p className="page-subtitle" style={{ marginTop: 0 }}>{workout.exercises.length} EXERCÍCIO(S)</p>
                        </div>

                        {/* Os botões do Timer saíram do Header e foram pro Footer Flutuante */}
                    </div>
                </div>

                <div className="flex flex-col gap-6 mb-12">
                    {workout.exercises.map(({ exerciseId, sets }, exIdx) => {
                        const slotKey = `${exerciseId}-${exIdx}`;
                        const exObj = store.exercises.find((e) => e.id === exerciseId);
                        const exName = exObj?.name ?? 'Exercício';
                        const isAerobico = exObj?.muscle === 'Aeróbico';
                        const isOpen = expanded === slotKey;
                        const myLogs = getUserLogs(exerciseId, targetUserId);
                        const lastLog = myLogs[myLogs.length - 1];
                        const friendLogs = comparisonFriendId ? getUserLogs(exerciseId, comparisonFriendId) : [];
                        const lastFriendLog = friendLogs.length > 0 ? friendLogs[friendLogs.length - 1] : undefined;
                        const chartData = buildChartData(exerciseId);
                        const repsSummary = sets.map((s) => s.reps).join(', ');
                        const unitLabel = isAerobico ? 'min' : 'kg';

                        return (
                            <div key={slotKey} className="bg-white rounded-2xl card-depth overflow-hidden animate-fade transition-all">
                                <div className="p-4 md:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors" onClick={() => setExpanded(isOpen ? null : slotKey)}>
                                    <div className="flex items-center gap-4">
                                        <ExerciseThumbnail
                                            thumbnailUrl={exObj?.thumbnail_url}
                                            gifUrl={exObj?.gif_url}
                                            name={exName}
                                            size={40}
                                        />
                                        <div className="flex flex-col">
                                            <h3 className="text-base font-extrabold text-slate-900 leading-tight">{exName}</h3>
                                            <p className="text-[11px] font-bold text-slate-500 mt-1">
                                                {sets.length} séries{!isAerobico && <> · {repsSummary} reps</>}
                                                {lastLog && <span className="ml-2 text-primary">· Último: {Math.max(...lastLog.sets.map(s => s.weight))} {unitLabel}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block">
                                        {isOpen ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
                                    </div>
                                    <div className="sm:hidden flex justify-center w-full mt-1">
                                        {isOpen ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-6">

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                            {/* Exercise structure + optional weight inputs */}
                                            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
                                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">
                                                    {canExecute ? 'Registrar Hoje' : 'Séries Planejadas'}
                                                </p>
                                                <div className="flex flex-col gap-3 flex-1">
                                                    {sets.map((setDef, sIdx) => (
                                                        <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                                            <div className="flex items-center gap-4">
                                                                <span className="min-w-[4rem] shrink-0 text-sm font-bold text-slate-700">{setDef.label || `Série ${sIdx + 1}`}</span>
                                                                {!isAerobico && <span className="w-20 text-sm font-bold text-slate-400">× {setDef.reps} reps</span>}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {canExecute && (
                                                                    <input
                                                                        className="w-24 h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-900 text-base"
                                                                        type="number" min={0} step={0.5} placeholder={unitLabel}
                                                                        value={weights[slotKey]?.[sIdx] ?? ''}
                                                                        onChange={(e) => {
                                                                            const arr = [...(weights[slotKey] ?? Array(sets.length).fill(''))];
                                                                            arr[sIdx] = e.target.value;
                                                                            setWeights((prev) => ({ ...prev, [slotKey]: arr }));
                                                                        }}
                                                                    />
                                                                )}
                                                                {setDef.notes && <span className="text-xs font-bold text-indigo-400 opacity-80 max-w-[120px] leading-tight">💬 {setDef.notes}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {canExecute && (
                                                    <button
                                                        className="mt-8 w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-extrabold hover:bg-primary/90 transition-colors active:scale-95 shadow-md shadow-primary/20"
                                                        onClick={() => handleSaveLog(slotKey, exerciseId, sets)}
                                                        disabled={saving === slotKey}
                                                    >
                                                        <Save size={18} /> {saving === slotKey ? 'Salvando...' : 'Salvar Registro'}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-5 h-full">
                                                {/* Unified History: user logs + friend last log */}
                                                {(myLogs.length > 0 || lastFriendLog) && (() => {
                                                    const historyEntries: { id: string; date: string; sets: { weight: number; reps: number }[]; owner: 'me' | 'friend'; ownerName: string }[] = [];
                                                    myLogs.slice().reverse().slice(0, 3).forEach((log) => {
                                                        historyEntries.push({ id: log.id, date: log.date, sets: log.sets, owner: 'me', ownerName: 'Você' });
                                                    });
                                                    if (lastFriendLog) {
                                                        historyEntries.push({ id: `friend-${lastFriendLog.id}`, date: lastFriendLog.date, sets: lastFriendLog.sets, owner: 'friend', ownerName: friendName });
                                                    }
                                                    historyEntries.sort((a, b) => b.date.localeCompare(a.date));

                                                    return (
                                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-1">
                                                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Histórico Recente</p>
                                                            <div className="flex flex-col gap-1.5">
                                                                {historyEntries.map((entry) => (
                                                                    <div key={entry.id} className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${entry.owner === 'friend' ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                                                        {/* Color dot indicator */}
                                                                        <span className={`shrink-0 w-2 h-2 rounded-full ${entry.owner === 'friend' ? 'bg-indigo-400' : 'bg-primary'}`} />
                                                                        <span className="text-[11px] font-bold text-slate-500 shrink-0 w-[72px]">{formatDate(entry.date)}</span>
                                                                        {entry.owner === 'friend' && (
                                                                            <span className="text-[9px] font-extrabold text-indigo-400 uppercase shrink-0">{entry.ownerName}</span>
                                                                        )}
                                                                        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                                                                            {entry.sets.map((s, i) => (
                                                                                <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${entry.owner === 'friend' ? 'text-indigo-600 bg-white border-indigo-200' : 'text-slate-600 bg-white border-slate-200'}`}>
                                                                                    {s.weight}{unitLabel}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                        {entry.owner === 'me' && canExecute && (
                                                                            <div className="flex items-center gap-0.5 shrink-0">
                                                                                <button className="p-1.5 text-slate-400 hover:text-primary rounded-md hover:bg-white transition-colors" title="Carregar valores" onClick={() => {
                                                                                    const arr = Array(sets.length).fill('');
                                                                                    entry.sets.forEach((s, idx) => { if (idx < arr.length) arr[idx] = String(s.weight); });
                                                                                    setWeights(prev => ({ ...prev, [slotKey]: arr }));
                                                                                    setToast({ msg: 'Valores carregados!', type: 'success' });
                                                                                }}>
                                                                                    <Edit2 size={13} />
                                                                                </button>
                                                                                <button className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-white transition-colors" title="Excluir" onClick={async () => {
                                                                                    if (confirm('Excluir este registro?')) {
                                                                                        setSaving(entry.id);
                                                                                        await deleteLog(entry.id);
                                                                                        setSaving(null);
                                                                                        setToast({ msg: 'Registro excluído.', type: 'success' });
                                                                                    }
                                                                                }}>
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Chart — lazy loaded para reduzir bundle inicial */}
                                                {chartData.length > 0 && (
                                                    <ExerciseChart
                                                        chartData={chartData}
                                                        friendName={friendName}
                                                        comparisonFriendId={comparisonFriendId}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ─── Photo Capture Section ─── */}
                {canExecute && timerRunning && (
                    <div className="bg-white rounded-2xl card-depth p-5 mb-12">
                        <WorkoutPhotoCapture photo={workoutPhoto} onPhotoChange={setWorkoutPhoto} />
                    </div>
                )}
            </div>

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

            {/* Sticky Floating Action Bar */}
            {canExecute && (
                <div className="fixed bottom-[70px] md:bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
                    <div className="max-w-[600px] mx-auto flex items-center justify-center gap-3 md:gap-4">
                        {!timerRunning && elapsedSeconds === 0 ? (
                            <button
                                onClick={startWorkout}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-full font-extrabold text-lg tracking-wide hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/20"
                            >
                                <Timer size={20} className="stroke-[2.5]" /> 00:00 • Iniciar Treino
                            </button>
                        ) : !timerRunning ? (
                            <>
                                <button
                                    onClick={() => setTimerRunning(true)}
                                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full font-extrabold text-base md:text-lg tracking-wide hover:bg-emerald-100 transition-colors flex-1"
                                >
                                    <Play size={20} fill="currentColor" /> Retomar
                                </button>
                                <button
                                    onClick={() => setConfirmingFinish(true)}
                                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 bg-rose-500 text-white rounded-full font-extrabold text-base md:text-lg tracking-wide hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/20 flex-1"
                                >
                                    <Square size={16} fill="currentColor" className="mt-0.5" /> Finalizar
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full font-extrabold text-xl md:text-2xl tracking-wide flex-1 tabular-nums transition-all">
                                    <Timer size={24} className="stroke-[2.5]" /> {fmtTime(elapsedSeconds)}
                                </div>
                                <button
                                    onClick={() => {
                                        setTimerRunning(false);
                                        setConfirmingFinish(true);
                                    }}
                                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 bg-rose-500 text-white rounded-full font-extrabold text-base md:text-lg tracking-wide hover:bg-rose-600 transition-colors shadow-md shadow-rose-500/20 flex-1"
                                >
                                    <Square size={16} fill="currentColor" className="mt-0.5" /> Finalizar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Confirm Finish Modal */}
            {confirmingFinish && (
                <Modal title="Finalizar Treino" onClose={() => setConfirmingFinish(false)}
                    footer={
                        <>
                            <button className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors w-full sm:w-auto" onClick={() => {
                                setConfirmingFinish(false);
                                if (startedAtRef.current && elapsedSeconds > 0) {
                                    setTimerRunning(true); // Retoma o cronômetro caso estivesse rodando
                                }
                            }}>
                                Continuar Treinando
                            </button>
                            <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors w-full sm:w-auto shadow-md" onClick={() => {
                                setConfirmingFinish(false);
                                finishWorkout();
                            }}>
                                Confirmar e Finalizar
                            </button>
                        </>
                    }
                >
                    <div className="flex flex-col gap-5 py-2">
                        <p className="text-slate-600 font-medium text-sm">Verifique o seu progresso de hoje antes de encerrar o treino definitivamente e lançá-lo no histórico.</p>

                        {elapsedSeconds > 0 && (
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between shadow-sm">
                                <span className="font-bold text-emerald-700 uppercase tracking-widest text-[10px] md:text-xs">Tempo de Treino</span>
                                <span className="font-extrabold text-emerald-600 text-xl tabular-nums">{fmtTime(elapsedSeconds)}</span>
                            </div>
                        )}

                        {(() => {
                            const todayLogs = store.logs.filter(l => l.workoutId === id && l.userId === userId && l.date === today());
                            if (todayLogs.length === 0) {
                                return (
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center">
                                        <Dumbbell size={24} className="text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm font-bold text-slate-500">Nenhuma série registrada hoje.</p>
                                        <p className="text-xs text-slate-400 mt-1">Este treino será salvo no histórico sem peso/volume contabilizado.</p>
                                    </div>
                                );
                            }

                            let totalVolume = 0;
                            let totalSets = 0;

                            return (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-3 bg-slate-50 border-b border-slate-200">
                                        <h4 className="font-extrabold text-slate-700 text-[10px] lg:text-xs uppercase tracking-wider text-center">Resumo de Séries Salvas</h4>
                                    </div>
                                    <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto no-scrollbar">
                                        {todayLogs.map(log => {
                                            const logEx = store.exercises.find(e => e.id === log.exerciseId);
                                            const exName = logEx?.name || 'Exercício';
                                            const logUnit = logEx?.muscle === 'Aeróbico' ? 'min' : 'kg';
                                            const vol = log.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
                                            totalVolume += vol;
                                            totalSets += log.sets.length;

                                            // Formatar pesos de cada série separados por barra
                                            const weightsStr = log.sets.map(s => `${s.weight} ${logUnit}`).join(' / ');

                                            return (
                                                <div key={log.id} className="p-3 flex items-center justify-between text-xs md:text-sm">
                                                    <span className="font-bold text-slate-700 flex items-center gap-2">
                                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-extrabold text-[10px] md:text-xs">{log.sets.length}x</span>
                                                        <span className="text-[10px] md:text-xs truncate max-w-[140px] md:max-w-[220px]">{exName}</span>
                                                    </span>
                                                    <span className="text-[10px] md:text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md text-right max-w-[180px] md:max-w-[250px] truncate" title={weightsStr}>
                                                        {weightsStr}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white">
                                        <span className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Total: {totalSets} Séries</span>
                                        <span className="font-extrabold text-sm">{totalVolume} volume total</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </Modal>
            )}

            {/* Share Card (After Confirmation) */}
            {showShareCard && shareCardData && (
                <ShareCard
                    {...shareCardData}
                    onClose={() => {
                        setShowShareCard(false);
                        setShareCardData(null);
                    }}
                />
            )}
        </div>
    );
}
