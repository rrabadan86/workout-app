'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Dumbbell, Calendar, ChevronRight, Share2, Search, X, Pencil, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { uid, formatDate, today } from '@/lib/utils';
import type { Workout, WorkoutExercise } from '@/lib/types';

export default function WorkoutsPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, addWorkout, updateWorkout, deleteWorkout } = useStore();
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Workout | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
    const [showShareModal, setShowShareModal] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [search, setSearch] = useState('');
    const [wName, setWName] = useState('');
    const [wEndDate, setWEndDate] = useState('');
    const [wExList, setWExList] = useState<WorkoutExercise[]>([]);
    const [selEx, setSelEx] = useState('');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);
    if (!ready || !userId) return null;

    const myWorkouts = store.workouts.filter(
        (w) => (w.ownerId === userId || w.sharedWith.includes(userId)) &&
            w.name.toLowerCase().includes(search.toLowerCase())
    );

    const otherUsers = store.users.filter((u) => u.id !== userId);
    const shareWorkout = store.workouts.find((w) => w.id === showShareModal);

    function addExToList() {
        if (!selEx || wExList.find((x) => x.exerciseId === selEx)) return;
        setWExList((prev) => [...prev, { exerciseId: selEx, sets: [{ reps: 10 }] }]);
        setSelEx('');
    }

    function addSet(exIdx: number) {
        setWExList((prev) => prev.map((e, i) => {
            if (i !== exIdx) return e;
            const lastReps = e.sets[e.sets.length - 1]?.reps ?? 10;
            return { ...e, sets: [...e.sets, { reps: lastReps }] };
        }));
    }

    function removeSet(exIdx: number, setIdx: number) {
        setWExList((prev) => prev.map((e, i) => {
            if (i !== exIdx) return e;
            const newSets = e.sets.filter((_, si) => si !== setIdx);
            return { ...e, sets: newSets.length > 0 ? newSets : [{ reps: 10 }] };
        }));
    }

    function updateSetReps(exIdx: number, setIdx: number, reps: number) {
        setWExList((prev) => prev.map((e, i) => {
            if (i !== exIdx) return e;
            return { ...e, sets: e.sets.map((s, si) => si === setIdx ? { ...s, reps } : s) };
        }));
    }

    function updateSetLabel(exIdx: number, setIdx: number, label: string) {
        setWExList((prev) => prev.map((e, i) => {
            if (i !== exIdx) return e;
            return { ...e, sets: e.sets.map((s, si) => si === setIdx ? { ...s, label } : s) };
        }));
    }

    function updateSetNotes(exIdx: number, setIdx: number, notes: string) {
        setWExList((prev) => prev.map((e, i) => {
            if (i !== exIdx) return e;
            return { ...e, sets: e.sets.map((s, si) => si === setIdx ? { ...s, notes } : s) };
        }));
    }

    function openCreate() {
        setEditTarget(null);
        setWName(''); setWEndDate(''); setWExList([]);
        setShowModal(true);
    }

    function openEdit(w: Workout) {
        setEditTarget(w);
        setWName(w.name); setWEndDate(w.endDate); setWExList([...w.exercises]);
        setShowModal(true);
    }

    function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (wExList.length === 0) { setToast({ msg: 'Adicione ao menos um exercício.', type: 'error' }); return; }
        if (editTarget) {
            updateWorkout({ ...editTarget, name: wName, endDate: wEndDate, exercises: wExList });
            setToast({ msg: 'Treino atualizado!', type: 'success' });
        } else {
            addWorkout({ id: uid(), name: wName, ownerId: userId, exercises: wExList, endDate: wEndDate, sharedWith: [] });
            setToast({ msg: 'Treino criado!', type: 'success' });
        }
        setWName(''); setWEndDate(''); setWExList([]);
        setShowModal(false);
    }

    function confirmDelete() {
        if (!deleteTarget) return;
        deleteWorkout(deleteTarget.id);
        setDeleteTarget(null);
        setToast({ msg: 'Treino excluído.', type: 'success' });
    }

    function handleShare(workoutId: string, friendId: string) {
        const w = store.workouts.find((x) => x.id === workoutId);
        if (!w || w.sharedWith.includes(friendId)) return;
        updateWorkout({ ...w, sharedWith: [...w.sharedWith, friendId] });
        setToast({ msg: 'Treino compartilhado!', type: 'success' });
    }

    function removeShare(workoutId: string, friendId: string) {
        const w = store.workouts.find((x) => x.id === workoutId);
        if (!w) return;
        updateWorkout({ ...w, sharedWith: w.sharedWith.filter((id) => id !== friendId) });
        setToast({ msg: 'Compartilhamento removido.', type: 'success' });
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Treinos</h1>
                        <p className="page-subtitle">{myWorkouts.length} treino(s)</p>
                    </div>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Novo Treino
                    </button>
                </div>

                <div style={{ position: 'relative', marginBottom: 24 }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" placeholder="Buscar treino..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
                    {search && <button style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSearch('')}><X size={16} /></button>}
                </div>

                {myWorkouts.length === 0 ? (
                    <div className="empty-state">
                        <Dumbbell size={48} color="var(--text-muted)" />
                        <p>Nenhum treino ainda.</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>Criar treino</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
                        {myWorkouts.map((w) => {
                            const isOwner = w.ownerId === userId;
                            const owner = store.users.find((u) => u.id === w.ownerId);
                            return (
                                <div key={w.id} className="item-card">
                                    <div className="stat-icon stat-icon-purple" style={{ width: 44, height: 44, flexShrink: 0 }}><Dumbbell size={20} /></div>
                                    <div className="item-card-info" onClick={() => router.push(`/workouts/${w.id}`)} style={{ cursor: 'pointer', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span className="item-card-title">{w.name}</span>
                                            {!isOwner && <span className="badge badge-green">De {owner?.name}</span>}
                                            {isOwner && w.sharedWith.length > 0 && <span className="badge badge-purple">Compartilhado</span>}
                                        </div>
                                        <div className="item-card-sub">
                                            <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
                                            Até {formatDate(w.endDate)} · {w.exercises.length} exercício(s)
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        {isOwner && (
                                            <>
                                                <button className="btn-icon" title="Compartilhar" onClick={() => setShowShareModal(w.id)}><Share2 size={16} /></button>
                                                <button className="btn-icon" title="Editar" onClick={() => openEdit(w)}><Pencil size={15} /></button>
                                                <button className="btn-icon" title="Excluir" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(w)}><Trash2 size={15} /></button>
                                            </>
                                        )}
                                        <button className="btn-icon" onClick={() => router.push(`/workouts/${w.id}`)}><ChevronRight size={18} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <Modal title={editTarget ? 'Editar Treino' : 'Novo Treino'} onClose={() => setShowModal(false)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" form="workout-form" type="submit">{editTarget ? 'Salvar' : 'Criar Treino'}</button>
                        </>
                    }
                >
                    <form id="workout-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="field">
                            <label>Nome do treino *</label>
                            <input className="input" placeholder="Ex: Treino A – Peito e Tríceps" value={wName} onChange={(e) => setWName(e.target.value)} required />
                        </div>
                        <div className="field">
                            <label>Data de término *</label>
                            <input className="input" type="date" min={today()} value={wEndDate} onChange={(e) => setWEndDate(e.target.value)} required />
                        </div>
                        <div className="divider" />
                        <div className="field">
                            <label>Adicionar exercício</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select className="input" value={selEx} onChange={(e) => setSelEx(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {store.exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle})</option>)}
                                </select>
                                <button type="button" className="btn btn-ghost" onClick={addExToList}><Plus size={16} /></button>
                            </div>
                            {store.exercises.length === 0 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                    Nenhum exercício cadastrado. <a href="/exercises" style={{ color: 'var(--accent)' }}>Criar exercícios</a>
                                </p>
                            )}
                        </div>

                        {wExList.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {wExList.map((item, exIdx) => {
                                    const ex = store.exercises.find((e) => e.id === item.exerciseId);
                                    return (
                                        <div key={item.exerciseId} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                                            {/* Exercise header */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ex?.name}</span>
                                                <button type="button" onClick={() => setWExList((prev) => prev.filter((_, i) => i !== exIdx))}
                                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Sets list */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {item.sets.map((s, setIdx) => (
                                                    <div key={setIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <input
                                                            className="input"
                                                            type="text"
                                                            placeholder={`S${setIdx + 1}`}
                                                            value={s.label ?? ''}
                                                            onChange={(e) => updateSetLabel(exIdx, setIdx, e.target.value)}
                                                            style={{ width: 64, fontSize: '0.78rem' }}
                                                        />
                                                        <input
                                                            className="input"
                                                            type="number"
                                                            min={1}
                                                            max={100}
                                                            value={s.reps}
                                                            onChange={(e) => updateSetReps(exIdx, setIdx, +e.target.value)}
                                                            style={{ width: 64 }}
                                                        />
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>reps</span>
                                                        <input
                                                            className="input"
                                                            type="text"
                                                            placeholder="Observações"
                                                            value={s.notes ?? ''}
                                                            onChange={(e) => updateSetNotes(exIdx, setIdx, e.target.value)}
                                                            style={{ flex: 1, fontSize: '0.78rem' }}
                                                        />
                                                        {item.sets.length > 1 && (
                                                            <button type="button" onClick={() => removeSet(exIdx, setIdx)}
                                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                                                                <X size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add set button */}
                                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addSet(exIdx)}
                                                style={{ marginTop: 10, fontSize: '0.78rem', padding: '4px 10px' }}>
                                                <Plus size={12} /> Série
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </form>
                </Modal>
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && (
                <Modal title="Excluir Treino" onClose={() => setDeleteTarget(null)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={confirmDelete}>Excluir</button>
                        </>
                    }
                >
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Tem certeza que deseja excluir o treino <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? Esta ação não pode ser desfeita.
                    </p>
                </Modal>
            )}

            {/* Share Modal */}
            {showShareModal && shareWorkout && (
                <Modal title={`Compartilhar "${shareWorkout.name}"`} onClose={() => setShowShareModal(null)}
                    footer={<button className="btn btn-ghost" onClick={() => setShowShareModal(null)}>Fechar</button>}
                >
                    {otherUsers.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Não há outros usuários cadastrados.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Gerencie com quem este treino é compartilhado:</p>
                            {otherUsers.map((u) => {
                                const isShared = shareWorkout.sharedWith.includes(u.id);
                                return (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="avatar">{u.name[0].toUpperCase()}</div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{u.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                            </div>
                                        </div>
                                        {isShared ? (
                                            <button className="btn btn-danger btn-sm" onClick={() => removeShare(shareWorkout.id, u.id)}>
                                                <X size={14} /> Parar de compartilhar
                                            </button>
                                        ) : (
                                            <button className="btn btn-primary btn-sm" onClick={() => handleShare(shareWorkout.id, u.id)}>
                                                <Share2 size={14} /> Compartilhar
                                            </button>
                                        )}
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
