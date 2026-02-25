'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, Pencil, Trash2, ChevronRight, Share2, X, Users, Sparkles, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { uid, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/lib/types';

function projectStatus(p: Project): 'ativo' | 'inativo' | 'futuro' {
    const today = new Date().toISOString().slice(0, 10);
    if (today < p.startDate) return 'futuro';
    if (today > p.endDate) return 'inativo';
    return 'ativo';
}

const STATUS_LABEL = {
    ativo: { label: 'Ativo', color: '#22c55e', dot: '🟢' },
    inativo: { label: 'Encerrado', color: '#9ca3af', dot: '⚪' },
    futuro: { label: 'Em breve', color: '#f59e0b', dot: '🟡' },
};

export default function ProjectsPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, addProject, updateProject, deleteProject, addWorkout, refresh } = useStore();
    const currentUser = store.profiles.find((u) => u.id === userId);

    const [showModal, setShowModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Project | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
    const [showShareModal, setShowShareModal] = useState<string | null>(null);
    const [shareEmail, setShareEmail] = useState('');
    const [shareStatus, setShareStatus] = useState<{ msg: string; ok: boolean } | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);

    const [pName, setPName] = useState('');
    const [pStart, setPStart] = useState('');
    const [pEnd, setPEnd] = useState('');
    const [pPrescribeEmail, setPPrescribeEmail] = useState('');
    const [pIsEvolution, setPIsEvolution] = useState(false);

    const [aiFocus, setAiFocus] = useState('');
    const [aiDays, setAiDays] = useState('4');
    const [aiTime, setAiTime] = useState('60');
    const [aiExperience, setAiExperience] = useState('Iniciante');
    const [aiLimitations, setAiLimitations] = useState('');
    const [aiUsePrevious, setAiUsePrevious] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiPrescribeEmail, setAiPrescribeEmail] = useState('');

    const [filterStatus, setFilterStatus] = useState<'Todos' | 'ativos' | 'inativos'>('ativos');
    const [filterCreator, setFilterCreator] = useState<string>('all'); // for User
    const [filterStudent, setFilterStudent] = useState<string>('all'); // for Personal
    const [filterShared, setFilterShared] = useState<'Todos' | 'Sim' | 'Não'>('Todos');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    // Auto-update status to inactive if end_date < today
    useEffect(() => {
        if (!ready || !store.projects.length) return;
        const today = new Date().toISOString().slice(0, 10);
        let updated = false;
        store.projects.forEach(p => {
            if (p.status === 'active' && p.endDate < today) {
                updateProject({ ...p, status: 'inactive' });
                updated = true;
            }
        });
        if (updated) refresh();
    }, [ready, store.projects, updateProject, refresh]);

    if (!ready || !userId) return null;

    const myProjects = store.projects.filter((p) => {
        const isOwner = p.ownerId === userId;
        const isShared = p.sharedWith.includes(userId);
        const isPrescribedToMe = p.prescribed_to === userId;
        const isPrescribedByMe = p.prescribed_by === userId;
        if (currentUser?.role === 'personal') {
            return isOwner || isPrescribedByMe;
        } else {
            return isOwner || isShared || isPrescribedToMe;
        }
    }).filter(p => {
        const isActive = p.status === 'active' || !p.status;
        if (filterStatus === 'ativos' && !isActive) return false;
        if (filterStatus === 'inativos' && isActive) return false;

        if (currentUser?.role === 'personal') {
            if (filterStudent !== 'all' && p.prescribed_to !== filterStudent) return false;
        } else {
            if (filterCreator === 'me' && p.ownerId !== userId) return false;
            if (filterCreator !== 'all' && filterCreator !== 'me' && p.prescribed_by !== filterCreator) return false;
        }

        if (filterShared !== 'Todos') {
            const isNotMine = p.ownerId !== userId && p.prescribed_by !== userId;
            if (filterShared === 'Sim' && !isNotMine) return false;
            if (filterShared === 'Não' && isNotMine) return false;
        }

        return true;
    });

    // Extract unique personals for filters
    const uniquePersonals = Array.from(new Set(store.projects.filter(p => p.prescribed_to === userId && p.prescribed_by).map(p => p.prescribed_by as string)));
    // Extract unique students for filters
    const uniqueStudents = Array.from(new Set(store.projects.filter(p => p.prescribed_by === userId && p.prescribed_to).map(p => p.prescribed_to as string)));

    function openCreate() {
        setEditTarget(null);
        setPName(''); setPStart(''); setPEnd('');
        setPPrescribeEmail(''); setPIsEvolution(false);
        setShowModal(true);
    }

    function openEdit(p: Project) {
        setEditTarget(p);
        setPName(p.name); setPStart(p.startDate); setPEnd(p.endDate);
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (pEnd < pStart && !pIsEvolution) { setToast({ msg: 'A data de término deve ser após o início.', type: 'error' }); return; }
        setSaving(true);
        try {
            if (editTarget) {
                await updateProject({ ...editTarget, name: pName, startDate: pStart, endDate: pEnd });
                setToast({ msg: 'Treino atualizado!', type: 'success' });
            } else {
                let prescribedTo: string | null = null;
                const newProjectId = uid();

                // If personal prescribing to someone
                if (currentUser?.role === 'personal' && pPrescribeEmail) {
                    const studentAccount = store.profiles.find((u) => u.email.toLowerCase() === pPrescribeEmail.trim().toLowerCase());
                    if (studentAccount) {
                        prescribedTo = studentAccount.id;
                        // Link them automatically if not linked
                        const { data: linkMatch } = await supabase.from('personal_students')
                            .select('*')
                            .eq('personal_id', userId)
                            .eq('student_id', studentAccount.id)
                            .maybeSingle();

                        if (!linkMatch) {
                            await supabase.from('personal_students').insert({
                                personal_id: userId,
                                student_id: studentAccount.id,
                                status: 'active'
                            });
                        }
                    } else {
                        // Pending prescription
                        await supabase.from('pending_prescriptions').insert({
                            personal_id: userId,
                            student_email: pPrescribeEmail.trim().toLowerCase(),
                            project_id: newProjectId
                        });
                    }
                }

                await addProject({
                    id: newProjectId,
                    name: pName,
                    ownerId: userId,
                    startDate: pStart,
                    endDate: pEnd,
                    sharedWith: [],
                    prescribed_by: currentUser?.role === 'personal' && pPrescribeEmail ? userId : null,
                    prescribed_to: prescribedTo,
                    status: 'active',
                    is_evolution: pIsEvolution
                });

                setToast({ msg: 'Treino criado!', type: 'success' });
            }
            setShowModal(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao salvar treino';
            setToast({ msg: `Erro: ${msg}`, type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);
        await deleteProject(deleteTarget.id);
        setSaving(false);
        setDeleteTarget(null);
        setToast({ msg: 'Treino excluído.', type: 'success' });
    }

    async function handleShareByEmail(projectId: string) {
        const email = shareEmail.trim().toLowerCase();
        if (!email) return;
        const proj = store.projects.find((x) => x.id === projectId);
        if (!proj) return;
        const foundUser = store.profiles.find((u) => u.email.toLowerCase() === email);
        if (foundUser) {
            if (foundUser.id === userId) {
                setShareStatus({ msg: 'Você não pode compartilhar consigo mesmo.', ok: false }); return;
            }
            if (proj.sharedWith.includes(foundUser.id)) {
                setShareStatus({ msg: 'Este usuário já tem acesso.', ok: false }); return;
            }
            await updateProject({ ...proj, sharedWith: [...proj.sharedWith, foundUser.id] });
            setShareEmail('');
            setShareStatus({ msg: `${foundUser.name} agora tem acesso ao treino! ✅`, ok: true });
        } else {
            // Simulate invite email (no real email service)
            setShareEmail('');
            setShareStatus({ msg: `Convite enviado para ${email}. Assim que criar uma conta, terá acesso ao treino. ✉️`, ok: true });
        }
    }

    async function removeShare(projectId: string, friendId: string) {
        const p = store.projects.find((x) => x.id === projectId);
        if (!p) return;
        await updateProject({ ...p, sharedWith: p.sharedWith.filter((id) => id !== friendId) });
        setToast({ msg: 'Acesso removido.', type: 'success' });
    }

    async function handleGenerateAI(e: React.FormEvent) {
        e.preventDefault();
        setAiGenerating(true);
        try {
            let lastProjectInfo = '';
            const myProjs = store.projects.filter(p => p.ownerId === userId);
            if (aiUsePrevious && myProjs.length > 0) {
                lastProjectInfo = myProjs[myProjs.length - 1].name;
            }

            const res = await fetch('/api/generate-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    focus: aiFocus,
                    daysPerWeek: parseInt(aiDays),
                    maxTimeMins: parseInt(aiTime),
                    experienceLevel: aiExperience,
                    limitations: aiLimitations,
                    lastProjectInfo,
                    existingExercises: store.exercises.map(ex => ({ id: ex.id, name: ex.name, muscle: ex.muscle }))
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro na IA');

            const newProjectId = uid();
            const today = new Date().toISOString().slice(0, 10);
            const future = new Date();
            future.setDate(future.getDate() + 30);
            const endDate = future.toISOString().slice(0, 10);

            let prescribedTo: string | null = null;
            let studentMsg = '';
            if (currentUser?.role === 'personal' && aiPrescribeEmail) {
                const emailToSearch = aiPrescribeEmail.trim().toLowerCase();
                const studentAccount = store.profiles.find((u) => u.email.toLowerCase() === emailToSearch);
                if (studentAccount) {
                    prescribedTo = studentAccount.id;
                    studentMsg = `Prescrito p/ ${studentAccount.name.split(' ')[0]}. `;
                    const { data: linkMatch } = await supabase.from('personal_students')
                        .select('*')
                        .eq('personal_id', userId)
                        .eq('student_id', studentAccount.id)
                        .maybeSingle();

                    if (!linkMatch) {
                        await supabase.from('personal_students').insert({
                            personal_id: userId,
                            student_id: studentAccount.id,
                            status: 'active'
                        });
                    }
                } else {
                    studentMsg = `Convite pendente p/ ${emailToSearch}. `;
                    await supabase.from('pending_prescriptions').insert({
                        personal_id: userId,
                        student_email: emailToSearch,
                        project_id: newProjectId
                    });
                }
            }

            await addProject({
                id: newProjectId,
                name: `✨ ${data.projectName || `Sessão IA (${aiFocus})`}`,
                ownerId: userId,
                startDate: today,
                endDate: endDate,
                sharedWith: [],
                prescribed_by: currentUser?.role === 'personal' && aiPrescribeEmail ? userId : null,
                prescribed_to: prescribedTo,
                status: 'active'
            });

            for (const w of (data.workouts || [])) {
                await addWorkout({
                    id: uid(),
                    projectId: newProjectId,
                    ownerId: userId,
                    name: w.name,
                    order: w.order,
                    exercises: w.exercises || []
                });
            }

            setToast({ msg: `${studentMsg}Sessão Gerada! 🚀`, type: 'success' });
            setShowAIModal(false);
            setAiFocus('');
            setAiLimitations('');
            setAiPrescribeEmail('');
        } catch (err: unknown) {
            setToast({ msg: (err as Error).message || 'Falha ao gerar a sessão.', type: 'error' });
        } finally {
            setAiGenerating(false);
        }
    }


    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[1000px] mx-auto px-6 lg:px-12 py-8">
                <div className="flex flex-col md:flex-row md:items-end w-full justify-between gap-6 mb-10">
                    <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => router.push('/')} className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-5 py-2.5 text-sm">
                                ← Voltar ao Dashboard
                            </button>
                        </div>
                        <h1 className="page-title">Sessões</h1>
                        <p className="page-subtitle">{myProjects.length} sessão(ões)</p>
                    </div>

                    {/* Filters */}
                    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 shadow-sm outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                            <option value="Todos">Todos (Status)</option>
                            <option value="ativos">Ativos</option>
                            <option value="inativos">Inativos</option>
                        </select>

                        <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 shadow-sm outline-none" value={filterShared} onChange={e => setFilterShared(e.target.value as any)}>
                            <option value="Todos">Compartilhado comigo?</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                        </select>

                        {currentUser?.role === 'personal' ? (
                            <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 shadow-sm outline-none" value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
                                <option value="all">Todos os Alunos</option>
                                {uniqueStudents.map(sId => {
                                    const student = store.profiles.find(u => u.id === sId);
                                    return student ? <option key={sId} value={sId}>{student.name}</option> : null;
                                })}
                            </select>
                        ) : (
                            <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 shadow-sm outline-none" value={filterCreator} onChange={e => setFilterCreator(e.target.value)}>
                                <option value="all">Criador (Todos)</option>
                                <option value="me">Criados por mim</option>
                                {uniquePersonals.map(pId => {
                                    const personal = store.profiles.find(u => u.id === pId);
                                    return personal ? <option key={pId} value={pId}>Enviado por {personal.name}</option> : null;
                                })}
                            </select>
                        )}
                    </div>

                    <div style={{ alignSelf: 'flex-start', marginTop: 12, display: 'flex', gap: 10 }}>
                        <button className="btn bg-[#C084FC] text-white hover:bg-[#A855F7] shadow-lg shadow-[#C084FC]/30 px-6 py-4" onClick={() => setShowAIModal(true)} style={{ border: 'none' }}>
                            <Sparkles size={16} /> Gerar por IA
                        </button>
                        <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4" onClick={openCreate}>
                            <Plus size={16} /> Nova
                        </button>
                    </div>
                </div>

                {myProjects.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                        <FolderOpen size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold font-roboto">Nenhuma sessão ainda. Crie sua primeira sessão!</p>
                        <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4 mt-6" onClick={openCreate}>
                            Criar sessão
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
                        {myProjects.map((p) => {
                            const statusLabel = p.status === 'inactive' ? projectStatus({ ...p, endDate: '1970-01-01' }) : projectStatus(p);
                            const st = STATUS_LABEL[statusLabel];
                            const workoutCount = store.workouts.filter((w) => w.projectId === p.id).length;

                            const isOwner = p.ownerId === userId;
                            const isPrescribedByMe = p.prescribed_by === userId;
                            const isPrescriptionForMe = p.prescribed_to === userId;
                            const isInactive = p.status === 'inactive';

                            const canEdit = isOwner || isPrescribedByMe;
                            const canDelete = isOwner || isPrescribedByMe;
                            const canShare = isOwner || isPrescribedByMe;
                            const canViewDetail = !isPrescriptionForMe || !isInactive;

                            return (
                                <div key={p.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 bg-white card-depth p-4 md:p-6 rounded-xl border border-transparent ${canViewDetail ? 'hover:border-primary/20 hover:shadow-lg cursor-pointer' : 'opacity-70'} transition-all`} onClick={() => canViewDetail && router.push(`/projects/${p.id}`)}>
                                    <div className="size-12 rounded-xl flex items-center justify-center bg-[#C084FC] text-white shrink-0">
                                        <FolderOpen size={20} />
                                    </div>
                                    <div className="flex-1 cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            <span className="item-card-title text-base sm:text-lg">
                                                {currentUser?.role !== 'personal' ? p.name.replace('✨ ', '').replace('✨', '') : p.name}
                                            </span>
                                            {p.name.includes('✨') && currentUser?.role === 'personal' && (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C084FC', background: '#C084FC22', borderRadius: 20, padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Sparkles size={10} /> IA
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: st.color, background: `${st.color}22`, borderRadius: 20, padding: '2px 10px' }}>
                                                {st.dot} {st.label}
                                            </span>
                                            {isPrescribedByMe && p.prescribed_to && (
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6', background: '#3b82f622', borderRadius: 20, padding: '2px 10px' }}>
                                                    Prescrito
                                                </span>
                                            )}
                                        </div>
                                        <div className="item-card-sub text-slate-500 mt-2 text-xs">
                                            📅 {formatDate(p.startDate)} → {formatDate(p.endDate)} <span className="mx-2">•</span> 🏋️ {workoutCount} sessão(ões)
                                        </div>
                                        {p.prescribed_by && p.prescribed_to === userId && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, fontWeight: 'bold' }}>
                                                Enviado por seu Personal ({store.profiles.find(u => u.id === p.prescribed_by)?.name})
                                            </div>
                                        )}
                                        {p.prescribed_to && p.prescribed_by === userId && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, fontWeight: 'bold' }}>
                                                Prescrito para {store.profiles.find(u => u.id === p.prescribed_to)?.name}
                                            </div>
                                        )}
                                        {p.sharedWith.length > 0 && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
                                                Compartilhado com {p.sharedWith.length} pessoa(s)
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100" onClick={(e) => e.stopPropagation()}>
                                        {canShare && (
                                            <button className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors" title="Compartilhar" onClick={() => setShowShareModal(p.id)}>
                                                <Share2 size={18} />
                                            </button>
                                        )}
                                        {canEdit && (
                                            <button className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors" title="Editar / Inativar" onClick={() => openEdit(p)}>
                                                <Pencil size={18} />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button className="p-2.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors" title="Excluir" onClick={() => setDeleteTarget(p)}>
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        {canViewDetail && (
                                            <button className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors hidden sm:flex" onClick={() => router.push(`/projects/${p.id}`)}>
                                                <ChevronRight size={20} />
                                            </button>
                                        )}
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
                            <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4" form="project-form" type="submit" disabled={saving}>
                                {saving ? 'Salvando...' : (editTarget ? 'Salvar' : 'Criar Sessão')}
                            </button>
                        </div>
                    }
                >
                    <form id="project-form" onSubmit={handleSave} className="flex flex-col gap-5 mt-6">
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Nome da sessão *</label>
                            <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" placeholder="Ex: Sessão de Hipertrofia" value={pName} onChange={(e) => setPName(e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Data de início *</label>
                                <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} required disabled={pIsEvolution} />
                            </div>
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Data de término *</label>
                                <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} required min={pIsEvolution ? '' : pStart} />
                            </div>
                        </div>
                        {editTarget && (
                            <div className="field">
                                <button type="button" className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 mt-2 w-max text-sm" onClick={() => {
                                    const novoStatus = editTarget.status === 'inactive' ? 'active' : 'inactive';
                                    updateProject({ ...editTarget, status: novoStatus });
                                    setToast({ msg: `Treino marcado como ${novoStatus === 'active' ? 'Ativo' : 'Inativo'}.`, type: 'success' });
                                    setShowModal(false);
                                }}>
                                    {editTarget.status === 'inactive' ? 'Reativar Treino' : 'Marcar Treino como Inativo'}
                                </button>
                            </div>
                        )}
                        {!editTarget && (
                            <>
                                {currentUser?.role === 'personal' && (
                                    <div className="field">
                                        <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Para quem é este treino? (E-mail)</label>
                                        <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" type="email" placeholder="Opcional. Ex: aluno@email.com" value={pPrescribeEmail} onChange={(e) => setPPrescribeEmail(e.target.value)} />
                                    </div>
                                )}
                                <div className="field">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: myProjects.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'normal', color: 'var(--text-secondary)' }} title={myProjects.length === 0 ? 'Você precisa de um treino anterior para evoluir' : ''}>
                                        <input
                                            type="checkbox"
                                            checked={pIsEvolution}
                                            disabled={myProjects.length === 0}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setPIsEvolution(checked);
                                                if (checked && myProjects.length > 0) {
                                                    const lastEnd = myProjects.sort((a, b) => b.endDate.localeCompare(a.endDate))[0].endDate;
                                                    const nextDay = new Date(new Date(lastEnd).getTime() + 86400000);
                                                    const now = new Date();
                                                    setPStart((nextDay > now ? nextDay : now).toISOString().slice(0, 10));
                                                }
                                            }}
                                            style={{ width: 16, height: 16, accentColor: 'var(--primary)', opacity: myProjects.length === 0 ? 0.5 : 1 }}
                                        />
                                        Evolução de treino anterior
                                    </label>
                                </div>
                            </>
                        )}
                    </form>
                </Modal>
            )}

            {/* AI Generation Modal */}
            {showAIModal && (
                <Modal title="✨ Nova Sessão por IA" onClose={() => { setShowAIModal(false); setAiPrescribeEmail(''); }}
                    footer={
                        <div className="flex justify-end gap-3 mt-8 items-center">
                            {aiGenerating && (
                                <span className="text-xs text-slate-500 font-roboto mr-auto flex items-center">
                                    Isso pode levar até 3 minutos...
                                </span>
                            )}
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setShowAIModal(false)} disabled={aiGenerating}>Cancelar</button>
                            <button className="btn bg-[#C084FC] text-white hover:bg-[#A855F7] hover:scale-[1.02] shadow-xl shadow-[#C084FC]/30 px-6 py-4 flex items-center gap-2" form="ai-form" type="submit" disabled={aiGenerating}>
                                {aiGenerating ? 'Criando a mágica...' : 'Gerar Programa Mágico'}
                            </button>
                        </div>
                    }
                >
                    <form id="ai-form" onSubmit={handleGenerateAI} className="flex flex-col gap-5 mt-6">
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Qual o seu objetivo principal? *</label>
                            <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" placeholder="Ex: Hipertrofia, Emagrecimento, Força..." value={aiFocus} onChange={(e) => setAiFocus(e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Dias por semana *</label>
                                <select className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white" value={aiDays} onChange={(e) => setAiDays(e.target.value)} required>
                                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                                        <option key={num} value={num}>{num} dias</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Nível de experiência *</label>
                                <select className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white" value={aiExperience} onChange={(e) => setAiExperience(e.target.value)} required>
                                    <option value="Iniciante">Iniciante</option>
                                    <option value="Intermediário">Intermediário</option>
                                    <option value="Avançado">Avançado</option>
                                </select>
                            </div>
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Tempo por sessão (aprox.) *</label>
                                <select className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white" value={aiTime} onChange={(e) => setAiTime(e.target.value)} required>
                                    <option value="30">30 minutos</option>
                                    <option value="45">45 minutos</option>
                                    <option value="60">60 minutos</option>
                                    <option value="90">90 minutos</option>
                                    <option value="120">120 minutos</option>
                                </select>
                            </div>
                        </div>
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Possui alguma limitação física ou preferência? (Opcional)</label>
                            <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" placeholder="Ex: Dor no joelho, fortalecer lombar, não colocar supino..." value={aiLimitations} onChange={(e) => setAiLimitations(e.target.value)} />
                        </div>
                        {currentUser?.role === 'personal' && (
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Para quem é este treino? (E-mail)</label>
                                <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" type="email" placeholder="Opcional. Ex: aluno@email.com" value={aiPrescribeEmail} onChange={(e) => setAiPrescribeEmail(e.target.value)} />
                            </div>
                        )}
                        {store.projects.filter(p => p.ownerId === userId).length > 0 && (
                            <div className="field" style={{ marginTop: 8 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={aiUsePrevious}
                                        onChange={(e) => setAiUsePrevious(e.target.checked)}
                                        style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                                    />
                                    Evoluir a partir do meu treino: &quot;{store.projects.filter(p => p.ownerId === userId).at(-1)?.name}&quot;
                                </label>
                            </div>
                        )}
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Treino" onClose={() => setDeleteTarget(null)}
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
                        Excluir <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? Todas as sessões e registros deste treino serão apagados.
                    </p>
                </Modal>
            )}

            {/* Share Modal */}
            {showShareModal && (() => {
                const proj = store.projects.find((p) => p.id === showShareModal);
                if (!proj) return null;
                const sharedUsers = store.profiles.filter((u) => proj.sharedWith.includes(u.id));
                return (
                    <Modal title={`Compartilhar — ${proj.name}`} onClose={() => { setShowShareModal(null); setShareEmail(''); setShareStatus(null); }}
                        footer={<button className="btn btn-ghost" onClick={() => { setShowShareModal(null); setShareEmail(''); setShareStatus(null); }}>Fechar</button>}
                    >
                        <div className="flex flex-col gap-6 mt-6">
                            {/* Email input */}
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Compartilhar por e-mail</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all flex-1"
                                        type="email"
                                        placeholder="exemplo@email.com"
                                        value={shareEmail}
                                        onChange={(e) => { setShareEmail(e.target.value); setShareStatus(null); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleShareByEmail(proj.id)}
                                    />
                                    <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-3 shrink-0" onClick={() => handleShareByEmail(proj.id)} disabled={!shareEmail.trim()}>
                                        <Share2 size={16} /> Convidar
                                    </button>
                                </div>
                                {shareStatus && (
                                    <p className={`text-xs mt-2 font-bold font-roboto ${shareStatus.ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {shareStatus.msg}
                                    </p>
                                )}
                            </div>

                            {/* Already shared with */}
                            {sharedUsers.length > 0 && (
                                <div>
                                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Com acesso</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {sharedUsers.map((u) => (
                                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                                </div>
                                                <button className="btn btn-ghost btn-sm" onClick={() => removeShare(proj.id, u.id)}>
                                                    <X size={13} /> Remover
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal>
                );
            })()}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
