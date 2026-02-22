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
import type { User } from '@/lib/types';

const SUPERVISOR_EMAIL = 'rodrigorabadan@gmail.com';

export default function AdminPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, refresh } = useStore();
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [resetTarget, setResetTarget] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);

    const currentUser = store.users.find((u) => u.id === userId);
    const isSupervisor = currentUser?.email === SUPERVISOR_EMAIL;

    useEffect(() => {
        if (!ready) return;
        if (!userId) { router.replace('/'); return; }
        if (currentUser && !isSupervisor) { router.replace('/dashboard'); }
    }, [ready, userId, currentUser, isSupervisor, router]);

    if (!ready || !userId || !isSupervisor) return null;

    const otherUsers = store.users.filter((u) => u.email !== SUPERVISOR_EMAIL);

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);
        // Delete user's logs, workouts owned by user, and the user record
        await supabase.from('workout_logs').delete().eq('"userId"', deleteTarget.id);
        await supabase.from('workouts').delete().eq('"ownerId"', deleteTarget.id);
        await supabase.from('exercises').delete().eq('"createdBy"', deleteTarget.id);
        await supabase.from('users').delete().eq('id', deleteTarget.id);
        setSaving(false);
        setDeleteTarget(null);
        setToast({ msg: `Usuário ${deleteTarget.name} excluído.`, type: 'success' });
        await refresh();
    }

    async function confirmResetPassword() {
        if (!resetTarget || !newPassword.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('users').update({ password: newPassword.trim() }).eq('id', resetTarget.id);
        setSaving(false);
        if (error) { setToast({ msg: 'Erro ao redefinir senha.', type: 'error' }); return; }
        setResetTarget(null);
        setNewPassword('');
        setToast({ msg: `Senha de ${resetTarget.name} redefinida com sucesso.`, type: 'success' });
    }

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header" style={{ paddingTop: 32 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <Shield size={20} color="var(--accent)" />
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Supervisor</span>
                        </div>
                        <h1 className="page-title">Gerenciar Usuários</h1>
                        <p className="page-subtitle">{otherUsers.length} usuário(s) cadastrado(s)</p>
                    </div>
                    <div className="stat-icon stat-icon-purple" style={{ width: 48, height: 48, flexShrink: 0 }}>
                        <Users size={22} />
                    </div>
                </div>

                {otherUsers.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} color="var(--text-muted)" />
                        <p>Nenhum usuário cadastrado ainda.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
                        {otherUsers.map((u) => {
                            const userWorkouts = store.workouts.filter((w) => w.ownerId === u.id).length;
                            const userLogs = store.logs.filter((l) => l.userId === u.id).length;
                            return (
                                <div key={u.id} className="item-card">
                                    <div className="avatar" style={{ width: 44, height: 44, flexShrink: 0, fontSize: '1.1rem' }}>
                                        {u.name[0].toUpperCase()}
                                    </div>
                                    <div className="item-card-info" style={{ flex: 1 }}>
                                        <div className="item-card-title">{u.name}</div>
                                        <div className="item-card-sub">{u.email}</div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                🏋️ {userWorkouts} treino(s)
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                📊 {userLogs} registro(s)
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => { setResetTarget(u); setNewPassword(''); }}
                                            title="Redefinir senha"
                                        >
                                            <KeyRound size={14} /> Senha
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
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
            </div>

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Usuário" onClose={() => setDeleteTarget(null)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={confirmDelete} disabled={saving}>
                                {saving ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </>
                    }
                >
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Tem certeza que deseja excluir o usuário <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong> ({deleteTarget.email})?
                    </p>
                    <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 10 }}>
                        ⚠️ Todos os treinos, exercícios e registros deste usuário também serão removidos.
                    </p>
                </Modal>
            )}

            {/* Reset Password Modal */}
            {resetTarget && (
                <Modal title={`Redefinir senha — ${resetTarget.name}`} onClose={() => setResetTarget(null)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setResetTarget(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={confirmResetPassword} disabled={saving || !newPassword.trim()}>
                                {saving ? 'Salvando...' : 'Confirmar'}
                            </button>
                        </>
                    }
                >
                    <div className="field">
                        <label>Nova senha para <strong>{resetTarget.name}</strong></label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input"
                                type="text"
                                placeholder="Digite a nova senha..."
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoFocus
                            />
                            {newPassword && (
                                <button type="button" onClick={() => setNewPassword('')}
                                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                            O usuário deverá usar esta nova senha no próximo login.
                        </p>
                    </div>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
