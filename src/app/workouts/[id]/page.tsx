'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Dumbbell, TrendingUp, Save, Play, Square, Timer } from 'lucide-react';
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
    const { store, addLog } = useStore();
    const [expanded, setExpanded] = useState<string | null>(null);
    const [weights, setWeights] = useState<Record<string, string[]>>({});
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

    function finishWorkout() {
        setTimerRunning(false);
        setFinalDuration(elapsedSeconds);
        setShowSummary(true);
    }

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    const workout = store.workouts.find((x) => x.id === id) ?? null;
    const project = workout ? store.projects.find((p) => p.id === workout.projectId) ?? null : null;

    useEffect(() => {
        if (workout) {
            setWeights((prev) => {
                const next = { ...prev };
                workout.exercises.forEach(({ exerciseId, sets }, idx) => {
                    const key = `${exerciseId}-${idx}`;
                    if (!next[key]) next[key] = Array(sets.length).fill('');
                });
                return next;
            });
        }
    }, [workout?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (ws.some((w) => !w || parseFloat(w) <= 0)) {
            setToast({ msg: 'Informe o peso para todas as séries.', type: 'error' }); return;
        }
        setSaving(slotKey);
        await addLog({
            id: uid(), workoutId: id, userId, exerciseId: exId, date: today(),
            sets: ws.map((w, i) => ({ weight: parseFloat(w), reps: setsDef[i]?.reps ?? 0 }))
        });
        setWeights((prev) => ({ ...prev, [slotKey]: Array(setsDef.length).fill('') }));
        setSaving(null);
        setToast({ msg: 'Registro salvo!', type: 'success' });
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header">
                    <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => router.push(project ? `/projects/${project.id}` : '/projects')} className="btn btn-ghost btn-sm">
                                ← {project?.name ?? 'Projetos'}
                            </button>
                        </div>
                        <h1 className="page-title">{workout.name}</h1>
                        <p className="page-subtitle">{workout.exercises.length} exercício(s)</p>
                    </div>
                    {/* Timer display */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                        {timerRunning && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius)', padding: '6px 14px' }}>
                                <Timer size={16} color="#22c55e" />
                                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '1.1rem', color: '#22c55e', letterSpacing: 1 }}>
                                    {fmtTime(elapsedSeconds)}
                                </span>
                            </div>
                        )}
                        {!timerRunning ? (
                            <button className="btn btn-primary" onClick={startWorkout} style={{ gap: 6 }}>
                                <Play size={15} /> Iniciar Treino
                            </button>
                        ) : (
                            <button onClick={finishWorkout}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                                <Square size={14} fill="currentColor" /> Finalizar
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
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
                            <div key={slotKey} className="exercise-panel animate-fade">
                                <div className="exercise-panel-header" onClick={() => setExpanded(isOpen ? null : slotKey)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div className="stat-icon stat-icon-purple" style={{ width: 38, height: 38 }}><Dumbbell size={16} /></div>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{exName}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {sets.length} séries · {repsSummary} reps
                                                {lastLog && <span style={{ marginLeft: 8, color: 'var(--accent3)' }}>· Último: {Math.max(...lastLog.sets.map(s => s.weight))} kg</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {isOpen ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                                </div>

                                {isOpen && (
                                    <div className="exercise-panel-body">
                                        {/* Friend comparison */}
                                        {lastFriendLog && (
                                            <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                                                <p style={{ fontSize: '0.78rem', color: 'var(--accent-light)', fontWeight: 700, marginBottom: 6 }}>📊 Último treino de {friendName}</p>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    {lastFriendLog.sets.map((s, i) => (
                                                        <span key={i} style={{ fontSize: '0.825rem', background: 'rgba(108,99,255,0.15)', padding: '4px 10px', borderRadius: 6 }}>
                                                            S{i + 1}: <strong>{s.weight} kg</strong> × {s.reps}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Weight inputs */}
                                        <div>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registrar hoje</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                {sets.map((setDef, sIdx) => (
                                                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 60 }}>{setDef.label || `Série ${sIdx + 1}`}</span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>× {setDef.reps} reps</span>
                                                        <input
                                                            className="input"
                                                            type="number"
                                                            min={0}
                                                            step={0.5}
                                                            placeholder="kg"
                                                            value={weights[slotKey]?.[sIdx] ?? ''}
                                                            onChange={(e) => {
                                                                const arr = [...(weights[slotKey] ?? Array(sets.length).fill(''))];
                                                                arr[sIdx] = e.target.value;
                                                                setWeights((prev) => ({ ...prev, [slotKey]: arr }));
                                                            }}
                                                            style={{ maxWidth: 100 }}
                                                        />
                                                        {setDef.notes && (
                                                            <span style={{ fontSize: '0.78rem', color: 'var(--accent-light)', fontStyle: 'italic', opacity: 0.85 }}>
                                                                💬 {setDef.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                style={{ marginTop: 12 }}
                                                onClick={() => handleSaveLog(slotKey, exerciseId, sets)}
                                                disabled={saving === slotKey}
                                            >
                                                <Save size={14} /> {saving === slotKey ? 'Salvando...' : 'Salvar Registro'}
                                            </button>
                                        </div>

                                        {/* Chart */}
                                        {chartData.length > 0 && (
                                            <div>
                                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />Evolução (kg)
                                                </p>
                                                <div className="chart-wrapper">
                                                    <ResponsiveContainer width="100%" height={200}>
                                                        <LineChart data={chartData}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                            <XAxis dataKey="date" tick={{ fill: '#9999bb', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                            <YAxis tick={{ fill: '#9999bb', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f0f8' }} />
                                                            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                                            <Line type="monotone" dataKey="Você" stroke="#6c63ff" strokeWidth={2} dot={{ fill: '#6c63ff', r: 4 }} activeDot={{ r: 6 }} />
                                                            {comparisonFriendId && friendName && (
                                                                <Line type="monotone" dataKey={friendName} stroke="#ff6584" strokeWidth={2} dot={{ fill: '#ff6584', r: 4 }} strokeDasharray="5 5" />
                                                            )}
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        )}

                                        {/* History */}
                                        {myLogs.length > 0 && (
                                            <div>
                                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Histórico</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {myLogs.slice().reverse().slice(0, 5).map((log) => (
                                                        <div key={log.id} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(log.date)}</span>
                                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                                {log.sets.map((s, i) => (
                                                                    <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(108,99,255,0.15)', padding: '3px 8px', borderRadius: 4 }}>{s.weight}kg</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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
                            <button className="btn btn-ghost" onClick={() => setShowSummary(false)}>Fechar</button>
                            <button className="btn btn-primary" onClick={() => { setShowSummary(false); router.push(project ? `/projects/${project.id}` : '/projects'); }}>
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
        </>
    );
}
