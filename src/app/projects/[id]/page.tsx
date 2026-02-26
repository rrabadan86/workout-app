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
    const currentUser = store.profiles.find((u) => u.id === userId);

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

    const [orderedIds, setOrderedIds] = useState<string[]>([]);
    const wIdsStr = workouts.map((w) => w.id).join(',');
    useEffect(() => {
        setOrderedIds(wIdsStr ? wIdsStr.split(',') : []);
    }, [wIdsStr]);
    const orderedWorkouts = orderedIds
        .map((wid) => workouts.find((w) => w.id === wid))
        .filter(Boolean) as typeof workouts;

    async function moveWorkout(idx: number, dir: -1 | 1) {
        const newIds = [...orderedIds];
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= newIds.length) return;
        [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
        setOrderedIds(newIds);
        await Promise.all(newIds.map((wid, i) => {
            const w = workouts.find((x) => x.id === wid);
            if (!w) return Promise.resolve();
            return updateWorkout({ ...w, order: i });
        }));
    }

    const getCompletedCount = useCallback((workoutId: string) => {
        if (!project || !userId) return 0;
        let targetUserId = userId;
        if (project.prescribed_by === userId && project.prescribed_to) {
            targetUserId = project.prescribed_to;
        }
        const projectStart = new Date(project.startDate).getTime();
        const projectEnd = new Date(project.endDate).getTime();
        const endDayBoundary = projectEnd + (24 * 60 * 60 * 1000);
        return store.feedEvents.filter(e => {
            if (e.userId !== targetUserId) return false;
            if (e.eventType !== 'WO_COMPLETED') return false;
            if (e.referenceId !== workoutId) return false;
            const eventTime = new Date(e.createdAt).getTime();
            return eventTime >= projectStart && eventTime <= endDayBoundary;
        }).length;
    }, [project, userId, store.feedEvents]);

    const getCompletionPercentage = useCallback((workoutId: string) => {
        if (!project || !userId) return null;
        let targetUserId = userId;
        if (project.prescribed_by === userId && project.prescribed_to) {
            targetUserId = project.prescribed_to;
        }
        const projectStart = new Date(project.startDate).getTime();
        const projectEnd = new Date(project.endDate).getTime();
        const endDayBoundary = projectEnd + (24 * 60 * 60 * 1000);
        const completions = store.feedEvents.filter(e => {
            if (e.userId !== targetUserId) return false;
            if (e.eventType !== 'WO_COMPLETED') return false;
            if (e.referenceId !== workoutId) return false;
            const eventTime = new Date(e.createdAt).getTime();
            return eventTime >= projectStart && eventTime <= endDayBoundary;
        });
        if (completions.length === 0) return null;
        const w = store.workouts.find(wk => wk.id === workoutId);
        if (!w || w.exercises.length === 0) return null;
        const totalPlannedExercises = w.exercises.length * completions.length;
        let totalCompletedExercises = 0;
        completions.forEach(event => {
            const eventDateObj = new Date(event.createdAt);
            const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;
            const dayLogs = store.logs.filter(l => l.userId === targetUserId && l.workoutId === workoutId && l.date === localDateStr);
            const availableLogs = [...dayLogs];
            let completedInThisSession = 0;
            w.exercises.forEach(planned => {
                const logIdx = availableLogs.findIndex(l => l.exerciseId === planned.exerciseId);
                if (logIdx !== -1) {
                    const l = availableLogs[logIdx];
                    if (l.sets.length > 0) completedInThisSession++;
                    availableLogs.splice(logIdx, 1);
                }
            });
            totalCompletedExercises += completedInThisSession;
        });
        const pct = (totalCompletedExercises / totalPlannedExercises) * 100;
        return pct.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';
    }, [project, userId, store.feedEvents, store.logs, store.workouts]);

    if (!ready || !userId) return null;
    if (!project) return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[1000px] mx-auto px-6 lg:px-12 py-8 text-center pt-20">
                <FolderOpen size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold font-roboto">Treino não encontrado.</p>
                <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 mt-6 px-6 py-4" onClick={() => router.push('/projects')}>← Voltar</button>
            </main>
        </>
    );

    const isOwner = project.ownerId === userId;

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
            setToast({ msg: 'Sessão atualizada!', type: 'success' });
        } else {
            await addWorkout({ id: uid(), name: wName, ownerId: userId, projectId: id, exercises: wExList });
            setToast({ msg: 'Sessão criada!', type: 'success' });
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
        setToast({ msg: 'Sessão excluída.', type: 'success' });
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[1000px] mx-auto px-6 lg:px-12 py-8">
                {/* Header */}
                <div className="mb-4">
                    <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-5 py-2.5 text-sm" onClick={() => router.push('/projects')}>
                        ← Treinos
                    </button>
                </div>
                <div className="flex flex-col md:flex-row md:items-end w-full justify-between gap-4 mb-6">
                    <div>
                        <h1 className="page-title text-2xl md:text-3xl">
                            {currentUser?.role !== 'personal' ? project.name.replace('✨ ', '').replace('✨', '') : project.name}
                        </h1>
                        <p className="page-subtitle mt-1">{workouts.length} sessão(ões)</p>
                    </div>
                    {isOwner && (
                        <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4" onClick={openCreate}>
                            <Plus size={16} /> Nova Sessão
                        </button>
                    )}
                </div>

                {workouts.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                        <Dumbbell size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold font-roboto">Nenhuma sessão neste treino ainda.</p>
                        {isOwner && (
                            <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4 mt-6" onClick={openCreate}>
                                Criar sessão
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5 mb-10">
                        {orderedWorkouts.map((w, idx) => {
                            const exCount = w.exercises.length;
                            const completedCount = getCompletedCount(w.id);
                            const completionPct = getCompletionPercentage(w.id);
                            return (
                                <div
                                    key={w.id}
                                    className="bg-white card-depth rounded-xl border border-transparent hover:border-primary/20 hover:shadow-lg transition-all"
                                >
                                    {/* Linha principal — sempre em row */}
                                    <div className="flex items-center gap-3 p-3 md:p-4">
                                        {/* Setas de ordem */}
                                        {isOwner && (
                                            <div className="flex flex-col gap-0.5 shrink-0">
                                                <button
                                                    className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors disabled:opacity-20"
                                                    onClick={() => moveWorkout(idx, -1)} disabled={idx === 0}
                                                >
                                                    <ArrowUp size={13} />
                                                </button>
                                                <button
                                                    className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors disabled:opacity-20"
                                                    onClick={() => moveWorkout(idx, 1)} disabled={idx === orderedWorkouts.length - 1}
                                                >
                                                    <ArrowDown size={13} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Ícone */}
                                        <div className="size-9 rounded-xl flex items-center justify-center bg-emerald-500 text-white shrink-0">
                                            <Dumbbell size={16} />
                                        </div>

                                        {/* Nome + badges — clicável */}
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => router.push(`/workouts/${w.id}`)}
                                        >
                                            <p className="item-card-title text-sm font-extrabold font-inter text-slate-900 truncate">
                                                {w.name}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                <span className="text-slate-400 text-[11px] font-roboto">{exCount} exercício(s)</span>
                                                {completedCount > 0 && (
                                                    <>
                                                        <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md text-[10px] font-bold font-roboto uppercase tracking-wider border border-emerald-200 whitespace-nowrap">
                                                            Realizado {completedCount}x
                                                        </span>
                                                        {completionPct && (
                                                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold font-roboto tracking-wider border border-slate-200 whitespace-nowrap">
                                                                {completionPct} executado
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ações — sempre à direita, sem border-t */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            {isOwner && (
                                                <>
                                                    <button
                                                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors"
                                                        onClick={() => openEdit(w)}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                                                        onClick={() => setDeleteTarget(w)}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
                                                onClick={() => router.push(`/workouts/${w.id}`)}
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Create / Edit Modal */}
            {showModal && (
                <Modal title={editTarget ? 'Editar Sessão' : 'Nova Sessão'} onClose={() => setShowModal(false)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                            <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4" form="workout-form" type="submit" disabled={saving}>
                                {saving ? 'Salvando...' : (editTarget ? 'Salvar' : 'Criar Sessão')}
                            </button>
                        </div>
                    }
                >
                    <form id="workout-form" onSubmit={handleSave} className="flex flex-col gap-6 mt-6">
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Nome da sessão *</label>
                            <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" placeholder="Ex: Treino A – Peito e Tríceps" value={wName} onChange={(e) => setWName(e.target.value)} required />
                        </div>
                        <div className="w-full h-px bg-slate-100 my-2" />
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Adicionar exercício</label>
                            <div className="flex items-center gap-3">
                                <select className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white flex-1" value={selEx} onChange={(e) => setSelEx(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {[...store.exercises]
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((ex) => <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle})</option>)}
                                </select>
                                <button type="button" className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 p-3 shrink-0" onClick={addExToList}><Plus size={20} /></button>
                            </div>
                        </div>
                        {wExList.map((item, exIdx) => {
                            const exInfo = store.exercises.find((e) => e.id === item.exerciseId);
                            return (
                                <div key={exIdx} className="bg-white rounded-xl card-depth p-4 md:p-5 border border-slate-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <button type="button" onClick={() => moveEx(exIdx, -1)} disabled={exIdx === 0}
                                                    className="p-0.5 rounded-sm hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400">
                                                    <ArrowUp size={14} />
                                                </button>
                                                <button type="button" onClick={() => moveEx(exIdx, 1)} disabled={exIdx === wExList.length - 1}
                                                    className="p-0.5 rounded-sm hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400">
                                                    <ArrowDown size={14} />
                                                </button>
                                            </div>
                                            <span className="font-extrabold font-inter text-slate-900 text-sm md:text-base">{exInfo?.name ?? 'Exercício'}</span>
                                        </div>
                                        <button type="button" onClick={() => removeEx(exIdx)}
                                            className="p-1.5 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {item.sets.map((s, setIdx) => (
                                            <div key={setIdx} className="flex flex-wrap md:flex-nowrap items-center gap-3">
                                                <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2 text-sm font-roboto text-slate-900 placeholder:text-slate-400 outline-none transition-all w-16 text-center" type="text" placeholder={`S${setIdx + 1}`} value={s.label ?? ''}
                                                    onChange={(e) => updateSetLabel(exIdx, setIdx, e.target.value)} />
                                                <div className="flex items-center gap-2">
                                                    <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2 text-sm font-roboto text-slate-900 outline-none transition-all w-16 text-center" type="number" min={1} max={100} value={s.reps}
                                                        onChange={(e) => updateSetReps(exIdx, setIdx, +e.target.value)} />
                                                    <span className="text-xs font-bold font-montserrat text-slate-400 uppercase tracking-wider">reps</span>
                                                </div>
                                                <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3 py-2 text-sm font-roboto text-slate-900 placeholder:text-slate-400 outline-none transition-all flex-1 min-w-[120px]" type="text" placeholder="Observações" value={s.notes ?? ''}
                                                    onChange={(e) => updateSetNotes(exIdx, setIdx, e.target.value)} />
                                                {item.sets.length > 1 && (
                                                    <button type="button" onClick={() => removeSet(exIdx, setIdx)}
                                                        className="p-2 rounded-full hover:bg-slate-100 text-slate-300 hover:text-rose-500 transition-colors shrink-0">
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button type="button" className="btn bg-slate-50 text-slate-500 hover:bg-slate-100 px-5 py-2.5 text-sm mt-4 w-full md:w-auto" onClick={() => addSet(exIdx)}>
                                        <Plus size={14} /> Nova Série
                                    </button>
                                </div>
                            );
                        })}
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Sessão" onClose={() => setDeleteTarget(null)}
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
                        Excluir <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? Os registros desta sessão também serão apagados.
                    </p>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}