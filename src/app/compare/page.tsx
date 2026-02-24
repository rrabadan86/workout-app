'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ComparePage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store } = useStore();
    const [friendId, setFriendId] = useState('');
    const [workoutId, setWorkoutId] = useState('');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);
    if (!ready || !userId) return null;

    const currentUser = store.users.find((u) => u.id === userId);
    const friendUser = store.users.find((u) => u.id === friendId);
    const otherUsers = store.users.filter((u) => u.id !== userId);

    const availableWorkouts = !friendId ? [] : store.workouts.filter((w) => {
        const proj = store.projects.find((p) => p.id === w.projectId);
        const myAccess = w.ownerId === userId || (proj?.sharedWith ?? []).includes(userId);
        const frAccess = w.ownerId === friendId || (proj?.sharedWith ?? []).includes(friendId);
        return myAccess && frAccess;
    });

    const workout = store.workouts.find((w) => w.id === workoutId);
    const exercises = workout
        ? workout.exercises.map(({ exerciseId }) => ({
            id: exerciseId,
            name: store.exercises.find((e) => e.id === exerciseId)?.name ?? 'Exercício',
        }))
        : [];

    function buildChartData(exId: string) {
        const myLogs = store.logs.filter((l) => l.workoutId === workoutId && l.exerciseId === exId && l.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
        const frLogs = store.logs.filter((l) => l.workoutId === workoutId && l.exerciseId === exId && l.userId === friendId).sort((a, b) => a.date.localeCompare(b.date));
        const dates = [...new Set([...myLogs.map((l) => l.date), ...frLogs.map((l) => l.date)])].sort();
        return dates.map((date) => {
            const m = myLogs.find((l) => l.date === date);
            const f = frLogs.find((l) => l.date === date);
            const point: Record<string, unknown> = { date: formatDate(date) };
            if (m) point[currentUser?.name ?? 'Você'] = Math.max(...m.sets.map((s) => s.weight));
            if (f && friendUser) point[friendUser.name] = Math.max(...f.sets.map((s) => s.weight));
            return point;
        });
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Comparar Evolução</h1>
                        <p className="page-subtitle">Veja seu progresso lado a lado com um amigo</p>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 32 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="field">
                            <label>Comparar com</label>
                            <select className="input" value={friendId} onChange={(e) => { setFriendId(e.target.value); setWorkoutId(''); }}>
                                <option value="">Selecione um usuário</option>
                                {otherUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label>Treino</label>
                            <select className="input" value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} disabled={!friendId}>
                                <option value="">Selecione um treino</option>
                                {availableWorkouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {workoutId && friendId && (
                    <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6c63ff' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{currentUser?.name} (você)</span>
                        </div>
                        <span className="vs-badge">VS</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff6584' }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{friendUser?.name}</span>
                        </div>
                    </div>
                )}

                {workoutId && exercises.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginBottom: 40 }}>
                        {exercises.map(({ id: exId, name: exName }) => {
                            const data = buildChartData(exId);
                            const myLogs = store.logs.filter((l) => l.workoutId === workoutId && l.exerciseId === exId && l.userId === userId);
                            const frLogs = store.logs.filter((l) => l.workoutId === workoutId && l.exerciseId === exId && l.userId === friendId);
                            const myMax = myLogs.length ? Math.max(...myLogs.flatMap((l) => l.sets.map((s) => s.weight))) : 0;
                            const frMax = frLogs.length ? Math.max(...frLogs.flatMap((l) => l.sets.map((s) => s.weight))) : 0;
                            const leader = myMax > frMax ? currentUser?.name : myMax < frMax ? friendUser?.name : 'Empate';

                            return (
                                <div key={exId} className="compare-section">
                                    <div className="compare-header">
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{exName}</h3>
                                        {(myMax > 0 || frMax > 0) && (
                                            <span className="badge badge-purple">🏆 {leader === 'Empate' ? 'Empate!' : `${leader} lidera`}</span>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                                        <div className="card card-sm" style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{currentUser?.name}</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6c63ff' }}>{myMax > 0 ? `${myMax} kg` : '—'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>máx registrado</div>
                                        </div>
                                        <span className="vs-badge" style={{ fontSize: '1rem', padding: '8px 14px' }}>VS</span>
                                        <div className="card card-sm" style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{friendUser?.name}</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ff6584' }}>{frMax > 0 ? `${frMax} kg` : '—'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>máx registrado</div>
                                        </div>
                                    </div>

                                    {data.length > 0 && (
                                        <div className="chart-wrapper">
                                            <ResponsiveContainer width="100%" height={220}>
                                                <LineChart data={data}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                    <XAxis dataKey="date" tick={{ fill: '#9999bb', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fill: '#9999bb', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f0f8' }} />
                                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                                    <Line type="monotone" dataKey={currentUser?.name ?? 'Você'} stroke="#6c63ff" strokeWidth={2.5} dot={{ fill: '#6c63ff', r: 4 }} activeDot={{ r: 7 }} />
                                                    <Line type="monotone" dataKey={friendUser?.name ?? 'Amigo'} stroke="#ff6584" strokeWidth={2.5} dot={{ fill: '#ff6584', r: 4 }} strokeDasharray="5 5" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {data.length === 0 && (
                                        <div className="card" style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                            Nenhum registro ainda para este exercício.
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    !workoutId && (
                        <div className="empty-state">
                            <BarChart2 size={48} color="var(--text-muted)" />
                            <p>Selecione um usuário e um treino para ver a comparação.</p>
                        </div>
                    )
                )}
            </div>
        </>
    );
}
