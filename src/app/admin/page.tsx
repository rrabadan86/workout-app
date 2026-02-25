'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Trash2, KeyRound, Users, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const SUPERVISOR_EMAIL = 'rodrigorabadan@gmail.com';

export default function AdminPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, refresh } = useStore();
    const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
    const [resetTarget, setResetTarget] = useState<Profile | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);
    const [migrating, setMigrating] = useState(false);

    const currentUser = store.profiles.find((u) => u.id === userId);
    const isSupervisor = currentUser?.email === SUPERVISOR_EMAIL;

    useEffect(() => {
        if (!ready) return;
        if (!userId) { router.replace('/'); return; }
        if (currentUser && !isSupervisor) { router.replace('/dashboard'); }
    }, [ready, userId, currentUser, isSupervisor, router]);

    if (!ready || !userId || !isSupervisor) return null;

    const otherUsers = store.profiles.filter((u) => u.email !== SUPERVISOR_EMAIL);

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);
        // Delete user's logs, workouts owned by user, and the user record
        await supabase.from('workout_logs').delete().eq('"userId"', deleteTarget.id);
        await supabase.from('workouts').delete().eq('"ownerId"', deleteTarget.id);
        await supabase.from('exercises').delete().eq('"createdBy"', deleteTarget.id);
        await supabase.from('profiles').delete().eq('id', deleteTarget.id);
        setSaving(false);
        setDeleteTarget(null);
        setToast({ msg: `Usuário ${deleteTarget.name} excluído.`, type: 'success' });
        await refresh();
    }

    async function confirmResetPassword() {
        if (!resetTarget || !newPassword.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('profiles').update({ password: newPassword.trim() }).eq('id', resetTarget.id);
        setSaving(false);
        if (error) { setToast({ msg: 'Erro ao redefinir senha.', type: 'error' }); return; }
        setResetTarget(null);
        setNewPassword('');
        setToast({ msg: `Senha de ${resetTarget.name} redefinida com sucesso.`, type: 'success' });
    }

    async function migrateOldUserData() {
        if (!confirm('Esta ação irá procurar na tabela antiga "users" por usuários com o mesmo e-mail dos novos "profiles" cadastrados via Google, e vai transferir os treinos (workouts) e exercícios (exercises) do ID antigo para o novo ID do Google. Tem certeza?')) return;

        setMigrating(true);
        try {
            // 1. Fetch all old users
            const { data: oldUsers, error: oldErrs } = await supabase.from('users').select('*');
            if (oldErrs) throw new Error('Falha ao ler tabela antiga de users. A tabela ainda existe?');

            // 2. Fetch all new profiles
            const { data: newProfiles, error: newErrs } = await supabase.from('profiles').select('*');
            if (newErrs) throw new Error('Falha ao ler profiles novos.');

            if (!oldUsers || !newProfiles) return;
            let migratedCount = 0;

            // 3. Match and transfer
            for (const profile of newProfiles) {
                const oldUser = oldUsers.find(u => u.email.toLowerCase() === profile.email.toLowerCase() && u.id !== profile.id);
                if (oldUser) {
                    // Try to find if user already has workouts
                    const { data: userWorkouts } = await supabase.from('workouts').select('id, projectId').eq('ownerId', oldUser.id);

                    if (userWorkouts && userWorkouts.length > 0) {
                        // Check if these workouts already have a project. In legacy, they probably don't.
                        const orphanWorkouts = userWorkouts.filter(w => !w.projectId || w.projectId.trim() === '');

                        let fallbackProjectId = null;
                        if (orphanWorkouts.length > 0) {
                            // Create a dummy project to hold old isolated sessions since the new UI needs a Project
                            const { data: newProject } = await supabase.from('projects').insert({
                                name: 'Histórico Antigo',
                                description: 'Sessões resgatadas do banco de dados antigo antes da versão de Projetos.',
                                ownerId: profile.id,
                                startDate: new Date().toISOString(),
                                // give it 10 years end date so it doesn't expire
                                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString(),
                                status: 'active',
                                sharedWith: []
                            }).select().single();

                            if (newProject) fallbackProjectId = newProject.id;
                        }

                        // Transfer workouts
                        if (fallbackProjectId) {
                            const orphanIds = orphanWorkouts.map(w => w.id);
                            const validIds = userWorkouts.filter(w => w.projectId && w.projectId.trim() !== '').map(w => w.id);

                            if (orphanIds.length > 0) {
                                await supabase.from('workouts').update({ ownerId: profile.id, projectId: fallbackProjectId }).in('id', orphanIds);
                            }
                            if (validIds.length > 0) {
                                await supabase.from('workouts').update({ ownerId: profile.id }).in('id', validIds);
                            }
                        } else {
                            await supabase.from('workouts').update({ ownerId: profile.id }).eq('ownerId', oldUser.id);
                        }
                    }

                    // Transfer exercises
                    await supabase.from('exercises').update({ createdBy: profile.id }).eq('createdBy', oldUser.id);
                    // Transfer logs
                    await supabase.from('workout_logs').update({ userId: profile.id }).eq('userId', oldUser.id);

                    // Finally delete old legacy user row to prevent infinite remigrations
                    await supabase.from('users').delete().eq('id', oldUser.id);

                    migratedCount++;
                }
            }

            setToast({ msg: `Transferidos dados de ${migratedCount} usuário(s) do sistema antigo para a conta Google.`, type: 'success' });
        } catch (err: any) {
            setToast({ msg: err.message || 'Erro ao migrar dados.', type: 'error' });
        } finally {
            setMigrating(false);
            await refresh();
        }
    }

    async function repairOrphanWorkouts() {
        if (!confirm('Isso vai agrupar todos os treinos que não estão dentro de nenhum Projeto em um novo "Histórico Antigo". Confirmar?')) return;
        setMigrating(true);
        try {
            // Fetch all workouts first
            const { data: allWorkouts, error } = await supabase.from('workouts').select('id, ownerId, projectId');
            if (error) throw new Error('Erro ao buscar todos os treinos.');

            const orphans = allWorkouts?.filter(w => !w.projectId || w.projectId.trim() === '') || [];
            if (orphans.length === 0) {
                setToast({ msg: 'Nenhum treino órfão encontrado no sistema geral.', type: 'success' });
                return;
            }

            // Group by owner
            const ownerIds = Array.from(new Set(orphans.map(o => o.ownerId)));
            let fixedCount = 0;

            for (const ownerId of ownerIds) {
                const userOrphans = orphans.filter(o => o.ownerId === ownerId);
                const orphanIds = userOrphans.map(o => o.id);

                if (orphanIds.length > 0) {
                    // Create dummy project for this owner
                    const { data: newProject } = await supabase.from('projects').insert({
                        name: 'Histórico Antigo',
                        description: 'Sessões resgatadas do banco de dados antigo antes da versão de Projetos.',
                        ownerId: ownerId,
                        startDate: new Date().toISOString(),
                        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString(),
                        status: 'active',
                        sharedWith: []
                    }).select().single();

                    if (newProject) {
                        const { error: updErr } = await supabase.from('workouts')
                            .update({ projectId: newProject.id })
                            .in('id', orphanIds);

                        if (!updErr) fixedCount++;
                    }
                }
            }

            setToast({ msg: `${fixedCount} perfil(is) tiveram seus treinos órfãos resgatados.`, type: 'success' });
        } catch (err: any) {
            setToast({ msg: err.message || 'Erro ao reparar treinos.', type: 'error' });
        } finally {
            setMigrating(false);
            await refresh();
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
                        <div className="flex items-center gap-2 mb-2">
                            <Shield size={18} className="text-primary" />
                            <span className="text-[10px] font-bold font-montserrat tracking-widest uppercase text-primary">Supervisor</span>
                        </div>
                        <h1 className="page-title">Gerenciar Usuários</h1>
                        <p className="page-subtitle">{otherUsers.length} usuário(s) cadastrado(s)</p>
                    </div>
                    <div className="size-12 rounded-xl flex items-center justify-center bg-[#C084FC]/10 text-[#C084FC] shrink-0">
                        <Users size={24} />
                    </div>
                </div>

                {/* Database Migration Panel */}
                <div className="bg-amber-50 rounded-xl p-6 border border-amber-200 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="font-extrabold text-amber-900 mb-1 font-inter flex items-center gap-2">
                            <span className="material-symbols-outlined font-bold">database</span>
                            Migração de Dados (Contas Antigas)
                        </h3>
                        <p className="text-sm font-roboto text-amber-800">Se alguns treinos antigos sumiram após o login pelo Google, clique ao lado para transferir os registros do banco antigo (offline) para o seu novo ID Google.</p>
                    </div>
                    <div className="flex flex-col gap-3 shrink-0">
                        <button
                            className="btn bg-amber-600 text-white hover:bg-amber-700 shadow-md disabled:opacity-50 text-sm"
                            onClick={migrateOldUserData}
                            disabled={migrating}
                        >
                            {migrating ? 'Aguarde...' : 'Migrar Contas Antigas'}
                        </button>
                        <button
                            className="btn bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 shadow-sm disabled:opacity-50 text-sm"
                            onClick={repairOrphanWorkouts}
                            disabled={migrating}
                            title="Use se você já migrou mas os treinos continuam desaparecidos."
                        >
                            Reparar Treinos Sumidos
                        </button>
                    </div>
                </div>

                {otherUsers.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                        <Users size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold font-roboto">Nenhum usuário cadastrado ainda.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 mb-10">
                        {otherUsers.map((u) => {
                            const userWorkouts = store.workouts.filter((w) => w.ownerId === u.id).length;
                            const userLogs = store.logs.filter((l) => l.userId === u.id).length;
                            return (
                                <div key={u.id} className="bg-white rounded-xl card-depth p-5 md:p-6 border border-slate-100 flex flex-col sm:flex-row gap-4 sm:items-center">
                                    <div className="flex gap-4 items-center flex-1">
                                        <div className="size-10 md:size-12 rounded-xl flex items-center justify-center bg-slate-100 font-bold font-inter text-slate-500 text-lg shrink-0">
                                            {u.name[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold font-inter text-slate-900">{u.name}</div>
                                            <div className="text-sm font-roboto text-slate-500">{u.email}</div>
                                            <div className="flex gap-3 mt-1 text-xs font-roboto text-slate-400">
                                                <span>🏋️ {userWorkouts} treino(s)</span>
                                                <span>📊 {userLogs} registro(s)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0 self-end sm:self-center">
                                        <button
                                            className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 text-sm"
                                            onClick={() => { setResetTarget(u); setNewPassword(''); }}
                                            title="Redefinir senha"
                                        >
                                            <KeyRound size={14} /> Senha
                                        </button>
                                        <button
                                            className="btn bg-rose-50 text-rose-500 hover:bg-rose-100 px-4 py-2 text-sm"
                                            onClick={() => setDeleteTarget(u)}
                                            title="Excluir usuário"
                                        >
                                            <Trash2 size={14} /> Excluir
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Usuário" onClose={() => setDeleteTarget(null)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                            <button className="btn bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/30 px-6 py-4" onClick={confirmDelete} disabled={saving}>
                                {saving ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    }
                >
                    <div className="flex flex-col gap-3">
                        <p className="text-slate-600 font-roboto text-sm">
                            Tem certeza que deseja excluir o usuário <strong className="text-slate-900">{deleteTarget.name}</strong> ({deleteTarget.email})?
                        </p>
                        <p className="text-rose-500 font-roboto text-xs font-medium px-4 py-3 bg-rose-50 rounded-xl border border-rose-100">
                            ⚠️ Todos os treinos, exercícios e registros deste usuário também serão removidos.
                        </p>
                    </div>
                </Modal>
            )}

            {/* Reset Password Modal */}
            {resetTarget && (
                <Modal title={`Redefinir senha — ${resetTarget.name}`} onClose={() => setResetTarget(null)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setResetTarget(null)}>Cancelar</button>
                            <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4" onClick={confirmResetPassword} disabled={saving || !newPassword.trim()}>
                                {saving ? 'Salvando...' : 'Confirmar'}
                            </button>
                        </div>
                    }
                >
                    <div className="flex flex-col gap-1.5 mt-6">
                        <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Nova senha para {resetTarget.name}</label>
                        <div className="relative">
                            <input
                                className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white"
                                type="text"
                                placeholder="Digite a nova senha..."
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoFocus
                            />
                            {newPassword && (
                                <button type="button" onClick={() => setNewPassword('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <p className="text-xs font-roboto text-slate-500 mt-1">
                            O usuário deverá usar esta nova senha no próximo login.
                        </p>
                    </div>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
