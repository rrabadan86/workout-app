'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Dumbbell, Pencil, Trash2, ChevronRight, FolderOpen, X, ArrowUp, ArrowDown } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import type { WorkoutExercise, Workout } from '@/lib/types';

export default function ProjectDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { userId, ready } = useAuth();
    const { store, addWorkout, updateWorkout, deleteWorkout } = useStore();

    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Workout | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);

    const [wName, setWName] = useState('');
    const [wExList, setWExList] = useState<WorkoutExercise[]>([]);
    const [selEx, setSelEx] = useState('');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    const project = store.projects.find((p) => p.id === id);
    const workouts = store.workouts
        .filter((w) => w.projectId === id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Local ordering state (array of workout ids in display order)
    const [orderedIds, setOrderedIds] = useState<string[]>([]);
    // Sync orderedIds when workouts change
    useEffect(() => {
        setOrderedIds(workouts.map((w) => w.id));
    }, [workouts.map((w) => w.id).join(',')]);
    const orderedWorkouts = orderedIds
        .map((wid) => workouts.find((w) => w.id === wid))
        .filter(Boolean) as typeof workouts;

    async function moveWorkout(idx: number, dir: -1 | 1) {
        const newIds = [...orderedIds];
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= newIds.length) return;
        [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
        setOrderedIds(newIds);
        // Persist order to DB
        await Promise.all(newIds.map((wid, i) => {
            const w = workouts.find((x) => x.id === wid);
            if (!w) return Promise.resolve();
            return updateWorkout({ ...w, order: i });
        }));
    }

    if (!ready || !userId) return null;
    if (!project) return (
        <>
            <Navbar />
            <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
                <FolderOpen size={48} color="var(--text-muted)" />
                <p style={{ color: 'var(--text-secondary)', marginTop: 16 }}>Projeto não encontrado.</p>
                <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => router.push('/projects')}>← Voltar</button>
            </div>
        </>
    );

    const isOwner = project.ownerId === userId;

    // ─── Set management ───────────────────────────────────────────────────────
    function addExToList() {
        if (!selEx) return;
        setWExList((prev) => [...prev, { exerciseId: selEx, sets: [{ reps: 10, label: '', notes: '' }] }]);
        setSelEx('');
    }

    function removeEx(exIdx: number) { setWExList((prev) => prev.filter((_, i) => i !== exIdx)); }

    function moveEx(exIdx: number, dir: -1 | 1) {
        const newList = [...wExList];
        const swapIdx = exIdx + dir;
        if (swapIdx < 0 || swapIdx >= newList.length) return;
        [newList[exIdx], newList[swapIdx]] = [newList[swapIdx], newList[exIdx]];
        setWExList(newList);
    }

    function addSet(exIdx: number) {
        setWExList((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: [...e.sets, { reps: 10, label: '', notes: '' }] }));
    }

    function removeSet(exIdx: number, setIdx: number) {
        setWExList((prev) => prev.map((e, i) => i !== exIdx ? e : { ...e, sets: e.sets.filter((_, si) => si !== setIdx) }));
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

    // ─── Modal open ───────────────────────────────────────────────────────────
    function openCreate() {
        setEditTarget(null); setWName(''); setWExList([]);
        setShowModal(true);
    }

    function openEdit(w: Workout) {
        setEditTarget(w); setWName(w.name); setWExList(w.exercises);
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (wExList.length === 0) { setToast({ msg: 'Adicione ao menos um exercício.', type: 'error' }); return; }
        setSaving(true);
        if (editTarget) {
            await updateWorkout({ ...editTarget, name: wName, exercises: wExList });
            setToast({ msg: 'Treino atualizado!', type: 'success' });
        } else {
            await addWorkout({ id: uid(), name: wName, ownerId: userId, projectId: id, exercises: wExList });
            setToast({ msg: 'Treino criado!', type: 'success' });
        }
        setSaving(false);
        setShowModal(false);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);
        await deleteWorkout(deleteTarget.id);
        setSaving(false);
        setDeleteTarget(null);
        setToast({ msg: 'Treino excluído.', type: 'success' });
    }

    return (
        <>
            <Navbar />
            <div className="container">
                {/* Header */}
                <div style={{ marginBottom: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push('/projects')} style={{ marginBottom: 12, paddingLeft: 0 }}>
                        ← Projetos
                    </button>
                </div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">{project.name}</h1>
                        <p className="page-subtitle">{workouts.length} treino(s)</p>
                    </div>
                    {isOwner && (
                        <button className="btn btn-primary" onClick={openCreate}>
                            <Plus size={16} /> Novo Treino
                        </button>
                    )}
                </div>

                {workouts.length === 0 ? (
                    <div className="empty-state">
                        <Dumbbell size={48} color="var(--text-muted)" />
                        <p>Nenhum treino neste projeto ainda.</p>
                        {isOwner && (
                            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                                Criar treino
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
                        {orderedWorkouts.map((w, idx) => {
                            const exCount = w.exercises.length;
                            return (
                                <div key={w.id} className="item-card">
                                    {isOwner && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, marginRight: 4 }}>
                                            <button className="btn-icon" style={{ padding: 2, opacity: idx === 0 ? 0.2 : 1 }}
                                                onClick={() => moveWorkout(idx, -1)} disabled={idx === 0} title="Mover para cima">
                                                <ArrowUp size={13} />
                                            </button>
                                            <button className="btn-icon" style={{ padding: 2, opacity: idx === orderedWorkouts.length - 1 ? 0.2 : 1 }}
                                                onClick={() => moveWorkout(idx, 1)} disabled={idx === orderedWorkouts.length - 1} title="Mover para baixo">
                                                <ArrowDown size={13} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="stat-icon stat-icon-green" style={{ width: 40, height: 40, flexShrink: 0 }}>
                                        <Dumbbell size={18} />
                                    </div>
                                    <div className="item-card-info" style={{ flex: 1, cursor: 'pointer' }} onClick={() => router.push(`/workouts/${w.id}`)}>
                                        <div className="item-card-title">{w.name}</div>
                                        <div className="item-card-sub">{exCount} exercício(s)</div>
                                    </div>
                                    {isOwner && (
                                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                            <button className="btn-icon" title="Editar" onClick={() => openEdit(w)}><Pencil size={15} /></button>
                                            <button className="btn-icon" title="Excluir" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(w)}><Trash2 size={15} /></button>
                                        </div>
                                    )}
                                    <button className="btn-icon" onClick={() => router.push(`/workouts/${w.id}`)}>
                                        <ChevronRight size={16} />
                                    </button>
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
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                            <button className="btn btn-primary" form="workout-form" type="submit" disabled={saving}>
                                {saving ? 'Salvando...' : (editTarget ? 'Salvar' : 'Criar Treino')}
                            </button>
                        </>
                    }
                >
                    <form id="workout-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="field">
                            <label>Nome do treino *</label>
                            <input className="input" placeholder="Ex: Treino A – Peito e Tríceps" value={wName} onChange={(e) => setWName(e.target.value)} required />
                        </div>
                        <div className="divider" />
                        <div className="field">
                            <label>Adicionar exercício</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select className="input" value={selEx} onChange={(e) => setSelEx(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {[...store.exercises]
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((ex) => <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle})</option>)}
                                </select>
                                <button type="button" className="btn btn-ghost" onClick={addExToList}><Plus size={16} /></button>
                            </div>
                        </div>
                        {wExList.map((item, exIdx) => {
                            const exInfo = store.exercises.find((e) => e.id === item.exerciseId);
                            return (
                                <div key={exIdx} className="card" style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {/* Exercise reorder buttons */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <button type="button" onClick={() => moveEx(exIdx, -1)} disabled={exIdx === 0}
                                                    style={{ background: 'none', border: 'none', color: exIdx === 0 ? 'var(--text-muted)' : 'var(--accent)', cursor: exIdx === 0 ? 'default' : 'pointer', padding: '1px 2px', display: 'flex', opacity: exIdx === 0 ? 0.3 : 1 }}>
                                                    <ArrowUp size={12} />
                                                </button>
                                                <button type="button" onClick={() => moveEx(exIdx, 1)} disabled={exIdx === wExList.length - 1}
                                                    style={{ background: 'none', border: 'none', color: exIdx === wExList.length - 1 ? 'var(--text-muted)' : 'var(--accent)', cursor: exIdx === wExList.length - 1 ? 'default' : 'pointer', padding: '1px 2px', display: 'flex', opacity: exIdx === wExList.length - 1 ? 0.3 : 1 }}>
                                                    <ArrowDown size={12} />
                                                </button>
                                            </div>
                                            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{exInfo?.name ?? 'Exercício'}</span>
                                        </div>
                                        <button type="button" onClick={() => removeEx(exIdx)}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex' }}>
                                            <X size={15} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {item.sets.map((s, setIdx) => (
                                            <div key={setIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input className="input" type="text" placeholder={`S${setIdx + 1}`} value={s.label ?? ''}
                                                    onChange={(e) => updateSetLabel(exIdx, setIdx, e.target.value)} style={{ width: 64, fontSize: '0.78rem' }} />
                                                <input className="input" type="number" min={1} max={100} value={s.reps}
                                                    onChange={(e) => updateSetReps(exIdx, setIdx, +e.target.value)} style={{ width: 64 }} />
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>reps</span>
                                                <input className="input" type="text" placeholder="Observações" value={s.notes ?? ''}
                                                    onChange={(e) => updateSetNotes(exIdx, setIdx, e.target.value)} style={{ flex: 1, fontSize: '0.78rem' }} />
                                                {item.sets.length > 1 && (
                                                    <button type="button" onClick={() => removeSet(exIdx, setIdx)}
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => addSet(exIdx)} style={{ marginTop: 8 }}>
                                        <Plus size={13} /> Série
                                    </button>
                                </div>
                            );
                        })}
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Treino" onClose={() => setDeleteTarget(null)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</button>
                            <button className="btn btn-danger" onClick={confirmDelete} disabled={saving}>
                                {saving ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </>
                    }
                >
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Excluir <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? Os registros deste treino também serão apagados.
                    </p>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
