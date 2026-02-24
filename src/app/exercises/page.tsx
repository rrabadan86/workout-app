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

const MUSCLES = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Abdômen', 'Glúteos', 'Panturrilha', 'Antebraço', 'Aeróbico'];
const muscleColors: Record<string, string> = {
    Peito: 'badge-purple', Costas: 'badge-green', Ombros: 'badge-red',
    Bíceps: 'badge-orange', Tríceps: 'badge-purple', Pernas: 'badge-green',
    Abdômen: 'badge-red', Glúteos: 'badge-orange', Panturrilha: 'badge-green', Antebraço: 'badge-red',
    Aeróbico: 'badge-green',
};

export default function ExercisesPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, addExercise, updateExercise, deleteExercise } = useStore();
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Exercise | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
    const [search, setSearch] = useState('');
    const [filterMuscle, setFilterMuscle] = useState('Todos');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [exName, setExName] = useState('');
    const [exMuscle, setExMuscle] = useState('Peito');
    const [exDesc, setExDesc] = useState('');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    if (!ready || !userId) return null;
    const user = store.users.find((u) => u.id === userId);
    if (!user) return null;
    const isSupervisor = user.email === 'rodrigorabadan@gmail.com';
    if (!isSupervisor) {
        if (typeof window !== 'undefined') router.replace('/dashboard');
        return null;
    }

    const exercises = store.exercises
        .filter((e) => {
            const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.muscle.toLowerCase().includes(search.toLowerCase());
            const matchMuscle = filterMuscle === 'Todos' || e.muscle === filterMuscle;
            return matchSearch && matchMuscle;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

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
            <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 lg:px-12 py-8">
                <div className="mb-4">
                    <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-5 py-2.5 text-sm" onClick={() => router.push('/dashboard')}>
                        ← Voltar ao Dashboard
                    </button>
                </div>
                <div className="flex flex-col md:flex-row md:items-end w-full justify-between gap-6 mb-10">
                    <div>
                        <h1 className="page-title">Exercícios</h1>
                        <p className="page-subtitle">{exercises.length} exercício(s)</p>
                    </div>
                    <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4" onClick={openCreate}>
                        <Plus size={16} /> Novo Exercício
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input className="bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pr-4 pl-11 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all card-depth hover:border-primary/20" placeholder="Buscar exercício ou músculo..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        {search && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors" onClick={() => setSearch('')}><X size={16} /></button>}
                    </div>

                    <select className="bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full sm:w-48 outline-none transition-all card-depth hover:border-primary/20 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22currentColor%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[position:right_12px_center] bg-no-repeat pr-10" value={filterMuscle} onChange={(e) => setFilterMuscle(e.target.value)}>
                        <option value="Todos">Todos os músculos</option>
                        {[...MUSCLES].sort((a, b) => a.localeCompare(b)).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {exercises.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                        <Dumbbell size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold font-roboto">Nenhum exercício encontrado.</p>
                        <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4 mt-6" onClick={openCreate}>Criar exercício</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10">
                        {exercises.map((ex) => {
                            const isOwner = ex.createdBy === userId;
                            return (
                                <div key={ex.id} className="flex flex-col gap-4 bg-white card-depth p-5 rounded-xl border border-transparent hover:border-primary/20 hover:shadow-lg transition-all relative">
                                    <div className="flex gap-4">
                                        <div className="size-12 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400 shrink-0"><Dumbbell size={20} /></div>
                                        <div className="flex-1 min-w-0 pr-12">
                                            <div className="item-card-title text-base sm:text-lg mb-1 truncate" title={ex.name}>{ex.name}</div>
                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-montserrat tracking-widest uppercase ${muscleColors[ex.muscle] === 'badge-purple' ? 'bg-[#C084FC]/10 text-[#C084FC]' : muscleColors[ex.muscle] === 'badge-green' ? 'bg-emerald-500/10 text-emerald-500' : muscleColors[ex.muscle] === 'badge-red' ? 'bg-rose-500/10 text-rose-500' : muscleColors[ex.muscle] === 'badge-orange' ? 'bg-orange-500/10 text-orange-500' : 'bg-[#C084FC]/10 text-[#C084FC]'}`}>{ex.muscle}</span>
                                        </div>
                                    </div>
                                    {ex.description && <div className="text-sm font-roboto text-slate-500 line-clamp-3">{ex.description}</div>}
                                    {isOwner && (
                                        <div className="absolute top-4 right-4 flex gap-1">
                                            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors" title="Editar" onClick={() => openEdit(ex)}><Pencil size={16} /></button>
                                            <button className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors" title="Excluir" onClick={() => setDeleteTarget(ex)}><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Create / Edit Modal */}
            {showModal && (
                <Modal title={editTarget ? 'Editar Exercício' : 'Novo Exercício'} onClose={() => setShowModal(false)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                            <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4" form="ex-form" type="submit" disabled={saving}>
                                {saving ? 'Salvando...' : (editTarget ? 'Salvar' : 'Criar')}
                            </button>
                        </div>
                    }
                >
                    <form id="ex-form" onSubmit={handleSave} className="flex flex-col gap-5 mt-6">
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Nome *</label>
                            <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" placeholder="Ex: Supino Reto" value={exName} onChange={(e) => setExName(e.target.value)} required />
                        </div>
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Grupo muscular *</label>
                            <select className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white" value={exMuscle} onChange={(e) => setExMuscle(e.target.value)}>
                                {[...MUSCLES].sort((a, b) => a.localeCompare(b)).map((m) => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Descrição (opcional)</label>
                            <textarea className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white min-h-[100px]" placeholder="Dicas de execução, ritmo, foco..." value={exDesc} onChange={(e) => setExDesc(e.target.value)} />
                        </div>
                    </form>
                </Modal >
            )
            }

            {/* Delete Confirm Modal */}
            {
                deleteTarget && (
                    <Modal title="Excluir Exercício" onClose={() => setDeleteTarget(null)}
                        footer={
                            <div className="flex justify-end gap-3 mt-8">
                                <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</button>
                                <button className="btn bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/30 px-6 py-4" onClick={confirmDelete} disabled={saving}>
                                    {saving ? 'Excluindo...' : 'Excluir'}
                                </button>
                            </div>
                        }
                    >
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Tem certeza que deseja excluir o exercício <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? Esta ação não pode ser desfeita.
                        </p>
                    </Modal >
                )
            }

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
