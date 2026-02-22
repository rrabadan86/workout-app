'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Dumbbell, Calendar, Share2, TrendingUp, Save, Users, X } from 'lucide-react';
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
    const { store, addLog, updateWorkout } = useStore();
    const [expanded, setExpanded] = useState<string | null>(null);
    // weights[exerciseId][setIndex] = string value
    const [weights, setWeights] = useState<Record<string, string[]>>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    const workout = store.workouts.find((x) => x.id === id) ?? null;

    // Initialize weight inputs when workout loads
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
            <div className="container" style={{ paddingTop: 40 }}><div className="empty-state"><p>Treino não encontrado.</p></div></div>
        </>
    );

    const isOwner = workout.ownerId === userId;
    const owner = store.users.find((u) => u.id === workout.ownerId);
    const sharedFriends = store.users.filter((u) => workout.sharedWith.includes(u.id));
    const otherUsers = store.users.filter((u) => u.id !== userId);

    // If I'm the owner, compare with first shared user; if I'm shared, compare with owner
    const comparisonFriendId = isOwner
        ? (workout.sharedWith[0] ?? undefined)
        : workout.ownerId;
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

    function handleSaveLog(exId: string, setsDef: { reps: number }[]) {
        const ws = weights[exId] ?? [];
        if (ws.some((w) => !w || parseFloat(w) <= 0)) {
            setToast({ msg: 'Informe o peso para todas as séries.', type: 'error' }); return;
        }
        addLog({
            id: uid(), workoutId: id, userId, exerciseId: exId, date: today(),
            sets: ws.map((w, i) => ({ weight: parseFloat(w), reps: setsDef[i]?.reps ?? 0 }))
        });
        setWeights((prev) => ({ ...prev, [exId]: Array(setsDef.length).fill('') }));
        setToast({ msg: 'Registro salvo!', type: 'success' });
    }

    function handleShare(friendId: string) {
        if (!workout) return;
        if (workout.sharedWith.includes(friendId)) return;
        updateWorkout({ ...workout, sharedWith: [...workout.sharedWith, friendId] });
        setToast({ msg: 'Treino compartilhado!', type: 'success' });
    }

    function removeShare(friendId: string) {
        if (!workout) return;
        updateWorkout({ ...workout, sharedWith: workout.sharedWith.filter((sid) => sid !== friendId) });
        setToast({ msg: 'Compartilhamento removido.', type: 'success' });
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header">
                    <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => router.back()} className="btn btn-ghost btn-sm">← Voltar</button>
                            {!isOwner && <span className="badge badge-green">De {owner?.name}</span>}
                            {isOwner && workout.sharedWith.length > 0 && <span className="badge badge-purple">Compartilhado</span>}
                        </div>
                        <h1 className="page-title">{workout.name}</h1>
                        <p className="page-subtitle"><Calendar size={13} style={{ display: 'inline' }} /> Até {formatDate(workout.endDate)} · {workout.exercises.length} exercício(s)</p>
                    </div>
                    {isOwner && (
                        <button className="btn btn-ghost" onClick={() => setShowShareModal(true)}>
                            <Share2 size={16} /> Compartilhar
                        </button>
                    )}
                </div>

                {isOwner && sharedFriends.length > 0 && (
                    <div className="card card-sm" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Users size={18} color="var(--accent)" />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Compartilhado com: <strong>{sharedFriends.map((f) => f.name).join(', ')}</strong>
                        </span>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
                    {workout.exercises.map(({ exerciseId, sets }) => {
                        const exName = store.exercises.find((e) => e.id === exerciseId)?.name ?? 'Exercício';
                        const isOpen = expanded === exerciseId;
                        const myLogs = getUserLogs(exerciseId, userId);
                        const lastLog = myLogs[myLogs.length - 1];
                        const lastFriendLog = comparisonFriendId ? getUserLogs(exerciseId, comparisonFriendId).slice(-1)[0] : undefined;
                        const chartData = buildChartData(exerciseId);
                        // Build a human-readable summary like "15, 15, 12, 10 reps"
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
                                        {/* Friend's last log */}
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
                                                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: 60 }}>{setDef.label || `Série ${sIdx + 1}`}</span>
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
                                                            style={{ maxWidth: 120 }}
                                                        />
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>× {setDef.reps} reps</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => handleSaveLog(exerciseId, sets)}>
                                                <Save size={14} /> Salvar Registro
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

            {/* Share Modal */}
            {showShareModal && (
                <Modal title="Compartilhar Treino" onClose={() => setShowShareModal(false)}
                    footer={<button className="btn btn-ghost" onClick={() => setShowShareModal(false)}>Fechar</button>}
                >
                    {otherUsers.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Nenhum outro usuário cadastrado.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gerencie com quem este treino é compartilhado:</p>
                            {otherUsers.map((u) => {
                                const isShared = workout.sharedWith.includes(u.id);
                                return (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="avatar">{u.name[0].toUpperCase()}</div>
                                            <span style={{ fontWeight: 500 }}>{u.name}</span>
                                        </div>
                                        {isShared
                                            ? <button className="btn btn-danger btn-sm" onClick={() => removeShare(u.id)}><X size={14} /> Parar de compartilhar</button>
                                            : <button className="btn btn-primary btn-sm" onClick={() => handleShare(u.id)}><Share2 size={14} /> Compartilhar</button>
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
