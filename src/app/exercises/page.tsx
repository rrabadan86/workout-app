'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Dumbbell, Search, X, Pencil, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import type { Exercise } from '@/lib/types';

const MUSCLES = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Abdômen', 'Glúteos', 'Panturrilha', 'Antebraço'];
const muscleColors: Record<string, string> = {
    Peito: 'badge-purple', Costas: 'badge-green', Ombros: 'badge-red',
    Bíceps: 'badge-orange', Tríceps: 'badge-purple', Pernas: 'badge-green',
    Abdômen: 'badge-red', Glúteos: 'badge-orange', Panturrilha: 'badge-green', Antebraço: 'badge-red',
};

export default function ExercisesPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, addExercise, updateExercise, deleteExercise } = useStore();
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Exercise | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [exName, setExName] = useState('');
    const [exMuscle, setExMuscle] = useState('Peito');
    const [exDesc, setExDesc] = useState('');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);
    if (!ready || !userId) return null;

    const exercises = store.exercises.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.muscle.toLowerCase().includes(search.toLowerCase())
    );

    function openCreate() {
        setEditTarget(null);
        setExName(''); setExMuscle('Peito'); setExDesc('');
        setShowModal(true);
    }

    function openEdit(ex: Exercise) {
        setEditTarget(ex);
        setExName(ex.name); setExMuscle(ex.muscle); setExDesc(ex.description);
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        if (editTarget) {
            await updateExercise({ ...editTarget, name: exName, muscle: exMuscle, description: exDesc });
            setToast({ msg: 'Exercício atualizado!', type: 'success' });
        } else {
            await addExercise({ id: uid(), name: exName, muscle: exMuscle, description: exDesc, createdBy: userId });
            setToast({ msg: 'Exercício criado!', type: 'success' });
        }
        setExName(''); setExMuscle('Peito'); setExDesc('');
        setSaving(false);
        setShowModal(false);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);
        await deleteExercise(deleteTarget.id);
        setSaving(false);
        setDeleteTarget(null);
        setToast({ msg: 'Exercício excluído.', type: 'success' });
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Exercícios</h1>
                        <p className="page-subtitle">{exercises.length} exercício(s)</p>
                    </div>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Novo Exercício
                    </button>
                </div>

                <div style={{ position: 'relative', marginBottom: 24 }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" placeholder="Buscar exercício ou músculo..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 40 }} />
                    {search && <button style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSearch('')}><X size={16} /></button>}
                </div>

                {exercises.length === 0 ? (
                    <div className="empty-state">
                        <Dumbbell size={48} color="var(--text-muted)" />
                        <p>Nenhum exercício cadastrado ainda.</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>Criar primeiro exercício</button>
                    </div>
                ) : (
                    <div className="grid-2" style={{ marginBottom: 40 }}>
                        {exercises.map((ex) => {
                            const isOwner = ex.createdBy === userId;
                            return (
                                <div key={ex.id} className="item-card" style={{ cursor: 'default' }}>
                                    <div className="stat-icon stat-icon-purple" style={{ width: 40, height: 40, flexShrink: 0 }}><Dumbbell size={18} /></div>
                                    <div className="item-card-info" style={{ flex: 1 }}>
                                        <div className="item-card-title">{ex.name}</div>
                                        <div style={{ marginTop: 6 }}>
                                            <span className={`badge ${muscleColors[ex.muscle] ?? 'badge-purple'}`}>{ex.muscle}</span>
                                        </div>
                                        {ex.description && <div className="item-card-sub" style={{ marginTop: 4 }}>{ex.description}</div>}
                                    </div>
                                    {isOwner && (
                                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                            <button className="btn-icon" title="Editar" onClick={() => openEdit(ex)}><Pencil size={15} /></button>
                                            <button className="btn-icon" title="Excluir" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(ex)}><Trash2 size={15} /></button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <Modal title={editTarget ? 'Editar Exercício' : 'Novo Exercício'} onClose={() => setShowModal(false)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                            <button className="btn btn-primary" form="ex-form" type="submit" disabled={saving}>
                                {saving ? 'Salvando...' : (editTarget ? 'Salvar' : 'Criar')}
                            </button>
                        </>
                    }
                >
                    <form id="ex-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="field">
                            <label>Nome *</label>
                            <input className="input" placeholder="Ex: Supino Reto" value={exName} onChange={(e) => setExName(e.target.value)} required />
                        </div>
                        <div className="field">
                            <label>Grupo muscular *</label>
                            <select className="input" value={exMuscle} onChange={(e) => setExMuscle(e.target.value)}>
                                {MUSCLES.map((m) => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label>Descrição (opcional)</label>
                            <textarea className="input" placeholder="Dicas de execução..." value={exDesc} onChange={(e) => setExDesc(e.target.value)} />
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && (
                <Modal title="Excluir Exercício" onClose={() => setDeleteTarget(null)}
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
                        Tem certeza que deseja excluir o exercício <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? Esta ação não pode ser desfeita.
                    </p>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
