'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp, Dumbbell, Save, Play, Square, Timer, Trash2, Edit2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { uid, formatDate, today } from '@/lib/utils';
import type { WorkoutLog } from '@/lib/types';

const ExerciseChart = dynamic(() => import('@/components/ExerciseChart'), {
    ssr: false,
    loading: () => <div className="h-48 w-full bg-slate-50 rounded-2xl animate-pulse" />,
});

export default function WorkoutDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, loading, addLog, updateLog, deleteLog, addFeedEvent } = useStore();
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
        setTimerRunning(false);
        setFinalDuration(finalSecs);
        setShowSummary(true);
        setIsFinished(true);

        // Zera UI
        setElapsedSeconds(0);
        startedAtRef.current = null;
        setWeights((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach(k => next[k] = Array(next[k].length).fill(''));
            return next;
        });

        localStorage.removeItem(`fitsync_active_${id}`);

        if (workout) {
            try {
                console.log('[Workout] Creating feed event...');
                await addFeedEvent({
                    id: uid(),
                    userId,
                    eventType: 'WO_COMPLETED',
                    referenceId: workout.id,
                    createdAt: new Date().toISOString(),
                    duration: finalSecs > 0 ? finalSecs : undefined
                });
                console.log('[Workout] Feed event created successfully.');
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
            const saved = localStorage.getItem(`fitsync_active_${id}`);
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
                    if (!next[key]) next[key] = Array(sets.length).fill('');
                });
                return next;
            });
        }
    }, [id, workout?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!workout || !loadedStorage || isFinished) return;
        localStorage.setItem(`fitsync_active_${id}`, JSON.stringify({
            timerRunning,
            startedAt: startedAtRef.current,
            weights
        }));
    }, [id, workout?.id, timerRunning, weights, loadedStorage, isFinished]);

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

    const hasAccess = workout.ownerId === userId || projectSharedWith.includes(userId);

    function getUserLogs(exId: string, uid: string): WorkoutLog[] {
        return store.logs
            .filter((l) => l.workoutId === id && l.exerciseId === exId && l.userId === uid)
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    function buildChartData(exId: string) {
        const myLogs = getUserLogs(exId, userId);
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
                        const exName = store.exercises.find((e) => e.id === exerciseId)?.name ?? 'Exercício';
                        const isOpen = expanded === slotKey;
                        const myLogs = getUserLogs(exerciseId, userId);
                        const lastLog = myLogs[myLogs.length - 1];
                        const lastFriendLog = comparisonFriendId ? getUserLogs(exerciseId, comparisonFriendId).slice(-1)[0] : undefined;
                        const chartData = buildChartData(exerciseId);
                        const repsSummary = sets.map((s) => s.reps).join(', ');

                        return (
                            <div key={slotKey} className="bg-white rounded-2xl card-depth overflow-hidden animate-fade transition-all">
                                <div className="p-4 md:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors" onClick={() => setExpanded(isOpen ? null : slotKey)}>
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Dumbbell size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="text-base font-extrabold text-slate-900 leading-tight">{exName}</h3>
                                            <p className="text-[11px] font-bold text-slate-500 mt-1">
                                                {sets.length} séries · {repsSummary} reps
                                                {lastLog && <span className="ml-2 text-primary">· Último: {Math.max(...lastLog.sets.map(s => s.weight))} kg</span>}
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
                                        {/* Friend comparison */}
                                        {lastFriendLog && (
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                                                <p className="text-xs font-extrabold text-indigo-500 uppercase tracking-widest mb-3">📊 Último treino de {friendName}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {lastFriendLog.sets.map((s, i) => (
                                                        <span key={i} className="text-xs font-bold bg-white text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                                                            S{i + 1}: <strong className="text-indigo-900">{s.weight} kg</strong> × {s.reps}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                            {/* Weight inputs */}
                                            {hasAccess && (
                                                <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
                                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Registrar Hoje</p>
                                                    <div className="flex flex-col gap-3 flex-1">
                                                        {sets.map((setDef, sIdx) => (
                                                            <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                                                <div className="flex items-center gap-4">
                                                                    <span className="w-16 text-sm font-bold text-slate-700">{setDef.label || `Série ${sIdx + 1}`}</span>
                                                                    <span className="w-20 text-sm font-bold text-slate-400">× {setDef.reps} reps</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <input
                                                                        className="w-24 h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-900 text-base"
                                                                        type="number" min={0} step={0.5} placeholder="kg"
                                                                        value={weights[slotKey]?.[sIdx] ?? ''}
                                                                        onChange={(e) => {
                                                                            const arr = [...(weights[slotKey] ?? Array(sets.length).fill(''))];
                                                                            arr[sIdx] = e.target.value;
                                                                            setWeights((prev) => ({ ...prev, [slotKey]: arr }));
                                                                        }}
                                                                    />
                                                                    {setDef.notes && <span className="text-xs font-bold text-indigo-400 opacity-80 max-w-[120px] leading-tight">💬 {setDef.notes}</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button
                                                        className="mt-8 w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-extrabold hover:bg-primary/90 transition-colors active:scale-95 shadow-md shadow-primary/20"
                                                        onClick={() => handleSaveLog(slotKey, exerciseId, sets)}
                                                        disabled={saving === slotKey}
                                                    >
                                                        <Save size={18} /> {saving === slotKey ? 'Salvando...' : 'Salvar Registro'}
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-5 h-full">
                                                {/* History */}
                                                {myLogs.length > 0 && (
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex-1">
                                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Histórico Recente</p>
                                                        <div className="flex flex-col gap-2">
                                                            {myLogs.slice().reverse().slice(0, 5).map((log) => (
                                                                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 transition-colors hover:border-slate-200">
                                                                    <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
                                                                        <span className="text-sm font-extrabold text-slate-700">{formatDate(log.date)}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <button className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-primary transition-colors hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-200" title="Carregar valores para hoje" onClick={() => {
                                                                                const arr = Array(sets.length).fill('');
                                                                                log.sets.forEach((s, idx) => { if (idx < arr.length) arr[idx] = String(s.weight); });
                                                                                setWeights(prev => ({ ...prev, [slotKey]: arr }));
                                                                                setToast({ msg: 'Valores carregados. Clique em Salvar para registrar hoje.', type: 'success' });
                                                                            }}>
                                                                                <Edit2 size={16} />
                                                                            </button>
                                                                            <button className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-red-500 transition-colors hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-200" title="Excluir este registro" onClick={async () => {
                                                                                if (confirm('Tem certeza que deseja excluir este registro de treino?')) {
                                                                                    setSaving(log.id);
                                                                                    await deleteLog(log.id);
                                                                                    setSaving(null);
                                                                                    setToast({ msg: 'Registro excluído.', type: 'success' });
                                                                                }
                                                                            }}>
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2 sm:justify-end">
                                                                        {log.sets.map((s, i) => (
                                                                            <div key={i} className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs font-bold">
                                                                                <span className="text-slate-400">S{i + 1}</span>
                                                                                <span className="text-slate-900">{s.weight}kg</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

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
            </div>

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

            {/* Sticky Floating Action Bar */}
            {hasAccess && (
                <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
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
                                            const exName = store.exercises.find(e => e.id === log.exerciseId)?.name || 'Exercício';
                                            const vol = log.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
                                            totalVolume += vol;
                                            totalSets += log.sets.length;

                                            // Formatar pesos de cada série separados por barra
                                            const weightsStr = log.sets.map(s => `${s.weight} kg`).join(' / ');

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
                                        <span className="font-extrabold text-sm">{totalVolume} kg levantados</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </Modal>
            )}

            {/* Summary Modal (After Confirmation) */}
            {showSummary && (
                <Modal title="🏁 Treino finalizado!" onClose={() => setShowSummary(false)}
                    footer={
                        <>
                            <button className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors" onClick={() => setShowSummary(false)}>Fechar</button>
                            <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors" onClick={() => { setShowSummary(false); router.push(project ? `/projects/${project.id}` : '/projects'); }}>
                                Voltar ao Treino
                            </button>
                        </>
                    }
                >
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>💪</div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Duração do treino</p>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#22c55e', fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>
                            {fmtTime(finalDuration)}
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 12 }}>
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </Modal>
            )}
        </div>
    );
}
