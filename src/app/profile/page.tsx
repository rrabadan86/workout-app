'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { UserCircle } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, updateProfile } = useStore();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [stateUF, setStateUF] = useState('');
    const [city, setCity] = useState('');
    const [cref, setCref] = useState('');
    const [role, setRole] = useState<'user' | 'personal'>('user');

    const [ufs, setUfs] = useState<{ id: number, sigla: string, nome: string }[]>([]);
    const [cities, setCities] = useState<{ id: number, nome: string }[]>([]);

    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const me = store.profiles.find(u => u.id === userId);

    useEffect(() => {
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    useEffect(() => {
        if (me) {
            setName(me.name || '');
            setEmail(me.email || '');
            setStateUF(me.state || '');
            setCity(me.city || '');
            setCref(me.cref || '');
            setRole(me.role);
        }
    }, [me]);

    useEffect(() => {
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then(data => setUfs(data))
            .catch(err => console.error('Erro IBGE UF', err));
    }, []);

    useEffect(() => {
        if (!stateUF) {
            setCities([]);
            return;
        }
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUF}/municipios?orderBy=nome`)
            .then(res => res.json())
            .then(data => {
                setCities(data);
                // IF the previously set city is not in the new state, clear it.
                if (me && me.city && data.find((c: any) => c.nome === me.city)) {
                    setCity(me.city);
                }
            })
            .catch(err => console.error('Erro IBGE Cidades', err));
    }, [stateUF, me]);

    if (!ready || !userId || !me) return null;

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            const updatedProfile = {
                ...me,
                name: name.trim(),
                state: stateUF,
                city: city,
                cref: role === 'personal' ? cref.trim() : me.cref
            };
            // @ts-ignore
            await updateProfile(updatedProfile);
            setToast({ msg: 'Perfil atualizado com sucesso!', type: 'success' });
        } catch (err: any) {
            console.error(err);
            setToast({ msg: 'Erro ao atualizar perfil.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[800px] mx-auto px-6 lg:px-12 py-8">
                <div className="mb-2 pt-8">
                    <button className="text-sm font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1" onClick={() => router.push('/dashboard')}>
                        ← Voltar ao Dashboard
                    </button>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold font-inter tracking-tight text-slate-900">Meu Perfil</h1>
                        <p className="text-sm font-bold font-montserrat text-slate-400 uppercase tracking-widest mt-2">Gerencie suas informações</p>
                    </div>
                    <div className="size-16 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center">
                        <UserCircle size={28} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:p-8">
                    <form onSubmit={handleSave} className="flex flex-col gap-6">
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">E-mail (Não Editável)</label>
                            <input
                                type="email"
                                disabled
                                className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-roboto text-slate-500 w-full cursor-not-allowed opacity-70"
                                value={email}
                            />
                        </div>

                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Nome Completo</label>
                            <input
                                type="text"
                                required
                                maxLength={50}
                                className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Estado</label>
                                <select
                                    required
                                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all cursor-pointer"
                                    value={stateUF}
                                    onChange={(e) => setStateUF(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {ufs.map(uf => <option key={uf.sigla} value={uf.sigla}>{uf.sigla}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Cidade</label>
                                <select
                                    required
                                    disabled={!stateUF}
                                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all cursor-pointer disabled:opacity-50"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {cities.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                                </select>
                            </div>
                        </div>

                        {role === 'personal' && (
                            <div className="field animate-in fade-in">
                                <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">CREF (Registro Profissional)</label>
                                <input
                                    type="text"
                                    required
                                    className="bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 w-full outline-none transition-all"
                                    placeholder="Ex: 000000-G/SP"
                                    value={cref}
                                    onChange={(e) => setCref(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn bg-primary text-white hover:opacity-90 py-3 px-8 shadow-md shadow-primary/20 border-0 disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar Perfil'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
