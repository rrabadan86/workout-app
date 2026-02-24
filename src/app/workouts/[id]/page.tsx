'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Dumbbell, TrendingUp, Save, Play, Square, Timer, Trash2, Edit2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { uid, formatDate, today } from '@/lib/utils';
import type { WorkoutLog } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function WorkoutDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, addLog, updateLog, deleteLog, addFeedEvent } = useStore();
    const [expanded, setExpanded] = useState<string | null>(null);
    const [weights, setWeights] = useState<Record<string, string[]>>({});
    const [loadedStorage, setLoadedStorage] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // ─── Timer ────────────────────────────────────────────────────────────
    const [timerRunning, setTimerRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
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
        setTimerRunning(false);
        setFinalDuration(elapsedSeconds);
        setShowSummary(true);
        localStorage.removeItem(`fitsync_active_${id}`);
        if (workout) {
            await addFeedEvent({
                id: uid(),
                userId,
                eventType: 'WO_COMPLETED',
                referenceId: workout.id,
                createdAt: new Date().toISOString(),
                duration: elapsedSeconds > 0 ? elapsedSeconds : undefined
            });
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
        if (!workout || !loadedStorage) return;
        localStorage.setItem(`fitsync_active_${id}`, JSON.stringify({
            timerRunning,
            startedAt: startedAtRef.current,
            weights
        }));
    }, [id, workout?.id, timerRunning, weights, loadedStorage]);

    if (!ready || !userId) return null;

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
        ? store.users.find((u) => u.id === comparisonFriendId)?.name ?? 'Amigo'
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
                            ← Voltar para {project?.name ?? 'Projetos'}
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="page-title" style={{ marginBottom: 4 }}>{workout.name}</h1>
                            <p className="page-subtitle" style={{ marginTop: 0 }}>{workout.exercises.length} EXERCÍCIO(S)</p>
                        </div>

                        {/* Timer Box */}
                        {hasAccess && (
                            <div className="flex items-center gap-3">
                                {timerRunning && (
                                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-5 py-3 rounded-2xl text-emerald-600 font-extrabold text-xl tabular-nums tracking-wider shadow-sm">
                                        <Timer size={24} />
                                        {fmtTime(elapsedSeconds)}
                                    </div>
                                )}
                                {!timerRunning ? (
                                    <div className="flex items-center gap-3">
                                        <button className="btn btn-primary" onClick={startWorkout} style={{ padding: '12px 24px', fontSize: '1rem' }}>
                                            <Play size={18} fill="currentColor" /> Iniciar Cronômetro
                                        </button>
                                        <button onClick={finishWorkout} className="btn btn-ghost" title="Finalizar e compartilhar sem cronômetro" style={{ border: '1px solid var(--glass-border)', padding: '12px 24px', fontSize: '1rem' }}>
                                            <Square size={16} fill="currentColor" /> Finalizar
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={finishWorkout} className="btn" style={{ background: 'var(--danger)', color: 'white', padding: '12px 24px', fontSize: '1rem' }}>
                                        <Square size={18} fill="currentColor" /> Finalizar
                                    </button>
                                )}
                            </div>
                        )}
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
                                <div className="p-6 md:p-8 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors" onClick={() => setExpanded(isOpen ? null : slotKey)}>
                                    <div className="flex items-center gap-5">
                                        <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Dumbbell size={24} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-xl font-extrabold text-slate-900 leading-tight">{exName}</h3>
                                            <p className="text-sm font-bold text-slate-500">
                                                {sets.length} séries · {repsSummary} reps
                                                {lastLog && <span className="ml-2 text-primary">· Último: {Math.max(...lastLog.sets.map(s => s.weight))} kg</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block">
                                        {isOpen ? <ChevronUp className="text-slate-400" size={24} /> : <ChevronDown className="text-slate-400" size={24} />}
                                    </div>
                                    <div className="sm:hidden flex justify-center w-full">
                                        {isOpen ? <ChevronUp className="text-slate-400" size={24} /> : <ChevronDown className="text-slate-400" size={24} />}
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-8">
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
                                                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
                                                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6">Registrar Hoje</p>
                                                    <div className="flex flex-col gap-4 flex-1">
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

                                            <div className="flex flex-col gap-8 h-full">
                                                {/* Chart */}
                                                {chartData.length > 0 && (
                                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-1">
                                                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                            <TrendingUp size={16} className="text-primary" /> Evolução (kg)
                                                        </p>
                                                        <div className="h-48 w-full">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={chartData}>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                                                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} dx={-10} />
                                                                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#f8fafc', fontWeight: 700, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} itemStyle={{ fontWeight: 700 }} />
                                                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 10 }} />
                                                                    <Line type="monotone" dataKey="Você" stroke="#00AAFF" strokeWidth={3} dot={{ fill: '#00AAFF', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                                                                    {comparisonFriendId && friendName && (
                                                                        <Line type="monotone" dataKey={friendName} stroke="#ff4757" strokeWidth={3} dot={{ fill: '#ff4757', r: 4, strokeWidth: 0 }} strokeDasharray="5 5" />
                                                                    )}
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* History */}
                                                {myLogs.length > 0 && (
                                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-1">
                                                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Histórico Recente</p>
                                                        <div className="flex flex-col gap-3">
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

            {/* Summary Modal */}
            {showSummary && (
                <Modal title="🏁 Treino Finalizado!" onClose={() => setShowSummary(false)}
                    footer={
                        <>
                            <button className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors" onClick={() => setShowSummary(false)}>Fechar</button>
                            <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors" onClick={() => { setShowSummary(false); router.push(project ? `/projects/${project.id}` : '/projects'); }}>
                                Voltar ao Projeto
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
