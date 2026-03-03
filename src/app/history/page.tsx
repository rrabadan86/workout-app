'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { Clock, Trash2, Eye, EyeOff, Dumbbell, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { FeedEvent } from '@/lib/types';

const CompareChart = dynamic(() => import('@/components/CompareChart'), {
    ssr: false,
    loading: () => <div className="h-[260px] w-full bg-slate-50 rounded-2xl animate-pulse" />,
});

function formatDurationHMS(seconds?: number) {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 30) return `${diffDays}d atrás`;
    return `${Math.floor(diffDays / 30)} mês(es) atrás`;
}

type Tab = 'historico' | 'comparar';

export default function HistoryPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, loading, deleteFeedEvent, updateFeedEvent, deleteLog } = useStore();

    const [activeTab, setActiveTab] = useState<Tab>('historico');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FeedEvent | null>(null);
    const [saving, setSaving] = useState(false);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const [mounted, setMounted] = useState(false);

    // ── Compare tab state ──────────────────────────────────────────
    const [friendId, setFriendId] = useState('');
    const [workoutId, setWorkoutId] = useState('');

    useEffect(() => {
        setMounted(true);
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    if (!mounted || !ready || !userId || loading) return null;

    const currentUser = store.profiles.find(u => u.id === userId);

    const myHistory = store.feedEvents
        .filter(e => e.userId === userId && (e.eventType.startsWith('WO_COMPLETED') || e.eventType.startsWith('WO_COMPLETED_HIDDEN')))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    function toggleExpand(eventId: string) {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(eventId)) next.delete(eventId);
            else next.add(eventId);
            return next;
        });
    }

    async function toggleVisibility(event: FeedEvent) {
        setSaving(true);
        const newType = event.eventType.startsWith('WO_COMPLETED_HIDDEN') ? 'WO_COMPLETED' : 'WO_COMPLETED_HIDDEN';
        await updateFeedEvent({ ...event, eventType: newType });
        setSaving(false);
        setToast({ msg: newType.startsWith('WO_COMPLETED_HIDDEN') ? 'Treino oculto da comunidade.' : 'Treino visível na comunidade.', type: 'success' });
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);

        const eventDateObj = new Date(deleteTarget.createdAt);
        const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;

        const sameDayEvents = store.feedEvents.filter(e => {
            if (e.userId !== userId || e.referenceId !== deleteTarget.referenceId) return false;
            if (!e.eventType.startsWith('WO_COMPLETED') && !e.eventType.startsWith('WO_COMPLETED_HIDDEN')) return false;
            const eDateObj = new Date(e.createdAt);
            const eDateStr = `${eDateObj.getFullYear()}-${String(eDateObj.getMonth() + 1).padStart(2, '0')}-${String(eDateObj.getDate()).padStart(2, '0')}`;
            return eDateStr === localDateStr;
        });

        if (sameDayEvents.length <= 1) {
            const logsToDelete = store.logs.filter(l =>
                l.userId === userId && l.workoutId === deleteTarget.referenceId && l.date === localDateStr
            );
            for (const log of logsToDelete) {
                await deleteLog(log.id);
            }
        }

        await deleteFeedEvent(deleteTarget.id);
        setSaving(false);
        setDeleteTarget(null);

        if (sameDayEvents.length <= 1) {
            setToast({ msg: 'Treino e registros excluídos do histórico.', type: 'success' });
        } else {
            setToast({ msg: 'Treino removido do histórico. As séries foram mantidas.', type: 'success' });
        }
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[900px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">

                {/* ─── Page Header ─── */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-extrabold font-inter tracking-tight text-slate-900">Evolução</h1>
                    <div className="size-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0">
                        <Clock size={20} />
                    </div>
                </div>

                {/* ─── Tabs ─── */}
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 gap-1">
                    <button
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold font-montserrat transition-all ${activeTab === 'historico' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('historico')}
                    >
                        Histórico
                    </button>
                    <button
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold font-montserrat transition-all ${activeTab === 'comparar' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('comparar')}
                    >
                        Comparar
                    </button>
                </div>

                {/* ─── Tab: Histórico ─── */}
                {activeTab === 'historico' && (
                    <>
                        {myHistory.length === 0 ? (
                            <div className="bg-white rounded-xl card-depth p-10 mt-4 text-center flex flex-col items-center justify-center border border-slate-100">
                                <Dumbbell size={48} className="text-slate-300 mb-4" />
                                <p className="text-slate-500 font-bold font-roboto">Nenhum treino finalizado.</p>
                                <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4 mt-6" onClick={() => router.push('/projects')}>
                                    Ir para Treinos
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 mb-10">
                                {myHistory.map(event => {
                                    const workout = store.workouts.find(w => w.id === event.referenceId);
                                    if (!workout) return null;

                                    const project = store.projects.find(p => p.id === workout.projectId);
                                    const isHidden = event.eventType.startsWith('WO_COMPLETED_HIDDEN');
                                    const isExpanded = expandedCards.has(event.id);

                                    const eventDateObj = new Date(event.createdAt);
                                    const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;

                                    // Parse payload log IDs from eventType (same logic as Feed.tsx)
                                    const rawType = event.eventType.replace('WO_COMPLETED_HIDDEN', 'WO_COMPLETED');
                                    const payloadParts = rawType.split('|');
                                    const lastSeg = payloadParts[payloadParts.length - 1];
                                    const hasLogIds = payloadParts.length >= 5 && !/^\d+$/.test(lastSeg);
                                    const payloadLogIds = hasLogIds ? lastSeg.split(',').filter(Boolean) : [];

                                    const allDateLogs = store.logs.filter(l => l.userId === userId && l.workoutId === workout.id && l.date === localDateStr);

                                    let dayLogs;
                                    if (payloadLogIds.length > 0) {
                                        dayLogs = store.logs.filter(l => payloadLogIds.includes(l.id));
                                    } else {
                                        dayLogs = allDateLogs;
                                    }

                                    // Build render items matching planned exercises to logs (same logic as Feed)
                                    const renderItems: { id: string; exId: string; plannedSets: number; log?: typeof store.logs[0]; isExtra?: boolean }[] = [];
                                    const availableLogs = [...dayLogs];

                                    workout.exercises.forEach((planned, idx) => {
                                        const logIdx = availableLogs.findIndex(l => l.exerciseId === planned.exerciseId);
                                        let log = undefined;
                                        if (logIdx !== -1) {
                                            log = availableLogs[logIdx];
                                            availableLogs.splice(logIdx, 1);
                                        } else if (payloadLogIds.length > 0) {
                                            // Secondary lookup: log may not be in payload due to race condition
                                            const fallbackLog = allDateLogs.find(l => l.exerciseId === planned.exerciseId && !dayLogs.some(dl => dl.id === l.id));
                                            if (fallbackLog) log = fallbackLog;
                                        }
                                        renderItems.push({ id: `planned-${idx}-${planned.exerciseId}`, exId: planned.exerciseId, plannedSets: planned.sets.length, log });
                                    });

                                    // Extra exercises not in the plan
                                    availableLogs.forEach((log, idx) => {
                                        renderItems.push({ id: `extra-${idx}-${log.id}`, exId: log.exerciseId, plannedSets: 0, log, isExtra: true });
                                    });

                                    const totalSets = renderItems.reduce((sum, item) => sum + item.plannedSets, 0);
                                    const completedSets = renderItems.reduce((sum, item) => sum + (item.log ? item.log.sets.length : 0), 0);
                                    const completionPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 100;
                                    const formattedPercentage = completionPercent.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';

                                    const completionColor =
                                        completionPercent === 100 ? 'text-emerald-500' :
                                            completionPercent >= 50 ? 'text-amber-500' : 'text-rose-500';

                                    return (
                                        <div
                                            key={event.id}
                                            className="bg-white rounded-2xl card-depth border border-transparent hover:border-slate-100 transition-colors"
                                        >
                                            {/* ── Card Header ── */}
                                            <div className="flex items-start justify-between gap-3 p-5">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-extrabold font-inter text-slate-900 text-base leading-snug line-clamp-1">
                                                            {project ? `${workout.name}` : workout.name}
                                                        </h4>
                                                        <span className="text-xs font-bold text-slate-400 shrink-0 mt-0.5">
                                                            {timeAgo(event.createdAt)}
                                                        </span>
                                                    </div>
                                                    {project && (
                                                        <p className="text-xs text-slate-400 font-roboto mt-0.5">{project.name}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {isHidden && (
                                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                                Oculto
                                                            </span>
                                                        )}
                                                        {project && project.sharedWith.length > 0 && (
                                                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                                Compartilhado
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Actions */}
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <button
                                                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                                                        title={isHidden ? 'Mostrar na comunidade' : 'Ocultar da comunidade'}
                                                        onClick={() => toggleVisibility(event)}
                                                        disabled={saving}
                                                    >
                                                        {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                                                    </button>
                                                    <button
                                                        className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                                                        title="Excluir treino"
                                                        onClick={() => setDeleteTarget(event)}
                                                        disabled={saving}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ── Stats Row ── */}
                                            <div className="flex items-center gap-0 border-t border-slate-50">
                                                <div className="flex-1 px-5 py-3.5 flex flex-col border-r border-slate-50">
                                                    <span className="text-[10px] font-bold font-montserrat text-slate-400 uppercase tracking-widest mb-0.5">DURAÇÃO</span>
                                                    <span className="text-xl font-extrabold font-inter text-slate-900">{formatDurationHMS(event.duration)}</span>
                                                </div>
                                                <div className="flex-1 px-5 py-3.5 flex flex-col border-r border-slate-50">
                                                    <span className="text-[10px] font-bold font-montserrat text-slate-400 uppercase tracking-widest mb-0.5">SÉRIES</span>
                                                    <span className="text-xl font-extrabold font-inter text-slate-900">{completedSets} / {totalSets}</span>
                                                </div>
                                                <div className="flex-1 px-5 py-3.5 flex flex-col">
                                                    <span className="text-[10px] font-bold font-montserrat text-slate-400 uppercase tracking-widest mb-0.5">CONCLUSÃO</span>
                                                    <span className={`text-xl font-extrabold font-inter ${completionColor}`}>{formattedPercentage}</span>
                                                </div>
                                            </div>

                                            {/* ── Expandable Exercises ── */}
                                            <div className="border-t border-slate-50">
                                                <button
                                                    className="flex items-center justify-center gap-1.5 text-primary font-bold text-[11px] uppercase tracking-widest font-montserrat py-2.5 w-full hover:bg-slate-50 rounded-b-2xl transition-colors"
                                                    onClick={() => toggleExpand(event.id)}
                                                >
                                                    {isExpanded ? 'Ocultar' : `Ver exercícios (${renderItems.length})`}
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>

                                                {isExpanded && (
                                                    <div className="px-5 pb-5 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        {renderItems.map((item) => {
                                                            const exName = store.exercises.find(e => e.id === item.exId)?.name || 'Exercício';
                                                            const log = item.log;
                                                            const plannedSets = item.plannedSets;
                                                            const completedSets = log ? log.sets.length : 0;
                                                            const skippedSets = Math.max(0, plannedSets - completedSets);

                                                            let setsDisplay = '';
                                                            if (log && log.sets.length > 0) {
                                                                const groups: { count: number; weight: number }[] = [];
                                                                for (const s of log.sets) {
                                                                    if (groups.length > 0 && groups[groups.length - 1].weight === s.weight) {
                                                                        groups[groups.length - 1].count++;
                                                                    } else {
                                                                        groups.push({ count: 1, weight: s.weight });
                                                                    }
                                                                }
                                                                setsDisplay = groups.map(g => `${g.count}x ${g.weight}kg`).join(' / ');
                                                            } else {
                                                                setsDisplay = '-';
                                                            }

                                                            return (
                                                                <div key={item.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className={`font-bold font-inter ${!log ? 'text-slate-300 line-through' : 'text-slate-600'}`}>{exName}</span>
                                                                        {log && skippedSets > 0 && (
                                                                            <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                                                                faltou {skippedSets}
                                                                            </span>
                                                                        )}
                                                                        {!log && (
                                                                            <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                                                não feito
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-primary font-normal font-roboto pl-3 shrink-0">{setsDisplay}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ─── Tab: Comparar ─── */}
                {activeTab === 'comparar' && (() => {
                    const currentUser = store.profiles.find(u => u.id === userId);
                    const friendUser = store.profiles.find(u => u.id === friendId);

                    // Users that share at least one project with me
                    const sharedUsers = store.profiles.filter(u => {
                        if (u.id === userId) return false;
                        return store.projects.some(p => {
                            const myAccess = p.ownerId === userId || p.sharedWith.includes(userId);
                            const theirAccess = p.ownerId === u.id || p.sharedWith.includes(u.id);
                            return myAccess && theirAccess;
                        });
                    });

                    const availableWorkouts = !friendId ? [] : store.workouts.filter(w => {
                        const proj = store.projects.find(p => p.id === w.projectId);
                        const myAccess = w.ownerId === userId || (proj?.sharedWith ?? []).includes(userId);
                        const frAccess = w.ownerId === friendId || (proj?.sharedWith ?? []).includes(friendId);
                        return myAccess && frAccess;
                    });

                    const workout = store.workouts.find(w => w.id === workoutId);
                    const exercises = workout
                        ? workout.exercises.map(({ exerciseId }) => ({
                            id: exerciseId,
                            name: store.exercises.find(e => e.id === exerciseId)?.name ?? 'Exercício',
                        }))
                        : [];

                    function buildChartData(exId: string) {
                        const myLogs = store.logs.filter(l => l.workoutId === workoutId && l.exerciseId === exId && l.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
                        const frLogs = store.logs.filter(l => l.workoutId === workoutId && l.exerciseId === exId && l.userId === friendId).sort((a, b) => a.date.localeCompare(b.date));
                        const dates = [...new Set([...myLogs.map(l => l.date), ...frLogs.map(l => l.date)])].sort();
                        return dates.map(date => {
                            const m = myLogs.find(l => l.date === date);
                            const f = frLogs.find(l => l.date === date);
                            const point: Record<string, unknown> = { date: formatDate(date) };
                            if (m) point[currentUser?.name ?? 'Você'] = Math.max(...m.sets.map(s => s.weight));
                            if (f && friendUser) point[friendUser.name] = Math.max(...f.sets.map(s => s.weight));
                            return point;
                        });
                    }

                    return (
                        <div className="flex flex-col gap-6 mb-10">
                            {/* Selectors */}
                            <div className="bg-white rounded-xl card-depth p-5 border border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest">Comparar com</label>
                                        <select
                                            className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white disabled:opacity-50"
                                            value={friendId}
                                            onChange={e => { setFriendId(e.target.value); setWorkoutId(''); }}
                                            disabled={sharedUsers.length === 0}
                                        >
                                            {sharedUsers.length === 0 ? (
                                                <option value="">Nenhum amigo. Compartilhe um treino!</option>
                                            ) : (
                                                <>
                                                    <option value="">Selecione um usuário</option>
                                                    {sharedUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest">Treino</label>
                                        <select
                                            className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white disabled:opacity-50"
                                            value={workoutId}
                                            onChange={e => setWorkoutId(e.target.value)}
                                            disabled={!friendId}
                                        >
                                            <option value="">Selecione um treino</option>
                                            {availableWorkouts.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* VS badge */}
                            {workoutId && friendId && (
                                <div className="flex gap-4 items-center flex-wrap bg-slate-50 px-6 py-3 rounded-full border border-slate-200 w-fit">
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

                            {/* Charts */}
                            {workoutId && exercises.length > 0 ? (
                                <div className="flex flex-col gap-6">
                                    {exercises.map(({ id: exId, name: exName }) => {
                                        const data = buildChartData(exId);
                                        const myLogs = store.logs.filter(l => l.workoutId === workoutId && l.exerciseId === exId && l.userId === userId);
                                        const frLogs = store.logs.filter(l => l.workoutId === workoutId && l.exerciseId === exId && l.userId === friendId);
                                        const myMax = myLogs.length ? Math.max(...myLogs.flatMap(l => l.sets.map(s => s.weight))) : 0;
                                        const frMax = frLogs.length ? Math.max(...frLogs.flatMap(l => l.sets.map(s => s.weight))) : 0;
                                        const leader = myMax > frMax ? currentUser?.name : myMax < frMax ? friendUser?.name : 'Empate';

                                        return (
                                            <div key={exId} className="bg-white rounded-xl card-depth p-6 border border-slate-100 flex flex-col gap-5">
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                                    <h3 className="text-lg font-bold font-inter text-slate-900">{exName}</h3>
                                                    {(myMax > 0 || frMax > 0) && (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-montserrat tracking-widest uppercase ${leader === 'Empate' ? 'bg-slate-100 text-slate-600' : leader === currentUser?.name ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'}`}>
                                                            🏆 {leader === 'Empate' ? 'Empate!' : `${leader} lidera`}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 flex flex-col gap-1 items-center">
                                                        <div className="text-xs font-roboto text-slate-500">{currentUser?.name}</div>
                                                        <div className="text-2xl font-black font-inter text-primary">{myMax > 0 ? `${myMax} kg` : '—'}</div>
                                                        <div className="text-[10px] uppercase tracking-widest font-montserrat text-slate-400">máx registrado</div>
                                                    </div>
                                                    <span className="text-sm font-bold font-montserrat tracking-wider text-slate-300 uppercase px-2">VS</span>
                                                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100 flex flex-col gap-1 items-center">
                                                        <div className="text-xs font-roboto text-slate-500">{friendUser?.name}</div>
                                                        <div className="text-2xl font-black font-inter text-rose-400">{frMax > 0 ? `${frMax} kg` : '—'}</div>
                                                        <div className="text-[10px] uppercase tracking-widest font-montserrat text-slate-400">máx registrado</div>
                                                    </div>
                                                </div>

                                                {data.length > 0 && (
                                                    <div className="pt-4 border-t border-slate-100">
                                                        <CompareChart
                                                            data={data}
                                                            myName={currentUser?.name ?? 'Você'}
                                                            friendName={friendUser?.name ?? 'Amigo'}
                                                        />
                                                    </div>
                                                )}
                                                {data.length === 0 && (
                                                    <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm border border-slate-100">
                                                        Nenhum registro ainda para este exercício.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                !workoutId && (
                                    <div className="bg-white rounded-xl card-depth p-10 text-center flex flex-col items-center justify-center border border-slate-100">
                                        <BarChart2 size={48} className="text-slate-300 mb-4" />
                                        <p className="text-slate-500 font-bold font-roboto">Selecione um usuário e um treino para ver a comparação.</p>
                                    </div>
                                )
                            )}
                        </div>
                    );
                })()}

            </main>

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir treino" onClose={() => setDeleteTarget(null)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</button>
                            <button className="btn bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/30 px-6 py-4" onClick={confirmDelete} disabled={saving}>
                                {saving ? 'Excluindo...' : 'Excluir Definitivamente'}
                            </button>
                        </div>
                    }
                >
                    <p className="text-slate-500 font-roboto text-sm">
                        Tem certeza que deseja excluir as atividades deste dia? Esse registro sumirá do seu histórico, dos gráficos e do feed da comunidade.
                    </p>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}