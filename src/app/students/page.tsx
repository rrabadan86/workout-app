'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Search, FolderOpen, Pencil, Trash2, Send, Clock, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import type { Profile, Project, PendingPrescription, PersonalStudent } from '@/lib/types';

export default function StudentsPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, refresh } = useStore();
    const currentUser = store.profiles.find((u) => u.id === userId);

    const [search, setSearch] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [students, setStudents] = useState<{ profile: Profile; link: PersonalStudent; activeProject?: Project }[]>([]);
    const [pending, setPending] = useState<PendingPrescription[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        if (ready) {
            if (!userId) {
                router.replace('/');
            } else if (currentUser?.role !== 'personal') {
                router.replace('/dashboard');
            } else {
                fetchStudentsData();
            }
        }
    }, [ready, userId, currentUser, router, store.projects]); // re-fetch if projects change

    async function fetchStudentsData() {
        if (!userId) return;
        setLoadingData(true);
        try {
            // Fetch links
            const { data: linksRes } = await supabase
                .from('personal_students')
                .select('*')
                .eq('personal_id', userId);

            // Fetch pending
            const { data: pendingRes } = await supabase
                .from('pending_prescriptions')
                .select('*')
                .eq('personal_id', userId);

            if (pendingRes) setPending(pendingRes);

            if (linksRes) {
                const activeLinks = linksRes as PersonalStudent[];
                const mappedStudents = activeLinks.map(link => {
                    const profile = store.profiles.find(p => p.id === link.student_id);
                    if (!profile) return null;

                    const today = new Date().toISOString().slice(0, 10);
                    // Find active project for this student
                    const activeProject = store.projects.find(p =>
                        p.prescribed_to === link.student_id &&
                        p.prescribed_by === userId &&
                        (p.status === 'active' || !p.status) &&
                        p.endDate >= today
                    );

                    return { profile, link, activeProject };
                }).filter(Boolean) as { profile: Profile; link: PersonalStudent; activeProject?: Project }[];

                setStudents(mappedStudents);
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    }

    async function handleInviteNewStudent(e: React.FormEvent) {
        e.preventDefault();
        setInviting(true);
        try {
            const email = inviteEmail.toLowerCase().trim();
            if (!email) throw new Error('E-mail vazio');

            const existingStudent = store.profiles.find(p => p.email.toLowerCase() === email);

            if (existingStudent) {
                const isAlreadyLinked = students.some(s => s.profile.id === existingStudent.id);
                if (isAlreadyLinked) throw new Error('Aluno já está na sua lista');

                // Link immediately
                const { error } = await supabase.from('personal_students').insert({
                    personal_id: userId,
                    student_id: existingStudent.id,
                    status: 'active'
                });
                if (error) throw error;
                setToast({ msg: 'Aluno adicionado à sua lista!', type: 'success' });
            } else {
                // Check if already pending
                const alreadyPending = pending.some(p => p.student_email === email);
                if (alreadyPending) {
                    setToast({ msg: 'Convite ou treino já pendente para este e-mail.', type: 'error' });
                    setInviting(false);
                    return;
                }

                // Add to pending prescriptions (even with no project yet, acts as invite)
                const { error } = await supabase.from('pending_prescriptions').insert({
                    personal_id: userId,
                    student_email: email,
                    // project_id is optional/nullable in our DB by logic (if not, we'd need a specific invite table, but pending_prescriptions can work if project_id is nullable)
                });
                if (error) throw error;
                setToast({ msg: `Convite enviado para ${email}. Quando criar conta, será seu aluno.`, type: 'success' });
            }

            setShowInviteModal(false);
            setInviteEmail('');
            fetchStudentsData();
        } catch (err: any) {
            setToast({ msg: err.message || 'Erro ao convidar aluno', type: 'error' });
        } finally {
            setInviting(false);
        }
    }

    async function toggleStudentStatus(linkId: string, currentStatus: 'active' | 'inactive') {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        await supabase.from('personal_students').update({ status: newStatus }).eq('id', linkId);
        setToast({ msg: `Aluno ${newStatus === 'active' ? 'Ativado' : 'Inativado'}`, type: 'success' });
        fetchStudentsData();
    }

    async function removePending(pendingId: string) {
        await supabase.from('pending_prescriptions').delete().eq('id', pendingId);
        setToast({ msg: 'Convite removido', type: 'success' });
        fetchStudentsData();
    }

    if (!ready || !userId || currentUser?.role !== 'personal') return null;

    const filteredStudents = students.filter(s => s.profile.name.toLowerCase().includes(search.toLowerCase()) || s.profile.email.toLowerCase().includes(search.toLowerCase()));

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[1000px] mx-auto px-6 lg:px-12 py-8">
                <div className="flex flex-col md:flex-row md:items-end w-full justify-between gap-6 mb-10">
                    <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => router.push('/dashboard')} className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-5 py-2.5 text-sm">
                                ← Voltar ao Dashboard
                            </button>
                        </div>
                        <h1 className="page-title">Meus Alunos</h1>
                        <p className="page-subtitle">{students.length} aluno(s) ativos/inativos</p>
                    </div>
                    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 10 }}>
                        <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4" onClick={() => setShowInviteModal(true)}>
                            <Plus size={16} /> Novo Aluno
                        </button>
                    </div>
                </div>

                {loadingData ? (
                    <div className="text-center text-slate-400 py-10 font-bold font-roboto">Carregando alunos...</div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {/* Pending Invites */}
                        {pending.length > 0 && (
                            <section className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                                <h2 className="text-sm font-bold font-montserrat text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Clock size={16} /> Convites Pendentes ({pending.length})
                                </h2>
                                <div className="flex flex-col gap-3">
                                    {pending.map(p => {
                                        const projName = store.projects.find(proj => proj.id === p.project_id)?.name;
                                        return (
                                            <div key={p.id} className="bg-white rounded-lg p-3 flex justify-between items-center shadow-sm border border-amber-50">
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{p.student_email}</p>
                                                    {projName && <p className="text-xs text-amber-600 font-bold mt-0.5">Treino prescrito: {projName}</p>}
                                                </div>
                                                <button className="text-rose-400 hover:text-rose-600 font-bold text-xs bg-rose-50 px-3 py-1.5 rounded-md" onClick={() => removePending(p.id!)}>
                                                    Cancelar
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Search & List */}
                        <section>
                            {students.length > 0 && (
                                <div className="relative w-full max-w-md mb-6">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou e-mail..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-roboto transition-all text-slate-900 shadow-sm"
                                    />
                                </div>
                            )}

                            {students.length === 0 ? (
                                <div className="bg-white rounded-xl card-depth p-10 text-center flex flex-col items-center justify-center border border-slate-100">
                                    <Users size={48} className="text-slate-300 mb-4" />
                                    <p className="text-slate-500 font-bold font-roboto">Você ainda não possui alunos vinculados.</p>
                                    <p className="text-slate-400 text-sm mt-2">Clique em "Novo Aluno" para convidar ou criar um treino direto para eles.</p>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="text-center text-slate-400 py-10 font-bold font-roboto">Nenhum aluno encontrado para "{search}".</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredStudents.map(s => {
                                        const isActiveStatus = s.link.status === 'active';
                                        return (
                                            <div key={s.profile.id} className="bg-white rounded-xl card-depth p-5 border border-slate-100 flex flex-col gap-4 hover:shadow-lg transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3 w-full overflow-hidden">
                                                        <div className={`size-12 rounded-full flex items-center justify-center font-extrabold text-white shrink-0 ${isActiveStatus ? 'bg-primary' : 'bg-slate-300'}`}>
                                                            {s.profile.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <h3 className="font-extrabold font-inter text-slate-900 text-base truncate" title={s.profile.name}>
                                                                {s.profile.name}
                                                            </h3>
                                                            <p className="text-slate-400 font-roboto text-xs truncate" title={s.profile.email}>
                                                                {s.profile.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {/* Custom status badge */}
                                                    <button
                                                        className={`shrink-0 ml-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${isActiveStatus ? 'bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                                        title={isActiveStatus ? 'Clique para Inativar' : 'Clique para Ativar'}
                                                        onClick={() => toggleStudentStatus(s.link.id!, s.link.status)}
                                                    >
                                                        {isActiveStatus ? 'Ativo' : 'Inativo'}
                                                    </button>
                                                </div>

                                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                    <p className="text-xs font-bold font-montserrat text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                        <FolderOpen size={12} /> Treino Atual
                                                    </p>
                                                    {s.activeProject ? (
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold font-inter text-sm text-slate-900 truncate" title={s.activeProject.name}>{s.activeProject.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-roboto mt-0.5">Até {formatDate(s.activeProject.endDate)}</p>
                                                            </div>
                                                            <button
                                                                className="text-primary hover:text-white hover:bg-primary font-bold text-xs bg-primary/10 px-3 py-1.5 rounded-md transition-colors"
                                                                onClick={() => router.push(`/projects/${s.activeProject?.id}`)}
                                                            >
                                                                Ver
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-center">
                                                            <p className="text-sm font-roboto text-slate-400 italic">Nenhum treino ativo</p>
                                                            {isActiveStatus && (
                                                                <button
                                                                    className="text-primary hover:text-white hover:bg-primary font-bold text-[10px] uppercase tracking-wider bg-primary/10 px-3 py-1.5 rounded-md transition-colors"
                                                                    onClick={() => router.push('/projects')}
                                                                >
                                                                    Criar
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>

            {/* Invite Modal */}
            {showInviteModal && (
                <Modal title="Adicionar / Convidar Aluno" onClose={() => setShowInviteModal(false)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setShowInviteModal(false)} disabled={inviting}>Cancelar</button>
                            <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4 flex items-center gap-2" form="invite-form" type="submit" disabled={inviting}>
                                {inviting ? 'Enviando...' : <><Send size={16} /> Enviar Convite</>}
                            </button>
                        </div>
                    }
                >
                    <form id="invite-form" onSubmit={handleInviteNewStudent} className="flex flex-col gap-4 mt-6">
                        <p className="text-sm text-slate-500 font-roboto leading-relaxed">
                            Digite o e-mail do seu aluno. Se ele já tiver uma conta, será vinculado a você na hora. Caso contrário, um convite ficará pendente até ele criar a conta.
                        </p>
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">E-mail do Aluno *</label>
                            <input
                                className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white"
                                type="email"
                                placeholder="exemplo@email.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                required
                            />
                        </div>
                    </form>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
