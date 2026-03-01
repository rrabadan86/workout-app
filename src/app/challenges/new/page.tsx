'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Trophy, Calendar, Dumbbell, Globe, Users, Check, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { uid } from '@/lib/utils';
import Toast from '@/components/Toast';

export default function NewChallengeWizard() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, refresh } = useStore();

    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Step 1: Basic Info
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [emoji, setEmoji] = useState('🏆');

    // Step 2: Dates & Meta
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [weeklyFrequency, setWeeklyFrequency] = useState(3);

    // Step 3: Check-in Rules
    const [checkinType, setCheckinType] = useState<'any_workout' | 'specific_workout'>('any_workout');
    const [specificWorkoutId, setSpecificWorkoutId] = useState('');

    // Step 4: Visibility & Entry
    const [visibility, setVisibility] = useState<'public' | 'private'>('public');
    const [joinRule, setJoinRule] = useState<'anyone' | 'followers_only' | 'invite_only'>('anyone');
    const [inviteEmails, setInviteEmails] = useState('');

    // Step 5: Limits
    const [maxParticipants, setMaxParticipants] = useState<number | ''>('');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    if (!ready || !userId) return null;

    const totalSteps = 5;

    async function handleFinish() {
        if (!title.trim() || !startDate || !endDate) {
            setToast({ msg: 'Preencha os campos obrigatórios.', type: 'error' });
            return;
        }
        if (startDate > endDate) {
            setToast({ msg: 'A data de fim deve ser após a data de início.', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const newChallengeId = uid();

            // 1. Create Challenge
            const { error: cErr } = await supabase.from('challenges').insert({
                id: newChallengeId,
                title: title.trim(),
                description: description.trim(),
                emoji,
                start_date: startDate,
                end_date: endDate,
                weekly_frequency: weeklyFrequency,
                checkin_type: checkinType,
                specific_workout_id: checkinType === 'specific_workout' ? (specificWorkoutId || null) : null,
                visibility,
                join_rule: joinRule,
                max_participants: (maxParticipants === '' || isNaN(Number(maxParticipants))) ? null : Number(maxParticipants),
                created_by: userId,
                status: 'active'
            });
            if (cErr) throw cErr;

            // 2. Add Owner as Participant
            const { error: pErr } = await supabase.from('challenge_participants').insert({
                id: uid(),
                challenge_id: newChallengeId,
                user_id: userId,
                role: 'owner'
            });
            if (pErr) throw pErr;

            // 3. Process Invites if any
            if (joinRule === 'invite_only' && inviteEmails.trim()) {
                const emails = inviteEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
                const inviteData = emails.map(email => ({
                    id: uid(),
                    challenge_id: newChallengeId,
                    email,
                    status: 'pending'
                }));
                if (inviteData.length > 0) {
                    const { error: iErr } = await supabase.from('challenge_invites').insert(inviteData);
                    if (iErr) throw iErr;
                }
            }

            // 4. Refresh & Redirect
            await refresh();
            setToast({ msg: 'Desafio criado com sucesso! 🏆', type: 'success' });
            setTimeout(() => {
                router.push(`/challenges/${newChallengeId}`);
            }, 1000);

        } catch (err: any) {
            console.error(err);
            setToast({ msg: err.message || 'Erro ao criar o desafio.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    // Validation for Next step
    function canProceed() {
        if (step === 1) return title.trim().length > 0;
        if (step === 2) return startDate && endDate && startDate <= endDate && weeklyFrequency >= 1 && weeklyFrequency <= 7;
        if (step === 3) return checkinType === 'any_workout' || (checkinType === 'specific_workout' && specificWorkoutId);
        if (step === 4) return true; // Add emails if needed but wait it's string
        return true;
    }

    const availableWorkouts = store.workouts.filter(w => w.ownerId === userId);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

            <main className="flex-1 w-full max-w-[800px] mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-12">

                {/* Header & Back */}
                <div className="mb-8">
                    <button onClick={() => router.push('/challenges')} className="btn bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 text-sm mb-6">
                        <ChevronLeft size={16} className="-ml-1" /> Cancelar
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="size-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Trophy size={20} />
                        </div>
                        <h1 className="text-2xl font-extrabold font-inter text-slate-900 tracking-tight">Criar Desafio</h1>
                    </div>
                    <p className="text-slate-500 text-sm">Passo {step} de {totalSteps}</p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden flex">
                        <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
                    </div>
                </div>

                {/* Form Container */}
                <div className="bg-white rounded-2xl card-depth p-6 sm:p-8 border border-transparent shadow-sm">
                    {/* STEP 1 */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Trophy size={18} className="text-amber-500" /> Informações Básicas</h2>

                            <div className="flex flex-col gap-5">
                                <div className="field">
                                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Emoji / Ícone</label>
                                    <div className="flex gap-2 text-2xl">
                                        {['🏆', '🔥', '💪', '🚴', '🏃', '🏋️', '🧘'].map(e => (
                                            <button key={e} onClick={() => setEmoji(e)} className={`size-12 rounded-xl border-2 flex items-center justify-center transition-all ${emoji === e ? 'border-amber-500 bg-amber-50 scale-110' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                                                {e}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="field">
                                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Título do Desafio *</label>
                                    <input className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white" placeholder="Ex: Projeto Verão 90 Dias" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
                                </div>
                                <div className="field">
                                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Descrição</label>
                                    <textarea className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white min-h-[100px] resize-y" placeholder="Qual o objetivo principal?" value={description} onChange={(e) => setDescription(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Calendar size={18} className="text-amber-500" /> Datas e Meta</h2>

                            <div className="flex flex-col gap-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="field">
                                        <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Início *</label>
                                        <input type="date" className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                    </div>
                                    <div className="field">
                                        <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Fim *</label>
                                        <input type="date" className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                    </div>
                                </div>
                                <div className="field mt-4 border-t border-slate-100 pt-6">
                                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Frequência Semanal (Meta) *</label>
                                    <p className="text-xs text-slate-500 mb-4">Quantos treinos por semana os participantes precisam fazer para manter o "Fire" (Streak)?</p>

                                    <div className="flex items-center gap-4">
                                        <input type="range" min="1" max="7" value={weeklyFrequency} onChange={(e) => setWeeklyFrequency(parseInt(e.target.value))} className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                        <span className="text-xl font-bold text-slate-800 w-16 text-center bg-slate-100 py-1 rounded-lg">{weeklyFrequency}x</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 px-1">
                                        <span>1x</span><span>7x</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Dumbbell size={18} className="text-amber-500" /> Regra de Check-in</h2>

                            <div className="flex flex-col gap-4">
                                <p className="text-sm text-slate-500 mb-2">O que conta como um check-in válido neste desafio?</p>

                                <label className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${checkinType === 'any_workout' ? 'border-amber-500 bg-amber-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                    <input type="radio" name="checkin_type" value="any_workout" checked={checkinType === 'any_workout'} onChange={() => setCheckinType('any_workout')} className="mt-1 w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500 accent-amber-500" />
                                    <div>
                                        <h4 className="font-bold text-slate-800">Qualquer Treino Finalizado</h4>
                                        <p className="text-xs text-slate-500 mt-1">Sempre que o usuário finalizar qualquqer treino no app, ele ganha um check-in automaticamente.</p>
                                    </div>
                                </label>

                                <label className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${checkinType === 'specific_workout' ? 'border-amber-500 bg-amber-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                    <input type="radio" name="checkin_type" value="specific_workout" checked={checkinType === 'specific_workout'} onChange={() => { setCheckinType('specific_workout'); setSpecificWorkoutId(''); }} className="mt-1 w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500 accent-amber-500" />
                                    <div className="w-full">
                                        <h4 className="font-bold text-slate-800">Um Treino Específico</h4>
                                        <p className="text-xs text-slate-500 mt-1">Apenas um treino criado por você conta. Ideal para desafios padronizados (ex: Desafio 100 Flexões).</p>

                                        {checkinType === 'specific_workout' && (
                                            <div className="mt-4 w-full">
                                                {availableWorkouts.length === 0 ? (
                                                    <p className="text-xs text-rose-500 font-bold bg-white p-2 rounded">Você não tem nenhum treino criado. Crie um no menu Treinos primeiro.</p>
                                                ) : (
                                                    <select className="bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 w-full outline-none" value={specificWorkoutId} onChange={(e) => setSpecificWorkoutId(e.target.value)}>
                                                        <option value="" disabled>Selecione um treino...</option>
                                                        {availableWorkouts.map(w => (
                                                            <option key={w.id} value={w.id}>{w.name} (do proj. {store.projects.find(p => p.id === w.projectId)?.name})</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* STEP 4 */}
                    {step === 4 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Globe size={18} className="text-amber-500" /> Privacidade e Entrada</h2>

                            <div className="flex flex-col gap-6">
                                <div className="field">
                                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-2">Visibilidade</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'public' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}>
                                            <Globe size={24} />
                                            <span className="font-bold text-sm text-slate-800">Público</span>
                                            <input type="radio" className="hidden" checked={visibility === 'public'} onChange={() => setVisibility('public')} />
                                        </label>
                                        <label className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${visibility === 'private' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}>
                                            <Lock size={24} />
                                            <span className="font-bold text-sm text-slate-800">Privado</span>
                                            <input type="radio" className="hidden" checked={visibility === 'private'} onChange={() => setVisibility('private')} />
                                        </label>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-2 text-center">
                                        {visibility === 'public' ? 'Qualquer um pode ver este desafio no feed e no seu perfil.' : 'Oculto do público. Apenas convidados ou participantes podem ver.'}
                                    </p>
                                </div>

                                <div className="field border-t border-slate-100 pt-6">
                                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-2">Quem pode participar?</label>
                                    <select className="bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none" value={joinRule} onChange={(e) => setJoinRule(e.target.value as any)}>
                                        <option value="anyone">Qualquer pessoa pode entrar livremente</option>
                                        <option value="followers_only">Apenas pessoas que eu sigo ou me seguem</option>
                                        <option value="invite_only">Apenas convidados por e-mail ou link fechado</option>
                                    </select>
                                </div>

                                {joinRule === 'invite_only' && (
                                    <div className="field">
                                        <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Convidar por E-mail (Separados por vírgula)</label>
                                        <textarea className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white min-h-[80px]" placeholder="joao@email.com, maria@email.com" value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} />
                                        <p className="text-[10px] text-slate-500 mt-1">Eles receberão um convite no app ou por e-mail (se não tiverem conta).</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 5 */}
                    {step === 5 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Users size={18} className="text-amber-500" /> Limites</h2>

                            <div className="flex flex-col gap-6">
                                <div className="field">
                                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Máximo de Participantes</label>
                                    <input
                                        type="number"
                                        min="2"
                                        className="bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none"
                                        placeholder="Deixe em branco para ilimitado"
                                        value={maxParticipants}
                                        onChange={(e) => setMaxParticipants(e.target.value ? parseInt(e.target.value) : '')}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Dica: Grupos menores (até 20) costumam ter mais engajamento e competição saudável.</p>
                                </div>

                                <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                                    <div className="size-16 bg-white border-4 border-amber-100 rounded-full flex items-center justify-center text-2xl mb-4 shadow-sm">{emoji}</div>
                                    <h3 className="font-bold text-slate-800 text-lg">{title || 'Seu Desafio'}</h3>
                                    <p className="text-sm text-slate-500 mt-1 max-w-[250px]">
                                        Tudo pronto! Seu desafio será criado e você poderá compartilhar o link com a galera.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Controls Footer */}
                    <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
                        <button
                            className={`btn px-5 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 ${step === 1 ? 'invisible' : ''}`}
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            disabled={saving}
                        >
                            <ChevronLeft size={16} className="-ml-1" /> Anterior
                        </button>

                        {step < totalSteps ? (
                            <button
                                className="btn px-6 py-3 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setStep(s => Math.min(totalSteps, s + 1))}
                                disabled={!canProceed()}
                            >
                                Próximo <ChevronRight size={16} className="-mr-1" />
                            </button>
                        ) : (
                            <button
                                className="btn px-6 py-3 bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed border-none"
                                onClick={handleFinish}
                                disabled={saving}
                            >
                                {saving ? 'Criando...' : <><Check size={16} className="-ml-1" /> Finalizar Desafio</>}
                            </button>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
