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

        // Find all logs for this event
        const logsToDelete = store.logs.filter(l =>
            l.userId === userId &&
            l.workoutId === deleteTarget.referenceId &&
            l.date === localDateStr
        );

        // Delete logs one by one (could be optimized with a bulk delete in store if needed)
        for (const log of logsToDelete) {
            await deleteLog(log.id);
        }

        // Delete the feed event
        await deleteFeedEvent(deleteTarget.id);

        setSaving(false);
        setDeleteTarget(null);
        setToast({ msg: 'Treino e registros excluídos do histórico.', type: 'success' });
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header" style={{ paddingTop: 40, alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Histórico</h1>
                        <p className="page-subtitle">Seus treinos já realizados</p>
                    </div>
                    <div className="stat-icon stat-icon-blue" style={{ width: 48, height: 48, borderRadius: '50%' }}>
                        <Clock size={24} />
                    </div>
                </div>

                {myHistory.length === 0 ? (
                    <div className="empty-state">
                        <Dumbbell size={48} color="var(--text-muted)" />
                        <p>Nenhum treino finalizado ainda.</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push('/projects')}>
                            Ir para Projetos
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
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
                                <div key={event.id} className="card animate-fade" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <div className="stat-icon stat-icon-green" style={{ width: 40, height: 40 }}>
                                                <Dumbbell size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {workout.name}
                                                    {isHidden && <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--border)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 4 }}>Privado</span>}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                                    {formattedDate} · {totalWeight} kg levantados
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                className="btn-icon"
                                                title={isHidden ? "Mostrar na comunidade" : "Ocultar da comunidade"}
                                                onClick={() => toggleVisibility(event)}
                                                disabled={saving}
                                            >
                                                {isHidden ? <EyeOff size={18} color="var(--text-muted)" /> : <Eye size={18} color="var(--text-muted)" />}
                                            </button>
                                            <button
                                                className="btn-icon"
                                                title="Excluir treino"
                                                onClick={() => setDeleteTarget(event)}
                                                disabled={saving}
                                            >
                                                <Trash2 size={18} color="var(--danger)" />
                                            </button>
                                        </div>
                                    </div>

                                    {dayLogs.length > 0 && (
                                        <div style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {dayLogs.map((log) => {
                                                    const exName = store.exercises.find(e => e.id === log.exerciseId)?.name || 'Exercício';
                                                    return (
                                                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                            <span style={{ color: 'var(--text-secondary)' }}>{exName}</span>
                                                            <span style={{ color: 'var(--accent-light)', fontWeight: 500 }}>
                                                                {log.sets.length} séries
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Treino Passado" onClose={() => setDeleteTarget(null)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</button>
                            <button className="btn btn-danger" onClick={confirmDelete} disabled={saving}>
                                {saving ? 'Excluindo...' : 'Excluir Definitivamente'}
                            </button>
                        </>
                    }
                >
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Tem certeza que deseja excluir as atividades deste dia? Esse registro sumirá do seu hitórico, dos gráficos e do feed da comunidade.
                    </p>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
