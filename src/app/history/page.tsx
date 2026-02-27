'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { Clock, Trash2, Eye, EyeOff, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import type { FeedEvent } from '@/lib/types';

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

export default function HistoryPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, deleteFeedEvent, updateFeedEvent, deleteLog } = useStore();

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FeedEvent | null>(null);
    const [saving, setSaving] = useState(false);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    if (!ready || !userId) return null;

    const currentUser = store.profiles.find(u => u.id === userId);

    const myHistory = store.feedEvents
        .filter(e => e.userId === userId && (e.eventType === 'WO_COMPLETED' || e.eventType === 'WO_COMPLETED_HIDDEN'))
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
        const newType = event.eventType === 'WO_COMPLETED' ? 'WO_COMPLETED_HIDDEN' : 'WO_COMPLETED';
        await updateFeedEvent({ ...event, eventType: newType });
        setSaving(false);
        setToast({ msg: newType === 'WO_COMPLETED' ? 'Sessão visível na comunidade.' : 'Sessão oculta da comunidade.', type: 'success' });
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);

        const eventDateObj = new Date(deleteTarget.createdAt);
        const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;

        const sameDayEvents = store.feedEvents.filter(e => {
            if (e.userId !== userId || e.referenceId !== deleteTarget.referenceId) return false;
            if (e.eventType !== 'WO_COMPLETED' && e.eventType !== 'WO_COMPLETED_HIDDEN') return false;
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
            setToast({ msg: 'Sessão e registros excluídos do histórico.', type: 'success' });
        } else {
            setToast({ msg: 'Sessão removida do histórico. As séries foram mantidas pois há outras sessões no mesmo dia.', type: 'success' });
        }
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
                <div className="mb-4">
                    <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-5 py-2.5 text-sm" onClick={() => router.push('/dashboard')}>
                        ← Voltar ao Dashboard
                    </button>
                </div>
                <div className="flex flex-col md:flex-row md:items-end w-full justify-between gap-6 mb-10">
                    <div>
                        <h1 className="page-title">Histórico</h1>
                        <p className="page-subtitle">Seus treinos já realizados</p>
                    </div>
                    <div className="size-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0">
                        <Clock size={24} />
                    </div>
                </div>

                {myHistory.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                        <Dumbbell size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold font-roboto">Nenhuma sessão finalizada ainda.</p>
                        <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4 mt-6" onClick={() => router.push('/projects')}>
                            Ir para Treinos
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 mb-10">
                        {myHistory.map(event => {
                            const workout = store.workouts.find(w => w.id === event.referenceId);
                            if (!workout) return null;

                            const project = store.projects.find(p => p.id === workout.projectId);
                            const isHidden = event.eventType === 'WO_COMPLETED_HIDDEN';
                            const isExpanded = expandedCards.has(event.id);

                            const eventDateObj = new Date(event.createdAt);
                            const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;

                            const dayLogs = store.logs.filter(l => l.userId === userId && l.workoutId === workout.id && l.date === localDateStr);

                            // Stats
                            const totalPlanned = workout.exercises.length;
                            const exercisesDone = dayLogs.length;
                            const completionPercent = totalPlanned > 0 ? Math.round((exercisesDone / totalPlanned) * 100) : 100;

                            const eventText = project
                                ? `Treino "${workout.name}" • ${project.name}`
                                : `Treino "${workout.name}"`;

                            return (
                                <div
                                    key={event.id}
                                    className="bg-white rounded-xl card-depth p-6 flex flex-col gap-5 animate-fade border border-transparent hover:border-slate-100 transition-colors"
                                >
                                    {/* ── Header: Avatar + Info + Actions ── */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            {/* Avatar */}
                                            <div className="size-12 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
                                                {currentUser?.photo_url ? (
                                                    <img src={currentUser.photo_url} alt={currentUser.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg font-bold text-slate-600">
                                                        {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-lg font-bold font-inter text-slate-900 flex items-center gap-2 flex-wrap">
                                                    Você
                                                    {isHidden && (
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                            Privado
                                                        </span>
                                                    )}
                                                    {!isHidden && (
                                                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                            Compartilhado
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-slate-400 text-sm font-normal font-roboto truncate">
                                                    {timeAgo(event.createdAt)} • {eventText}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            {project && (
                                                <button
                                                    className="text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest font-roboto px-2 py-1.5 rounded-lg hover:bg-slate-50 hidden sm:block"
                                                    onClick={() => router.push(`/projects/${project.id}`)}
                                                >
                                                    Mais detalhes
                                                </button>
                                            )}
                                            <button
                                                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                                                title={isHidden ? 'Mostrar na comunidade' : 'Ocultar da comunidade'}
                                                onClick={() => toggleVisibility(event)}
                                                disabled={saving}
                                            >
                                                {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                            <button
                                                className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors focus:outline-none"
                                                title="Excluir sessão"
                                                onClick={() => setDeleteTarget(event)}
                                                disabled={saving}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── Stats Grid: Duração / Exercícios / Conclusão ── */}
                                    <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-5 sm:p-6">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Duração</span>
                                            <span className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1">{formatDurationHMS(event.duration)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Exercícios</span>
                                            <span className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1">
                                                {exercisesDone} <span className="text-slate-400 text-xs sm:text-sm font-bold">/ {totalPlanned}</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Conclusão</span>
                                            <span className={`text-lg sm:text-2xl font-extrabold mt-1 ${completionPercent === 100 ? 'text-emerald-500' : completionPercent >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {completionPercent}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* ── Expandable Exercises ── */}
                                    <div className="flex flex-col">
                                        <button
                                            className="flex items-center justify-center gap-2 text-primary font-bold text-xs uppercase tracking-widest font-montserrat py-2 hover:underline transition-colors"
                                            onClick={() => toggleExpand(event.id)}
                                        >
                                            {isExpanded ? 'Ocultar exercícios' : `Ver exercícios (${exercisesDone})`}
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>

                                        {isExpanded && (
                                            <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {/* Exercícios feitos */}
                                                {dayLogs.map((log) => {
                                                    const exName = store.exercises.find(e => e.id === log.exerciseId)?.name || 'Exercício';
                                                    const groups: { count: number; weight: number }[] = [];
                                                    for (const s of log.sets) {
                                                        if (groups.length > 0 && groups[groups.length - 1].weight === s.weight) {
                                                            groups[groups.length - 1].count++;
                                                        } else {
                                                            groups.push({ count: 1, weight: s.weight });
                                                        }
                                                    }
                                                    const setsDisplay = groups.map(g => `${g.count}x ${g.weight}kg`).join(' / ');

                                                    return (
                                                        <div key={log.id} className="flex justify-between items-center text-sm py-1">
                                                            <span className="text-slate-600 font-bold font-inter">{exName}</span>
                                                            <span className="text-primary font-normal font-roboto pl-3 shrink-0">{setsDisplay}</span>
                                                        </div>
                                                    );
                                                })}

                                                {/* Exercícios não feitos */}
                                                {(() => {
                                                    const loggedIds = dayLogs.map(l => l.exerciseId);
                                                    const notDone = workout.exercises.filter(ex => !loggedIds.includes(ex.exerciseId));
                                                    if (notDone.length === 0) return null;

                                                    return notDone.map((planned, idx) => {
                                                        const exName = store.exercises.find(e => e.id === planned.exerciseId)?.name || 'Exercício';
                                                        return (
                                                            <div key={`nd-${idx}`} className="flex justify-between items-center text-sm py-1">
                                                                <span className="text-slate-300 line-through font-bold font-inter">{exName}</span>
                                                                <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                                    não feito
                                                                </span>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Mobile: Mais detalhes link ── */}
                                    {project && (
                                        <button
                                            className="text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest font-roboto text-center sm:hidden"
                                            onClick={() => router.push(`/projects/${project.id}`)}
                                        >
                                            Mais detalhes
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Sessão Passada" onClose={() => setDeleteTarget(null)}
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
