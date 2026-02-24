'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { Clock, Trash2, Eye, EyeOff, Dumbbell, Play } from 'lucide-react';
import type { FeedEvent } from '@/lib/types';

export default function HistoryPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, deleteFeedEvent, updateFeedEvent, deleteLog } = useStore();

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FeedEvent | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    if (!ready || !userId) return null;

    // Get all completed and hidden workouts for this user
    const myHistory = store.feedEvents
        .filter(e => e.userId === userId && (e.eventType === 'WO_COMPLETED' || e.eventType === 'WO_COMPLETED_HIDDEN'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    async function toggleVisibility(event: FeedEvent) {
        setSaving(true);
        const newType = event.eventType === 'WO_COMPLETED' ? 'WO_COMPLETED_HIDDEN' : 'WO_COMPLETED';
        await updateFeedEvent({ ...event, eventType: newType });
        setSaving(false);
        setToast({ msg: newType === 'WO_COMPLETED' ? 'Treino visível na comunidade.' : 'Treino oculto da comunidade.', type: 'success' });
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);

        // Find the date of the event in YYYY-MM-DD
        const eventDateObj = new Date(deleteTarget.createdAt);
        const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;

        // Check if there are multiple feedEvents for this exact workout on this exact day
        const sameDayEvents = store.feedEvents.filter(e => {
            if (e.userId !== userId || e.referenceId !== deleteTarget.referenceId) return false;
            if (e.eventType !== 'WO_COMPLETED' && e.eventType !== 'WO_COMPLETED_HIDDEN') return false;

            const eDateObj = new Date(e.createdAt);
            const eDateStr = `${eDateObj.getFullYear()}-${String(eDateObj.getMonth() + 1).padStart(2, '0')}-${String(eDateObj.getDate()).padStart(2, '0')}`;
            return eDateStr === localDateStr;
        });

        // Only delete the underlying logs if this is the ONLY time they completed this workout today
        if (sameDayEvents.length <= 1) {
            // Find all logs for this event
            const logsToDelete = store.logs.filter(l =>
                l.userId === userId &&
                l.workoutId === deleteTarget.referenceId &&
                l.date === localDateStr
            );

            for (const log of logsToDelete) {
                await deleteLog(log.id);
            }
        }

        // Always delete the feed event
        await deleteFeedEvent(deleteTarget.id);

        setSaving(false);
        setDeleteTarget(null);

        if (sameDayEvents.length <= 1) {
            setToast({ msg: 'Treino e registros excluídos do histórico.', type: 'success' });
        } else {
            setToast({ msg: 'Treino removido do histórico. As séries foram mantidas pois há outras sessões no mesmo dia.', type: 'success' });
        }
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
                        <p className="text-slate-500 font-bold font-roboto">Nenhum treino finalizado ainda.</p>
                        <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4 mt-6" onClick={() => router.push('/projects')}>
                            Ir para Projetos
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 mb-10">
                        {myHistory.map(event => {
                            const workout = store.workouts.find(w => w.id === event.referenceId);
                            if (!workout) return null;

                            const isHidden = event.eventType === 'WO_COMPLETED_HIDDEN';
                            const eventDateObj = new Date(event.createdAt);
                            const formattedDate = eventDateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
                            const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;

                            const dayLogs = store.logs.filter(l => l.userId === userId && l.workoutId === workout.id && l.date === localDateStr);
                            const totalWeight = dayLogs.reduce((acc, log) => {
                                return acc + log.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
                            }, 0);

                            return (
                                <div key={event.id} className="bg-white rounded-xl card-depth p-5 md:p-6 border border-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex gap-4 items-center">
                                            <div className="size-10 md:size-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 shrink-0">
                                                <Dumbbell size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold font-inter text-base md:text-lg text-slate-900 flex items-center gap-2 flex-wrap">
                                                    {workout.name}
                                                    {isHidden && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">Privado</span>}
                                                </div>
                                                <div className="text-xs md:text-sm font-roboto text-slate-500 capitalize mt-0.5">
                                                    {formattedDate} · <span className="font-medium text-slate-700">{totalWeight} kg</span> levantados {event.duration ? ` · ⏱️ ${Math.floor(event.duration / 60)}m ${event.duration % 60}s` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 md:gap-2 shrink-0">
                                            <button
                                                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                                                title={isHidden ? "Mostrar na comunidade" : "Ocultar da comunidade"}
                                                onClick={() => toggleVisibility(event)}
                                                disabled={saving}
                                            >
                                                {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                            <button
                                                className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors focus:outline-none"
                                                title="Excluir treino"
                                                onClick={() => setDeleteTarget(event)}
                                                disabled={saving}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {dayLogs.length > 0 && (
                                        <div className="mt-2 pt-4 border-t border-slate-100 flex flex-col gap-2">
                                            {dayLogs.map((log) => {
                                                const exName = store.exercises.find(e => e.id === log.exerciseId)?.name || 'Exercício';
                                                const plannedExercise = workout.exercises.find(ex => ex.exerciseId === log.exerciseId);
                                                const plannedSets = plannedExercise ? plannedExercise.sets.length : log.sets.length;
                                                const skippedSets = Math.max(0, plannedSets - log.sets.length);

                                                const groups: { count: number, weight: number }[] = [];
                                                for (const s of log.sets) {
                                                    if (groups.length > 0 && groups[groups.length - 1].weight === s.weight) {
                                                        groups[groups.length - 1].count++;
                                                    } else {
                                                        groups.push({ count: 1, weight: s.weight });
                                                    }
                                                }
                                                const setsDisplay = groups.map(g => `${g.count}x ${g.weight}kg`).join(' / ');

                                                return (
                                                    <div key={log.id} className="flex justify-between items-center text-[13px] md:text-sm font-roboto py-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-slate-600 truncate">{exName}</span>
                                                            {skippedSets > 0 && (
                                                                <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                                    faltou {skippedSets} {skippedSets === 1 ? 'série' : 'séries'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-primary font-bold pl-3 text-right shrink-0">
                                                            {setsDisplay}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Treino Passado" onClose={() => setDeleteTarget(null)}
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
                        Tem certeza que deseja excluir as atividades deste dia? Esse registro sumirá do seu hitórico, dos gráficos e do feed da comunidade.
                    </p>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
