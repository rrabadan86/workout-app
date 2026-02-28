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
    const { store, loading } = useStore();
    const [friendId, setFriendId] = useState('');
    const [workoutId, setWorkoutId] = useState('');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);
    if (!ready || !userId || loading) return null;

    const currentUser = store.profiles.find((u) => u.id === userId);
    const friendUser = store.profiles.find((u) => u.id === friendId);
    const sharedUsers = store.profiles.filter((u) => {
        if (u.id === userId) return false;
        return store.projects.some((p) => {
            const myAccess = p.ownerId === userId || p.sharedWith.includes(userId);
            const theirAccess = p.ownerId === u.id || p.sharedWith.includes(u.id);
            return myAccess && theirAccess;
        });
    });

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
            <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 lg:px-12 py-8">
                <div className="mb-4">
                    <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-5 py-2.5 text-sm" onClick={() => router.push('/dashboard')}>
                        ← Voltar ao Dashboard
                    </button>
                </div>
                <div className="flex flex-col md:flex-row md:items-end w-full justify-between gap-6 mb-10">
                    <div>
                        <h1 className="page-title">Comparar Evolução</h1>
                        <p className="page-subtitle">Veja seu progresso lado a lado com um amigo</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl card-depth p-6 border border-slate-100 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest">Comparar com</label>
                            <select className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white disabled:opacity-50" value={friendId} onChange={(e) => { setFriendId(e.target.value); setWorkoutId(''); }} disabled={sharedUsers.length === 0}>
                                {sharedUsers.length === 0 ? (
                                    <option value="">Nenhum amigo. Compartilhe um treino!</option>
                                ) : (
                                    <>
                                        <option value="">Selecione um usuário</option>
                                        {sharedUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </>
                                )}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest">Treino</label>
                            <select className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white disabled:opacity-50" value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} disabled={!friendId}>
                                <option value="">Selecione um treino</option>
                                {availableWorkouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {workoutId && friendId && (
                    <div className="flex gap-4 md:gap-6 items-center flex-wrap mb-6 bg-slate-50 px-6 py-3 rounded-full border border-slate-200 w-fit mx-auto md:mx-0">
                        <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full bg-primary" />
                            <span className="text-sm font-bold font-inter text-slate-900">{currentUser?.name} <span className="text-slate-500 font-normal">(você)</span></span>
                        </div>
                        <span className="text-xs font-bold font-montserrat tracking-widest text-slate-400 uppercase">VS</span>
                        <div className="flex items-center gap-2">
                            <div className="size-2.5 rounded-full bg-rose-400" />
                            <span className="text-sm font-bold font-inter text-slate-900">{friendUser?.name}</span>
                        </div>
                    </div>
                )}

                {workoutId && exercises.length > 0 ? (
                    <div className="flex flex-col gap-8 mb-10">
                        {exercises.map(({ id: exId, name: exName }) => {
                            const data = buildChartData(exId);
                            const myLogs = store.logs.filter((l) => l.workoutId === workoutId && l.exerciseId === exId && l.userId === userId);
                            const frLogs = store.logs.filter((l) => l.workoutId === workoutId && l.exerciseId === exId && l.userId === friendId);
                            const myMax = myLogs.length ? Math.max(...myLogs.flatMap((l) => l.sets.map((s) => s.weight))) : 0;
                            const frMax = frLogs.length ? Math.max(...frLogs.flatMap((l) => l.sets.map((s) => s.weight))) : 0;
                            const leader = myMax > frMax ? currentUser?.name : myMax < frMax ? friendUser?.name : 'Empate';

                            return (
                                <div key={exId} className="bg-white rounded-xl card-depth p-6 md:p-8 border border-slate-100 flex flex-col gap-6">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                        <h3 className="text-lg md:text-xl font-bold font-inter text-slate-900">{exName}</h3>
                                        {(myMax > 0 || frMax > 0) && (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-montserrat tracking-widest uppercase ${leader === 'Empate' ? 'bg-slate-100 text-slate-600' : leader === currentUser?.name ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'}`}>
                                                🏆 {leader === 'Empate' ? 'Empate!' : `${leader} lidera`}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 flex flex-col gap-1 items-center justify-center h-full">
                                            <div className="text-xs font-roboto text-slate-500">{currentUser?.name}</div>
                                            <div className="text-2xl font-black font-inter text-primary">{myMax > 0 ? `${myMax} kg` : '—'}</div>
                                            <div className="text-[10px] uppercase tracking-widest font-montserrat text-slate-400">máx registrado</div>
                                        </div>
                                        <span className="text-sm font-bold font-montserrat tracking-wider text-slate-300 uppercase px-2">VS</span>
                                        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 flex flex-col gap-1 items-center justify-center h-full">
                                            <div className="text-xs font-roboto text-slate-500">{friendUser?.name}</div>
                                            <div className="text-2xl font-black font-inter text-rose-400">{frMax > 0 ? `${frMax} kg` : '—'}</div>
                                            <div className="text-[10px] uppercase tracking-widest font-montserrat text-slate-400">máx registrado</div>
                                        </div>
                                    </div>

                                    {data.length > 0 && (
                                        <div className="mt-4 pt-6 border-t border-slate-100">
                                            <ResponsiveContainer width="100%" height={260}>
                                                <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Roboto' }} axisLine={false} tickLine={false} tickMargin={12} />
                                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Roboto' }} axisLine={false} tickLine={false} tickMargin={12} />
                                                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: 12, color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontFamily: 'Inter', fontWeight: 600 }} labelStyle={{ fontFamily: 'Roboto', color: '#64748b', marginBottom: 4 }} />
                                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontFamily: 'Roboto', paddingTop: 20 }} />
                                                    <Line type="monotone" dataKey={currentUser?.name ?? 'Você'} stroke="#00AAFF" strokeWidth={3} dot={{ fill: '#00AAFF', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} animationDuration={1000} />
                                                    <Line type="monotone" dataKey={friendUser?.name ?? 'Amigo'} stroke="#fb7185" strokeWidth={3} dot={{ fill: '#fb7185', r: 4, strokeWidth: 0 }} strokeDasharray="6 4" animationDuration={1000} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {data.length === 0 && (
                                        <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 font-roboto text-sm border border-slate-100">
                                            Nenhum registro ainda para este exercício.
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    !workoutId && (
                        <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                            <BarChart2 size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-500 font-bold font-roboto">Selecione um usuário e um treino para ver a comparação.</p>
                        </div>
                    )
                )}
            </main>
        </>
    );
}
