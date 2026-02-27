'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Trash2, KeyRound, Users, X, Database } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { today } from '@/lib/utils';
import type { Profile } from '@/lib/types';

const SUPERVISOR_EMAIL = 'rodrigorabadan@gmail.com';

export default function AdminPage() {
    const router = useRouter();
    const { userId, userEmail, ready } = useAuth();
    const { store, loading, refresh } = useStore();
    const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
    const [resetTarget, setResetTarget] = useState<Profile | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);
    const [migrating, setMigrating] = useState(false);

    const isSupervisor = userEmail === SUPERVISOR_EMAIL;

    useEffect(() => {
        if (!ready || loading) return;
        if (!userId) { router.replace('/'); return; }
        if (!isSupervisor) { router.replace('/dashboard'); }
    }, [ready, loading, userId, isSupervisor, router]);

    if (!ready || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium font-roboto">Carregando dados...</p>
                </div>
            </div>
        );
    }

    if (!userId || !isSupervisor) return null;

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
        if (!confirm('Esta ação irá procurar por registros vinculados ao seu e-mail em tabelas antigas ou duplicadas e transferir tudo para sua conta Google atual. Tem certeza?')) return;

        setMigrating(true);
        try {
            // 1. Fetch current profile
            const currentProfile = store.profiles.find(u => u.id === userId);
            if (!currentProfile) throw new Error('Seu perfil atual não foi encontrado na lista.');

            let migratedCount = 0;

            // 2. Fetch all old users (legacy table)
            const { data: oldUsers } = await supabase.from('users').select('*');
            if (oldUsers) {
                const legacyMatch = oldUsers.find(u => u.email.toLowerCase() === currentProfile.email.toLowerCase() && u.id !== currentProfile.id);
                if (legacyMatch) {
                    await transferData(legacyMatch.id, currentProfile.id);
                    await supabase.from('users').delete().eq('id', legacyMatch.id);
                    migratedCount++;
                }
            }

            // 3. Fetch all profiles to find duplicates (same email, different ID)
            const duplicates = store.profiles.filter(p =>
                p.email.toLowerCase() === currentProfile.email.toLowerCase() &&
                p.id !== currentProfile.id
            );

            for (const dupe of duplicates) {
                await transferData(dupe.id, currentProfile.id);
                // After transferring, we should ideally delete the duplicate or mark it
                // For now, just transferring data is enough to make it show up for the user
                migratedCount++;
            }

            if (migratedCount > 0) {
                setToast({ msg: `Sucesso! Registros de ${migratedCount} fonte(s) foram movidos para sua conta atual.`, type: 'success' });
            } else {
                setToast({ msg: 'Nenhum registro antigo ou duplicado encontrado para seu e-mail.', type: 'success' });
            }
        } catch (err: any) {
            setToast({ msg: err.message || 'Erro ao migrar dados.', type: 'error' });
        } finally {
            setMigrating(false);
            await refresh();
        }
    }

    async function transferData(oldId: string, newId: string) {
        // Transfer workouts
        await supabase.from('workouts').update({ ownerId: newId }).eq('ownerId', oldId);
        // Transfer exercises
        await supabase.from('exercises').update({ createdBy: newId }).eq('createdBy', oldId);
        // Transfer logs
        await supabase.from('workout_logs').update({ userId: newId }).eq('userId', oldId);
        // Transfer feed events
        await supabase.from('feed_events').update({ userId: newId }).eq('userId', oldId);
        // Transfer kudos
        await supabase.from('kudos').update({ userId: newId }).eq('userId', oldId);
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
                        description: 'Treinos resgatados do banco de dados antigo antes da versão de Projetos.',
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
        <div className="min-h-screen bg-slate-50 flex flex-col">
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
                            <Database size={18} />
                            Migração de Dados (Contas Antigas)
                        </h3>
                        <p className="text-sm font-roboto text-amber-800">Se alguns treinos antigos sumiram após o login pelo Google, clique ao lado para transferir os registros do banco antigo para o seu novo ID Google.</p>
                    </div>
                    <div className="flex flex-col gap-3 shrink-0">
                        <button className="btn bg-amber-600 text-white hover:bg-amber-700 shadow-md disabled:opacity-50 text-sm" onClick={migrateOldUserData} disabled={migrating}>
                            {migrating ? 'Aguarde...' : 'Migrar Contas Antigas'}
                        </button>
                        <button className="btn bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 shadow-sm disabled:opacity-50 text-sm" onClick={repairOrphanWorkouts} disabled={migrating} title="Use se você já migrou mas os treinos continuam desaparecidos.">
                            Reparar Treinos Sumidos
                        </button>
                    </div>
                </div>

                {/* Diagnostic Section */}
                <div className="bg-slate-900 rounded-2xl p-6 md:p-8 mb-10 text-white shadow-2xl shadow-slate-900/20 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Users size={120} />
                    </div>
                    <h3 className="text-xl font-extrabold mb-6 flex items-center gap-2">
                        <Shield className="text-primary" size={20} />
                        Diagnóstico de Eventos Recentes
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/10">
                                <tr>
                                    <th className="pb-3 px-2">Data/Hora</th>
                                    <th className="pb-3 px-2">Tipo</th>
                                    <th className="pb-3 px-2">User ID</th>
                                    <th className="pb-3 px-2">Usuário</th>
                                    <th className="pb-3 px-2">Ref</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {store.feedEvents
                                    .slice()
                                    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                                    .slice(0, 20)
                                    .map(ev => {
                                        const u = store.profiles.find(p => p.id === ev.userId);
                                        const isToday = ev.createdAt?.startsWith(today());
                                        return (
                                            <tr key={ev.id} className={isToday ? 'bg-primary/10' : ''}>
                                                <td className="py-3 px-2 font-roboto opacity-80 whitespace-nowrap">
                                                    {ev.createdAt ? new Date(ev.createdAt).toLocaleString('pt-BR') : '---'}
                                                </td>
                                                <td className="py-3 px-2 font-bold text-primary">{ev.eventType}</td>
                                                <td className="py-3 px-2 font-mono text-[10px] opacity-60">{ev.userId}</td>
                                                <td className="py-3 px-2 font-bold truncate max-w-[120px]">{u ? u.name : <span className="text-rose-500">NÃO ENCONTRADO</span>}</td>
                                                <td className="py-3 px-2 opacity-60 font-mono text-[10px]">{ev.referenceId?.substring(0, 8)}...</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-6 text-[10px] text-slate-500 font-medium">Linhas em destaque são de hoje ({today()}). Se o nome estiver em vermelho, o registro está "órfão" de perfil.</p>
                </div>

                {otherUsers.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                        <Users size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold font-roboto">Nenhum outro usuário cadastrado.</p>
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
                                        <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 text-sm" onClick={() => { setResetTarget(u); setNewPassword(''); }} title="Redefinir senha">
                                            <KeyRound size={14} /> Senha
                                        </button>
                                        <button className="btn bg-rose-50 text-rose-500 hover:bg-rose-100 px-4 py-2 text-sm" onClick={() => setDeleteTarget(u)} title="Excluir usuário">
                                            <Trash2 size={14} /> Excluir
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

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
                        <p className="text-slate-600 font-roboto text-sm">Tem certeza que deseja excluir o usuário <strong className="text-slate-900">{deleteTarget.name}</strong> ({deleteTarget.email})?</p>
                        <p className="text-rose-500 font-roboto text-xs font-medium px-4 py-3 bg-rose-50 rounded-xl border border-rose-100">
                            ⚠️ Todos os treinos, exercícios e registros deste usuário também serão removidos.
                        </p>
                    </div>
                </Modal>
            )}

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
                            <input className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 w-full outline-none transition-all focus:bg-white" type="text" placeholder="Digite a nova senha..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
                            {newPassword && <button type="button" onClick={() => setNewPassword('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><X size={14} /></button>}
                        </div>
                    </div>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </div>
    );
}
