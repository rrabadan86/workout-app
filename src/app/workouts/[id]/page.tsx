'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Dumbbell, TrendingUp, Save } from 'lucide-react';
import Navbar from '@/components/Navbar';
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

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    const workout = store.workouts.find((x) => x.id === id) ?? null;
    const project = workout ? store.projects.find((p) => p.id === workout.projectId) ?? null : null;

    useEffect(() => {
        if (workout) {
            setWeights((prev) => {
                const next = { ...prev };
                workout.exercises.forEach(({ exerciseId, sets }) => {
                    if (!next[exerciseId]) next[exerciseId] = Array(sets.length).fill('');
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

    async function handleSaveLog(exId: string, setsDef: { reps: number }[]) {
        const ws = weights[exId] ?? [];
        if (ws.some((w) => !w || parseFloat(w) <= 0)) {
            setToast({ msg: 'Informe o peso para todas as séries.', type: 'error' }); return;
        }
        setSaving(exId);
        await addLog({
            id: uid(), workoutId: id, userId, exerciseId: exId, date: today(),
            sets: ws.map((w, i) => ({ weight: parseFloat(w), reps: setsDef[i]?.reps ?? 0 }))
        });
        setWeights((prev) => ({ ...prev, [exId]: Array(setsDef.length).fill('') }));
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
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
                    {workout.exercises.map(({ exerciseId, sets }) => {
                        const exName = store.exercises.find((e) => e.id === exerciseId)?.name ?? 'Exercício';
                        const isOpen = expanded === exerciseId;
                        const myLogs = getUserLogs(exerciseId, userId);
                        const lastLog = myLogs[myLogs.length - 1];
                        const lastFriendLog = comparisonFriendId ? getUserLogs(exerciseId, comparisonFriendId).slice(-1)[0] : undefined;
                        const chartData = buildChartData(exerciseId);
                        const repsSummary = sets.map((s) => s.reps).join(', ');

                        return (
                            <div key={exerciseId} className="exercise-panel animate-fade">
                                <div className="exercise-panel-header" onClick={() => setExpanded(isOpen ? null : exerciseId)}>
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
                                                            value={weights[exerciseId]?.[sIdx] ?? ''}
                                                            onChange={(e) => {
                                                                const arr = [...(weights[exerciseId] ?? Array(sets.length).fill(''))];
                                                                arr[sIdx] = e.target.value;
                                                                setWeights((prev) => ({ ...prev, [exerciseId]: arr }));
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
                                                onClick={() => handleSaveLog(exerciseId, sets)}
                                                disabled={saving === exerciseId}
                                            >
                                                <Save size={14} /> {saving === exerciseId ? 'Salvando...' : 'Salvar Registro'}
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
        </>
    );
}
