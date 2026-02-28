'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, Pencil, Trash2, ChevronRight, Share2, X, Users, Sparkles, Loader2, Calendar, Dumbbell } from 'lucide-react';
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
    ativo: { label: 'Ativo', color: '#22c55e', bg: '#22c55e18', dot: '🟢' },
    inativo: { label: 'Encerrado', color: '#9ca3af', bg: '#9ca3af18', dot: '⚪' },
    futuro: { label: 'Em breve', color: '#f59e0b', bg: '#f59e0b18', dot: '🟡' },
};

export default function ProjectsPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, addProject, updateProject, deleteProject, addWorkout, refresh, loading } = useStore();
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
    const [aiStart, setAiStart] = useState('');
    const [aiEnd, setAiEnd] = useState('');
    const [showAiStudentDropdown, setShowAiStudentDropdown] = useState(false);
    const [showPStudentDropdown, setShowPStudentDropdown] = useState(false);

    const [filterStatus, setFilterStatus] = useState<'Todos' | 'ativos' | 'inativos'>('ativos');
    const [filterCreator, setFilterCreator] = useState<string>('all');
    const [filterStudent, setFilterStudent] = useState<string>('all');
    const [filterShared, setFilterShared] = useState<'Todos' | 'Sim' | 'Não'>('Todos');
    const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    useEffect(() => {
        if (!userId || currentUser?.role !== 'personal') return;
        supabase.from('personal_students').select('student_id').eq('personal_id', userId).eq('status', 'active').then(({ data }) => {
            if (data) setLinkedStudentIds(data.map(d => d.student_id));
        });
    }, [userId, currentUser?.role]);

    const autoDeactivatedRef = useRef(false);
    useEffect(() => {
        if (!ready || !store.projects.length || loading) return;
        if (autoDeactivatedRef.current) return;
        autoDeactivatedRef.current = true;

        const today = new Date().toISOString().slice(0, 10);
        const expiredProjects = store.projects.filter(p => p.status === 'active' && p.endDate < today);
        expiredProjects.forEach(p => {
            updateProject({ ...p, status: 'inactive' });
        });
    }, [ready, loading]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!ready || !userId || loading) return null;

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

    const uniquePersonals = Array.from(new Set(store.projects.filter(p => p.prescribed_to === userId && p.prescribed_by).map(p => p.prescribed_by as string)));
    const uniqueStudents = Array.from(new Set([
        ...store.projects.filter(p => p.prescribed_by === userId && p.prescribed_to).map(p => p.prescribed_to as string),
        ...linkedStudentIds
    ]));

    function openAIModal() {
        setAiFocus('');
        setAiLimitations('');
        setAiPrescribeEmail('');
        const today = new Date().toISOString().slice(0, 10);
        const future = new Date();
        future.setDate(future.getDate() + 30);
        const end = future.toISOString().slice(0, 10);
        setAiStart(today);
        setAiEnd(end);
        setShowAIModal(true);
    }

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
                if (currentUser?.role === 'personal' && pPrescribeEmail) {
                    const studentAccount = store.profiles.find((u) => u.email.toLowerCase() === pPrescribeEmail.trim().toLowerCase());
                    if (studentAccount) {
                        prescribedTo = studentAccount.id;
                        const { data: linkMatch } = await supabase.from('personal_students')
                            .select('*').eq('personal_id', userId).eq('student_id', studentAccount.id).maybeSingle();
                        if (!linkMatch) {
                            await supabase.from('personal_students').insert({ personal_id: userId, student_id: studentAccount.id, status: 'active' });
                        }
                    } else {
                        await supabase.from('pending_prescriptions').insert({ personal_id: userId, student_email: pPrescribeEmail.trim().toLowerCase(), project_id: newProjectId });
                    }
                }
                await addProject({
                    id: newProjectId, name: pName, ownerId: userId,
                    startDate: pStart, endDate: pEnd, sharedWith: [],
                    prescribed_by: currentUser?.role === 'personal' && pPrescribeEmail ? userId : null,
                    prescribed_to: prescribedTo, status: 'active', is_evolution: pIsEvolution
                });
                setToast({ msg: 'Treino criado!', type: 'success' });
            }
            setShowModal(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao salvar treino';
            setToast({ msg: `Erro: ${msg}`, type: 'error' });
        } finally { setSaving(false); }
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
            if (foundUser.id === userId) { setShareStatus({ msg: 'Você não pode compartilhar consigo mesmo.', ok: false }); return; }
            if (proj.sharedWith.includes(foundUser.id)) { setShareStatus({ msg: 'Este usuário já tem acesso.', ok: false }); return; }
            await updateProject({ ...proj, sharedWith: [...proj.sharedWith, foundUser.id] });
            setShareEmail('');
            setShareStatus({ msg: `${foundUser.name} agora tem acesso ao treino! ✅`, ok: true });
        } else {
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
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    focus: aiFocus, daysPerWeek: parseInt(aiDays), maxTimeMins: parseInt(aiTime),
                    experienceLevel: aiExperience, limitations: aiLimitations, lastProjectInfo,
                    existingExercises: store.exercises.map(ex => ({ id: ex.id, name: ex.name, muscle: ex.muscle, description: ex.description }))
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro na IA');

            const newProjectId = uid();
            let prescribedTo: string | null = null;
            let studentMsg = '';
            if (currentUser?.role === 'personal' && aiPrescribeEmail) {
                const emailToSearch = aiPrescribeEmail.trim().toLowerCase();
                const studentAccount = store.profiles.find((u) => u.email.toLowerCase() === emailToSearch);
                if (studentAccount) {
                    prescribedTo = studentAccount.id;
                    studentMsg = `Prescrito p/ ${studentAccount.name.split(' ')[0]}. `;
                    const { data: linkMatch } = await supabase.from('personal_students')
                        .select('*').eq('personal_id', userId).eq('student_id', studentAccount.id).maybeSingle();
                    if (!linkMatch) {
                        await supabase.from('personal_students').insert({ personal_id: userId, student_id: studentAccount.id, status: 'active' });
                    }
                } else {
                    studentMsg = `Convite pendente p/ ${emailToSearch}. `;
                    await supabase.from('pending_prescriptions').insert({ personal_id: userId, student_email: emailToSearch, project_id: newProjectId });
                }
            }

            await addProject({
                id: newProjectId, name: `✨ ${data.projectName || `Treino IA (${aiFocus})`}`,
                ownerId: userId,
                startDate: aiStart || new Date().toISOString().slice(0, 10),
                endDate: aiEnd || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                sharedWith: [],
                prescribed_by: currentUser?.role === 'personal' && aiPrescribeEmail ? userId : null,
                prescribed_to: prescribedTo, status: 'active'
            });

            for (const w of (data.workouts || [])) {
                await addWorkout({ id: uid(), projectId: newProjectId, ownerId: userId, name: w.name, order: w.order, exercises: w.exercises || [] });
            }
            setToast({ msg: `${studentMsg}Treino Gerado! 🚀`, type: 'success' });
            setShowAIModal(false);
            setAiFocus(''); setAiLimitations(''); setAiPrescribeEmail('');
        } catch (err: unknown) {
            setToast({ msg: (err as Error).message || 'Falha ao gerar treino.', type: 'error' });
        } finally { setAiGenerating(false); }
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
                {/* ─── Header ─── */}
                <div className="flex flex-col gap-5 mb-8">
                    <div>
                        <button onClick={() => router.push('/')} className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 text-sm mb-3">
                            ← Voltar ao Dashboard
                        </button>
                        <h1 className="page-title">Treinos</h1>
                        <p className="page-subtitle">{myProjects.length} treino(s)</p>
                    </div>

                    {/* Action buttons — full width on mobile */}
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            className="btn bg-[#C084FC] text-white hover:bg-[#A855F7] shadow-lg shadow-[#C084FC]/30 px-5 py-3 flex-1 sm:flex-none justify-center"
                            onClick={openAIModal}
                            style={{ border: 'none' }}
                        >
                            <Sparkles size={16} /> Gerar por IA
                        </button>
                        <button
                            className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-5 py-3 flex-1 sm:flex-none justify-center"
                            onClick={openCreate}
                        >
                            <Plus size={16} /> Nova
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 flex-wrap">
                        <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-sm outline-none min-w-0 flex-1 sm:flex-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                            <option value="Todos">Todos (Status)</option>
                            <option value="ativos">Ativos</option>
                            <option value="inativos">Inativos</option>
                        </select>
                        <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-sm outline-none min-w-0 flex-1 sm:flex-none" value={filterShared} onChange={e => setFilterShared(e.target.value as any)}>
                            <option value="Todos">Compartilhado?</option>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                        </select>
                        {currentUser?.role === 'personal' ? (
                            <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-sm outline-none min-w-0 flex-1 sm:flex-none" value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
                                <option value="all">Todos os Alunos</option>
                                {uniqueStudents.map(sId => {
                                    const student = store.profiles.find(u => u.id === sId);
                                    return student ? <option key={sId} value={sId}>{student.name}</option> : null;
                                })}
                            </select>
                        ) : (
                            <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-sm outline-none min-w-0 flex-1 sm:flex-none" value={filterCreator} onChange={e => setFilterCreator(e.target.value)}>
                                <option value="all">Criador (Todos)</option>
                                <option value="me">Criados por mim</option>
                                {uniquePersonals.map(pId => {
                                    const personal = store.profiles.find(u => u.id === pId);
                                    return personal ? <option key={pId} value={pId}>Por {personal.name}</option> : null;
                                })}
                            </select>
                        )}
                    </div>
                </div>

                {/* ─── Project Cards ─── */}
                {myProjects.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                        <FolderOpen size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold font-roboto">Nenhum treino criado. Crie agora!</p>
                        <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4 mt-6" onClick={openCreate}>
                            Criar treino
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mb-10">
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

                            const isAI = p.name.includes('✨');
                            const displayName = currentUser?.role !== 'personal' ? p.name.replace('✨ ', '').replace('✨', '') : p.name;

                            return (
                                <div
                                    key={p.id}
                                    className={`
                                        group bg-white card-depth rounded-xl
                                        border border-transparent
                                        ${canViewDetail ? 'hover:border-primary/20 hover:shadow-lg cursor-pointer active:scale-[0.99]' : 'opacity-60'}
                                        transition-all duration-200
                                    `}
                                    onClick={() => canViewDetail && router.push(`/projects/${p.id}`)}
                                >
                                    {/* ── Card Content ── */}
                                    <div className="p-4 sm:p-5">
                                        {/* Row 1: Icon + Title + Badges */}
                                        <div className="flex items-start gap-3">
                                            <div className="size-10 sm:size-11 rounded-xl flex items-center justify-center bg-[#C084FC] text-white shrink-0 mt-0.5">
                                                <FolderOpen size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {/* Title */}
                                                <h3 className="item-card-title text-[0.95rem] sm:text-base font-bold text-slate-900 leading-snug line-clamp-2">
                                                    {displayName}
                                                </h3>

                                                {/* Badges row */}
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                    {isAI && currentUser?.role === 'personal' && (
                                                        <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-[#C084FC] bg-[#C084FC]/10 rounded-full px-2 py-0.5">
                                                            <Sparkles size={9} /> IA
                                                        </span>
                                                    )}
                                                    <span
                                                        className="inline-flex items-center gap-1 text-[0.65rem] font-bold rounded-full px-2 py-0.5"
                                                        style={{ color: st.color, background: st.bg }}
                                                    >
                                                        {st.dot} {st.label}
                                                    </span>
                                                    {isPrescribedByMe && p.prescribed_to && (
                                                        <span className="inline-flex items-center text-[0.65rem] font-bold text-blue-500 bg-blue-500/10 rounded-full px-2 py-0.5">
                                                            Prescrito
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Desktop chevron */}
                                            {canViewDetail && (
                                                <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 hidden sm:block mt-1" />
                                            )}
                                        </div>

                                        {/* Row 2: Metadata — compact with icons */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 ml-[52px] sm:ml-[56px] text-[0.75rem] text-slate-500">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Calendar size={12} className="text-slate-400" />
                                                {formatDate(p.startDate)} → {formatDate(p.endDate)}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Dumbbell size={12} className="text-slate-400" />
                                                {workoutCount} treino(s)
                                            </span>
                                        </div>

                                        {/* Row 3: Prescription / Shared info */}
                                        <div className="ml-[52px] sm:ml-[56px] mt-1.5 flex flex-col gap-0.5">
                                            {p.prescribed_by && p.prescribed_to === userId && (
                                                <span className="text-[0.72rem] font-semibold" style={{ color: 'var(--primary)' }}>
                                                    Enviado por {store.profiles.find(u => u.id === p.prescribed_by)?.name}
                                                </span>
                                            )}
                                            {p.prescribed_to && p.prescribed_by === userId && (
                                                <span className="text-[0.72rem] font-semibold" style={{ color: 'var(--primary)' }}>
                                                    Prescrito para {store.profiles.find(u => u.id === p.prescribed_to)?.name}
                                                </span>
                                            )}
                                            {p.sharedWith.length > 0 && (
                                                <span className="text-[0.72rem] text-slate-400 inline-flex items-center gap-1">
                                                    <Users size={11} />
                                                    Compartilhado com {p.sharedWith.length} pessoa(s)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Action Bar ── */}
                                    {(canShare || canEdit || canDelete) && (
                                        <div
                                            className="flex items-center gap-1 px-4 sm:px-5 py-2.5 border-t border-slate-100/80"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {canShare && (
                                                <button
                                                    className="inline-flex items-center gap-1.5 text-[0.72rem] font-medium text-slate-400 hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                                    title="Compartilhar"
                                                    onClick={() => setShowShareModal(p.id)}
                                                >
                                                    <Share2 size={14} />
                                                    <span className="hidden sm:inline">Compartilhar</span>
                                                </button>
                                            )}
                                            {canEdit && (
                                                <button
                                                    className="inline-flex items-center gap-1.5 text-[0.72rem] font-medium text-slate-400 hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                                    title="Editar"
                                                    onClick={() => openEdit(p)}
                                                >
                                                    <Pencil size={14} />
                                                    <span className="hidden sm:inline">Editar</span>
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    className="inline-flex items-center gap-1.5 text-[0.72rem] font-medium text-slate-400 hover:text-rose-500 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                                    title="Excluir"
                                                    onClick={() => setDeleteTarget(p)}
                                                >
                                                    <Trash2 size={14} />
                                                    <span className="hidden sm:inline">Excluir</span>
                                                </button>
                                            )}

                                            {/* Spacer + open arrow on mobile */}
                                            {canViewDetail && (
                                                <button
                                                    className="ml-auto inline-flex items-center gap-1 text-[0.72rem] font-medium text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors sm:hidden"
                                                    onClick={() => router.push(`/projects/${p.id}`)}
                                                >
                                                    Abrir <ChevronRight size={14} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* ─── Create / Edit Modal ─── */}
            {showModal && (
                <Modal title={editTarget ? 'Editar Treino' : 'Novo treino'} onClose={() => setShowModal(false)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                            <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4" form="project-form" type="submit" disabled={saving}>
                                {saving ? 'Salvando...' : (editTarget ? 'Salvar' : 'Criar Treino')}
                            </button>
                        </div>
                    }
                >
                    <form id="project-form" onSubmit={handleSave} className="flex flex-col gap-5 mt-6">
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Nome do Treino *</label>
                            <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" placeholder="Ex: Treino de Hipertrofia" value={pName} onChange={(e) => setPName(e.target.value)} required />
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
                                    <div className="field relative">
                                        <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Para quem é este treino? (Informe o nome do aluno ou e-mail caso não tenha histórico com você)</label>
                                        <input
                                            className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white"
                                            type="text"
                                            placeholder="Opcional. Ex: aluno@email.com"
                                            value={pPrescribeEmail}
                                            onChange={(e) => { setPPrescribeEmail(e.target.value); setShowPStudentDropdown(true); }}
                                            onFocus={() => setShowPStudentDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowPStudentDropdown(false), 200)}
                                        />
                                        {showPStudentDropdown && pPrescribeEmail && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-auto" style={{ top: '100%', left: 0 }}>
                                                {(() => {
                                                    const search = pPrescribeEmail.toLowerCase();
                                                    const filtered = uniqueStudents.map(id => store.profiles.find(u => u.id === id)).filter(u => u && (u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)));
                                                    if (filtered.length === 0) return null;
                                                    return filtered.map(u => (
                                                        <div key={u!.id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-100 last:border-0"
                                                            onMouseDown={(e) => { e.preventDefault(); setPPrescribeEmail(u!.email); setShowPStudentDropdown(false); }}>
                                                            <span className="text-sm font-bold text-slate-800">{u!.name}</span>
                                                            <span className="text-xs text-slate-500">{u!.email}</span>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="field">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: myProjects.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'normal', color: 'var(--text-secondary)' }} title={myProjects.length === 0 ? 'Você precisa de um treino anterior para evoluir' : ''}>
                                        <input type="checkbox" checked={pIsEvolution} disabled={myProjects.length === 0}
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

            {/* ─── AI Generation Modal ─── */}
            {showAIModal && (
                <Modal title="✨ Novo treino por IA" onClose={() => { setShowAIModal(false); setAiPrescribeEmail(''); }}
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
                                    {[1, 2, 3, 4, 5, 6, 7].map(num => (<option key={num} value={num}>{num} dias</option>))}
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
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Duração do treino (aprox.) *</label>
                                <select className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all focus:bg-white" value={aiTime} onChange={(e) => setAiTime(e.target.value)} required>
                                    <option value="30">30 minutos</option>
                                    <option value="45">45 minutos</option>
                                    <option value="60">60 minutos</option>
                                    <option value="90">90 minutos</option>
                                    <option value="120">120 minutos</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Data de início *</label>
                                <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" type="date" value={aiStart} onChange={(e) => setAiStart(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Data de término *</label>
                                <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" type="date" value={aiEnd} onChange={(e) => setAiEnd(e.target.value)} required min={aiStart} />
                            </div>
                        </div>
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Possui alguma limitação física ou preferência? (Opcional)</label>
                            <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" placeholder="Ex: Dor no joelho, fortalecer lombar, não colocar supino..." value={aiLimitations} onChange={(e) => setAiLimitations(e.target.value)} />
                        </div>
                        {currentUser?.role === 'personal' && (
                            <div className="field relative">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Para quem é este treino? (Informe o nome do aluno ou e-mail caso não tenha histórico com você)</label>
                                <input
                                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white"
                                    type="text" placeholder="Opcional. Ex: aluno@email.com" value={aiPrescribeEmail}
                                    onChange={(e) => { setAiPrescribeEmail(e.target.value); setShowAiStudentDropdown(true); }}
                                    onFocus={() => setShowAiStudentDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowAiStudentDropdown(false), 200)}
                                />
                                {showAiStudentDropdown && aiPrescribeEmail && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-auto" style={{ top: '100%', left: 0 }}>
                                        {(() => {
                                            const search = aiPrescribeEmail.toLowerCase();
                                            const filtered = uniqueStudents.map(id => store.profiles.find(u => u.id === id)).filter(u => u && (u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)));
                                            if (filtered.length === 0) return null;
                                            return filtered.map(u => (
                                                <div key={u!.id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-100 last:border-0"
                                                    onMouseDown={(e) => { e.preventDefault(); setAiPrescribeEmail(u!.email); setShowAiStudentDropdown(false); }}>
                                                    <span className="text-sm font-bold text-slate-800">{u!.name}</span>
                                                    <span className="text-xs text-slate-500">{u!.email}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                        {store.projects.filter(p => p.ownerId === userId).length > 0 && (
                            <div className="field" style={{ marginTop: 8 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                                    <input type="checkbox" checked={aiUsePrevious} onChange={(e) => setAiUsePrevious(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                                    Evoluir a partir do meu treino: &quot;{store.projects.filter(p => p.ownerId === userId).at(-1)?.name}&quot;
                                </label>
                            </div>
                        )}
                    </form>
                </Modal>
            )}

            {/* ─── Delete Modal ─── */}
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
                        Excluir <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? Todos os registros deste treino serão apagados.
                    </p>
                </Modal>
            )}

            {/* ─── Share Modal ─── */}
            {showShareModal && (() => {
                const proj = store.projects.find((p) => p.id === showShareModal);
                if (!proj) return null;
                const sharedUsers = store.profiles.filter((u) => proj.sharedWith.includes(u.id));
                return (
                    <Modal title={`Compartilhar — ${proj.name}`} onClose={() => { setShowShareModal(null); setShareEmail(''); setShareStatus(null); }}
                        footer={<button className="btn btn-ghost" onClick={() => { setShowShareModal(null); setShareEmail(''); setShareStatus(null); }}>Fechar</button>}
                    >
                        <div className="flex flex-col gap-6 mt-6">
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Compartilhar por e-mail</label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all flex-1"
                                        type="email" placeholder="exemplo@email.com" value={shareEmail}
                                        onChange={(e) => { setShareEmail(e.target.value); setShareStatus(null); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleShareByEmail(proj.id)}
                                    />
                                    <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-3 shrink-0" onClick={() => handleShareByEmail(proj.id)} disabled={!shareEmail.trim()}>
                                        <Share2 size={16} /> Convidar
                                    </button>
                                </div>
                                {shareStatus && (
                                    <p className={`text-xs mt-2 font-bold font-roboto ${shareStatus.ok ? 'text-emerald-500' : 'text-rose-500'}`}>{shareStatus.msg}</p>
                                )}
                            </div>
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