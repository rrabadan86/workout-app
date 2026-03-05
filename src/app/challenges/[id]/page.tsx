'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Trophy, Flame, ShieldAlert, Users, Calendar, Medal, CheckCircle2, MessageSquare, Share2, Cog, UserPlus, X, Trash2, Edit3 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Feed from '@/components/Feed';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { formatDate, uid, today } from '@/lib/utils';
import { evaluateBadges } from '@/lib/badges';
import type { Challenge, ChallengeParticipant, ChallengeCheckin } from '@/lib/types';

export default function ChallengeDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const { userId, ready } = useAuth();
    const { store, refresh, addChallengeParticipant, removeChallengeParticipant, deleteChallenge, updateChallenge, createNotification, toggleChallengeAdmin } = useStore();

    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
    const [checkins, setCheckins] = useState<ChallengeCheckin[]>([]);

    const [activeTab, setActiveTab] = useState<'ranking' | 'feed' | 'rules' | 'admin'>('ranking');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);

    // Check-in modal
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [checkinNote, setCheckinNote] = useState('');

    // Admin state
    const [newParticipantEmail, setNewParticipantEmail] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({ title: '', description: '', end_date: '' });

    // Admin Bulk Checkin State
    const [checkinDate, setCheckinDate] = useState(today());
    const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    // Derived state
    useEffect(() => {
        if (!store.challenges.length) return;
        const c = store.challenges.find(x => x.id === id);
        if (c) {
            setChallenge(c);
            setParticipants(store.challengeParticipants.filter(p => p.challenge_id === id));

            // ✅ FIX: Filtrar check-ins de treinos excluídos/ocultados
            // Check-ins automáticos vinculados a feed events que foram deletados ou ocultados
            // não devem ser contados no ranking, streak ou contagem total
            const activeIds = new Set(
                store.feedEvents
                    .filter(e => e.eventType.startsWith('WO_COMPLETED') && !e.eventType.startsWith('WO_COMPLETED_HIDDEN'))
                    .map(e => e.id)
            );
            const allCheckins = store.challengeCheckins.filter(ck => ck.challenge_id === id);
            setCheckins(allCheckins.filter(ck =>
                ck.checkin_type === 'manual' || !ck.feed_event_id || activeIds.has(ck.feed_event_id)
            ));
        }
    }, [store, id]);

    const myParticipant = participants.find(p => p.user_id === userId);
    const role = myParticipant?.role || (challenge?.created_by === userId ? 'owner' : null);
    const isOwner = role === 'owner';
    const isAdmin = role === 'admin' || isOwner;
    const isParticipant = !!myParticipant;

    const todayStr = today();
    // Only count feed events that are active (not deleted) AND not hidden
    const activeFeedEventIds = new Set(
        store.feedEvents
            .filter(e => e.eventType.startsWith('WO_COMPLETED') && !e.eventType.startsWith('WO_COMPLETED_HIDDEN'))
            .map(e => e.id)
    );
    const hasCheckedInToday = checkins.some(ck =>
        ck.user_id === userId &&
        ck.checkin_date === todayStr &&
        (ck.checkin_type === 'manual' || ck.checkin_type === 'auto' || (ck.feed_event_id && activeFeedEventIds.has(ck.feed_event_id))));

    const isActive = challenge?.status === 'active' && challenge?.start_date <= todayStr && challenge?.end_date >= todayStr;

    // A ref to prevent React Strict Mode from firing sync twice simultaneously
    const syncingRef = useRef(false);

    // --- Retroactive / Auto Check-in Sync ---
    useEffect(() => {
        if (!challenge || !isParticipant || !isActive || hasCheckedInToday || !userId || syncingRef.current) return;

        const syncCheckin = async () => {
            syncingRef.current = true;
            try {
                const todayLogs = store.logs.filter(l => l.userId === userId && l.date === todayStr);
                if (todayLogs.length === 0) return;

                let hasValidWorkoutToday = false;
                let validWorkoutId = '';

                if (!challenge) return;

                if (challenge.checkin_type === 'any_workout') {
                    const todayWorkoutEvents = store.feedEvents.filter(e =>
                        e.userId === userId &&
                        e.eventType.startsWith('WO_COMPLETED') &&
                        new Date(e.createdAt).toDateString() === new Date().toDateString()
                    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                    if (todayWorkoutEvents.length > 0) {
                        hasValidWorkoutToday = true;
                        validWorkoutId = todayWorkoutEvents[0].referenceId;
                    } else if (todayLogs.length > 0) {
                        hasValidWorkoutToday = true;
                        validWorkoutId = todayLogs[0].workoutId;
                    }
                } else if (challenge.checkin_type === 'specific_workout') {
                    const specificEvent = store.feedEvents.find(e => {
                        if (e.userId !== userId || e.referenceId !== challenge.specific_workout_id || !e.eventType.startsWith('WO_COMPLETED')) return false;
                        const eDateStr = `${new Date(e.createdAt).getFullYear()}-${String(new Date(e.createdAt).getMonth() + 1).padStart(2, '0')}-${String(new Date(e.createdAt).getDate()).padStart(2, '0')}`;
                        return eDateStr === todayStr;
                    });

                    if (specificEvent) {
                        hasValidWorkoutToday = true;
                        validWorkoutId = specificEvent.referenceId;
                    }
                }

                if (hasValidWorkoutToday) {
                    console.log('[Challenge Sync] User has a valid workout today. Performing retroactive check-in for challenge:', challenge.id);

                    const workoutFeedEvent = store.feedEvents.find(e => {
                        if (e.userId !== userId || e.referenceId !== validWorkoutId || !e.eventType.startsWith('WO_COMPLETED')) return false;
                        const eDateStr = `${new Date(e.createdAt).getFullYear()}-${String(new Date(e.createdAt).getMonth() + 1).padStart(2, '0')}-${String(new Date(e.createdAt).getDate()).padStart(2, '0')}`;
                        return eDateStr === todayStr;
                    });

                    if (!workoutFeedEvent) {
                        console.log('[Challenge Sync] No feed event found for today. Aborting retroactive check-in.');
                        return;
                    }

                    const newCheckin = {
                        id: uid(),
                        challenge_id: challenge.id,
                        user_id: userId,
                        checkin_date: todayStr,
                        checkin_type: 'auto' as const,
                        workout_id: validWorkoutId,
                        feed_event_id: workoutFeedEvent.id
                    };

                    const { error } = await supabase.from('challenge_checkins').insert(newCheckin);
                    if (error && error.code !== '23505') throw error;

                    const updatedCheckins = [...store.challengeCheckins, newCheckin as any];
                    await evaluateBadges(userId, challenge.id, updatedCheckins, store.challengeBadges);

                    await refresh();
                }
            } catch (err) {
                console.error('[Challenge Sync] Error during retroactive auto check-in:', err);
            } finally {
                syncingRef.current = false;
            }
        };

        syncCheckin();
    }, [challenge, isParticipant, isActive, hasCheckedInToday, store.logs, userId, todayStr, store.challengeCheckins, store.challengeBadges, refresh]);

    // Challenge Finalization Logic (Auto-award completion badges)
    const finalizationRef = useRef(false);
    useEffect(() => {
        const finalizeChallenge = async () => {
            if (!challenge || !participants.length || finalizationRef.current) return;
            if (challenge.end_date >= todayStr) return;

            const hasFinalized = store.challengeBadges.some(b => b.challenge_id === challenge.id && b.badge_type === 'challenge_completed');
            if (hasFinalized) return;

            finalizationRef.current = true;
            console.log('[Challenge Finalization] Evaluating end-of-challenge badges for:', challenge.id);

            try {
                const finalLeaderboard = participants.map(p => {
                    const userCheckins = checkins.filter(ck => ck.user_id === p.user_id).length;
                    return { ...p, score: userCheckins };
                }).sort((a, b) => b.score - a.score);

                const newBadges: any[] = [];
                const now = new Date().toISOString();

                finalLeaderboard.forEach((p, index) => {
                    if (p.score === 0) return;

                    newBadges.push({
                        id: uid(),
                        challenge_id: challenge.id,
                        user_id: p.user_id,
                        badge_type: 'challenge_completed',
                        earned_at: now
                    });

                    if (index === 0) {
                        newBadges.push({ id: uid(), challenge_id: challenge.id, user_id: p.user_id, badge_type: 'top_1_challenge', earned_at: now });
                    } else if (index === 1) {
                        newBadges.push({ id: uid(), challenge_id: challenge.id, user_id: p.user_id, badge_type: 'top_2_challenge', earned_at: now });
                    } else if (index === 2) {
                        newBadges.push({ id: uid(), challenge_id: challenge.id, user_id: p.user_id, badge_type: 'top_3_challenge', earned_at: now });
                    }
                });

                if (newBadges.length > 0) {
                    const { error } = await supabase.from('challenge_badges').insert(newBadges);
                    if (error) throw error;
                    await refresh();
                }

            } catch (err) {
                console.error('[Challenge Finalization] Error during badge distribution:', err);
            }
        };

        finalizeChallenge();
    }, [challenge, participants, checkins, store.challengeBadges, todayStr, refresh]);

    // Time-based alerts: start day and 3 days before end
    const alertSentRef = useRef(false);
    useEffect(() => {
        if (!challenge || !participants.length || alertSentRef.current) return;
        alertSentRef.current = true;

        const daysToEnd = Math.ceil((new Date(challenge.end_date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
        const isStartDay = challenge.start_date === todayStr;
        const is3DaysLeft = daysToEnd === 3;

        if (!isStartDay && !is3DaysLeft) return;

        participants.forEach(p => {
            const profile = store.profiles.find(u => u.id === p.user_id);
            if (!profile) return;
            const wantsAlerts = profile.notification_prefs?.challenge_alerts !== false;
            if (!wantsAlerts) return;

            const alreadySent = store.notifications.some(n =>
                n.user_id === p.user_id &&
                n.reference_id === challenge.id &&
                n.type === 'challenge_alert' &&
                n.created_at.slice(0, 10) === todayStr
            );
            if (alreadySent) return;

            const notifData = isStartDay
                ? { title: '🏁 Desafio Começou!', message: `"${challenge.title}" começou hoje! Faça seu primeiro check-in.` }
                : { title: '⏰ Faltam 3 dias!', message: `"${challenge.title}" termina em 3 dias. Não perca o prazo!` };

            createNotification({
                id: uid(),
                user_id: p.user_id,
                type: 'challenge_alert',
                reference_id: challenge.id,
                ...notifData
            }).catch(console.error);
        });
    }, [challenge, participants, store.profiles, store.notifications, todayStr, createNotification]);

    if (!ready || !userId || !challenge) return null;

    async function handleJoin() {
        setSaving(true);
        try {
            if (challenge!.max_participants && participants.length >= challenge!.max_participants) {
                throw new Error('O desafio já está lotado!');
            }

            const { error } = await supabase.from('challenge_participants').insert({
                id: uid(),
                challenge_id: challenge!.id,
                user_id: userId,
                role: 'participant'
            });
            if (error) throw error;

            await refresh();
            setToast({ msg: 'Você entrou no desafio! 🔥', type: 'success' });
        } catch (err: any) {
            setToast({ msg: err.message || 'Erro ao entrar no desafio.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function handleManualCheckin(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            // Se for Admin e estiver no modo de checkin múltiplo/retroativo:
            if (isAdmin) {
                if (selectedParticipants.size === 0) throw new Error('Selecione pelo menos um participante.');
                if (!checkinDate || checkinDate < challenge!.start_date) throw new Error(`A data do check-in não pode ser anterior a ${formatDate(challenge!.start_date)}.`);
                if (checkinDate > todayStr) throw new Error('A data do check-in não pode estar no futuro.');

                const newCheckinsToInsert: ChallengeCheckin[] = [];
                let skippedCount = 0;

                for (const pid of Array.from(selectedParticipants)) {
                    // Pre-check if this user already has a check-in for this challenge on this date
                    const alreadyCheckedIn = store.challengeCheckins.some(ck => ck.challenge_id === challenge!.id && ck.user_id === pid && ck.checkin_date === checkinDate);
                    if (alreadyCheckedIn) {
                        skippedCount++;
                        continue; // Skip this user
                    }

                    // Decide whether we broadcast on public challenges for each user
                    // Em bulk inserts a gente não costuma flodar a feed, mas vamos deixar como manual simples pra garantir que não quebra a exp (se não public, feedEvent=null)
                    let feedEventId: string | null = null;
                    if (challenge?.visibility === 'public') {
                        feedEventId = uid();
                        // Aqui otimizaríamos insertMany, mas para respeitar a base logada a nível componente é o viável no tempo
                        await supabase.from('feed_events').insert({
                            id: feedEventId,
                            userId: pid,
                            eventType: `CHALLENGE_CHECKIN|${challenge.title}`,
                            referenceId: challenge.id,
                            createdAt: new Date().toISOString()
                        });
                    }

                    newCheckinsToInsert.push({
                        id: uid(),
                        challenge_id: challenge!.id,
                        user_id: pid,
                        checkin_date: checkinDate,
                        checkin_type: 'manual' as const,
                        evidence_note: checkinNote.trim() || null,
                        feed_event_id: feedEventId,
                        created_at: new Date().toISOString()
                    } as ChallengeCheckin);
                }

                if (newCheckinsToInsert.length === 0) {
                    throw new Error(skippedCount > 0 ? `Todos os ${skippedCount} usuários selecionados já possuem check-in nesta data.` : 'Nenhum check-in válido para lançar.');
                }

                const { error } = await supabase.from('challenge_checkins').insert(newCheckinsToInsert);
                if (error) {
                    if (error.code === '23505') { // postgres unique_violation code
                        throw new Error('Alguns destes usuários já possuem check-in nesta data.');
                    }
                    throw error;
                }

                const updatedCheckins = [...store.challengeCheckins, ...newCheckinsToInsert];

                // Recalcular badges para todos os usuários atingidos
                for (const pid of Array.from(selectedParticipants)) {
                    await evaluateBadges(pid, challenge!.id, updatedCheckins, store.challengeBadges);
                }

                await refresh();
                setShowCheckinModal(false);
                setCheckinNote('');
                setSelectedParticipants(new Set());
                setCheckinDate(todayStr);

                const msgSuffix = skippedCount > 0 ? ` (${skippedCount} ignorados pois já tinham check-in na data)` : '';
                setToast({ msg: `${newCheckinsToInsert.length} check-in(s) registrado(s) com sucesso!${msgSuffix}`, type: 'success' });
                return;
            }

            // -------------- FLUXO NORMAL DO USUÁRIO --------------
            let feedEventId: string | null = null;
            let newCheckin: any = null;

            try {
                if (challenge?.visibility === 'public') {
                    feedEventId = uid();
                    const { error: feErr } = await supabase.from('feed_events').insert({
                        id: feedEventId,
                        userId,
                        eventType: `CHALLENGE_CHECKIN|${challenge.title}`,
                        referenceId: challenge.id,
                        createdAt: new Date().toISOString()
                    });
                    if (feErr) throw feErr;
                }

                newCheckin = {
                    id: uid(),
                    challenge_id: challenge!.id,
                    user_id: userId,
                    checkin_date: todayStr, // Usuário comum sempre faz pra "hoje"
                    checkin_type: 'manual' as const,
                    evidence_note: checkinNote.trim() || null,
                    feed_event_id: feedEventId
                };
                const { error } = await supabase.from('challenge_checkins').insert(newCheckin);
                if (error) throw error;
            } catch (err) {
                if (feedEventId) {
                    await supabase.from('feed_events').delete().eq('id', feedEventId);
                }
                throw err;
            }

            const rankSnapshot = (ckList: ChallengeCheckin[]) =>
                participants
                    .map(p => {
                        const checkinsForCalculus = ckList.filter(ck => ck.user_id === p.user_id).map(ck => ck.checkin_date);
                        return {
                            ...p,
                            score: calculateTotalPoints(checkinsForCalculus),
                            totalCheckins: checkinsForCalculus.length
                        };
                    })
                    .sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;
                        return b.totalCheckins - a.totalCheckins;
                    });

            const beforeRanks = rankSnapshot(checkins);
            const afterCheckins = [...checkins, newCheckin as any];
            const afterRanks = rankSnapshot(afterCheckins);

            afterRanks.forEach((entry, newIdx) => {
                const oldIdx = beforeRanks.findIndex(r => r.user_id === entry.user_id);
                if (newIdx > oldIdx && entry.user_id !== userId) {
                    const profile = store.profiles.find(u => u.id === entry.user_id);
                    const wantsRankNotif = profile?.notification_prefs?.rank_changes !== false;
                    if (!wantsRankNotif) return;
                    createNotification({
                        id: uid(),
                        user_id: entry.user_id,
                        type: 'rank_down',
                        reference_id: challenge!.id,
                        title: '📉 Você foi ultrapassado!',
                        message: `Alguém te passou no ranking de "${challenge!.title}". Hora de reagir! 🔥`
                    }).catch(console.error);
                }
            });

            const myOldRank = beforeRanks.findIndex(r => r.user_id === userId);
            const myNewRank = afterRanks.findIndex(r => r.user_id === userId);
            if (myNewRank === 0 && myOldRank > 0) {
                const myProfile = store.profiles.find(u => u.id === userId);
                const wantsRankNotif = myProfile?.notification_prefs?.rank_changes !== false;
                if (wantsRankNotif) {
                    createNotification({
                        id: uid(),
                        user_id: userId,
                        type: 'rank_top1',
                        reference_id: challenge!.id,
                        title: '🥇 Você é o número 1!',
                        message: `Você alcançou o 1º lugar em "${challenge!.title}"! Continue assim! 🚀`
                    }).catch(console.error);
                }
            }

            const updatedCheckins = [...store.challengeCheckins, newCheckin as any];
            await evaluateBadges(userId, challenge!.id, updatedCheckins, store.challengeBadges);

            await refresh();
            setShowCheckinModal(false);
            setCheckinNote('');
            setToast({ msg: 'Check-in realizado! 💥', type: 'success' });
        } catch (err: any) {
            setToast({ msg: err.message || 'Erro ao fazer check-in.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    function handleShare() {
        const url = `${window.location.origin}/challenges/${challenge!.id}`;
        navigator.clipboard.writeText(url);
        setToast({ msg: 'Link copiado para a área de transferência!', type: 'success' });
    }

    async function handleAddParticipant(e: React.FormEvent) {
        e.preventDefault();
        if (!newParticipantEmail.trim()) return;
        setSaving(true);
        try {
            const { data: profiles, error } = await supabase.from('profiles').select('*').eq('email', newParticipantEmail.trim().toLowerCase());
            if (error) throw error;
            if (!profiles || profiles.length === 0) throw new Error('Usuário não encontrado com este email.');
            const targetUser = profiles[0];

            if (participants.some(p => p.user_id === targetUser.id)) {
                throw new Error('Usuário já está no desafio.');
            }

            if (challenge!.max_participants && participants.length >= challenge!.max_participants) {
                throw new Error('O desafio já está lotado!');
            }

            await addChallengeParticipant({
                id: uid(),
                challenge_id: challenge!.id,
                user_id: targetUser.id,
                role: 'participant',
                joined_at: new Date().toISOString(),
            });
            setNewParticipantEmail('');
            setToast({ msg: 'Participante adicionado com sucesso!', type: 'success' });
        } catch (err: any) {
            setToast({ msg: err.message || 'Erro ao adicionar participante.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function handleRemoveParticipant(participantId: string, role: string) {
        if (role === 'owner') return;
        if (!confirm('Remover este participante do desafio?')) return;
        setSaving(true);
        try {
            await removeChallengeParticipant(participantId);
            setToast({ msg: 'Participante removido.', type: 'success' });
        } catch (err: any) {
            setToast({ msg: 'Erro ao remover participante.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function handleToggleAdmin(participantId: string, currentRole: 'admin' | 'participant') {
        if (!confirm(currentRole === 'admin' ? 'Remover privilégios de administrador?' : 'Promover este usuário a administrador?')) return;
        setSaving(true);
        try {
            await toggleChallengeAdmin(participantId, currentRole);
            setToast({ msg: 'Nível de acesso atualizado.', type: 'success' });
        } catch (err: any) {
            setToast({ msg: 'Erro ao atualizar nível de acesso.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteChallenge() {
        if (!confirm('Tem certeza que deseja EXCLUIR este desafio? Esta ação não pode ser desfeita e todos os check-ins serão perdidos.')) return;
        setSaving(true);
        try {
            await deleteChallenge(challenge!.id);
            router.push('/challenges');
        } catch (err: any) {
            setToast({ msg: 'Erro ao excluir desafio.', type: 'error' });
            setSaving(false);
        }
    }

    async function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editData.title.trim() || !editData.end_date) return;
        setSaving(true);
        try {
            await updateChallenge({
                id: challenge!.id,
                title: editData.title.trim(),
                description: editData.description.trim() || undefined,
                end_date: editData.end_date,
            });
            setToast({ msg: 'Desafio atualizado com sucesso!', type: 'success' });
            setShowEditModal(false);
        } catch (err: any) {
            setToast({ msg: 'Erro ao atualizar desafio.', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    function calculateStreak(dates: string[]): number {
        if (!dates || dates.length === 0) return 0;

        const sorted = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        let streak = 0;
        const todayDate = new Date(todayStr);
        const yesterdayDate = new Date(todayDate);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

        if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) {
            return 0;
        }

        let currentDate = new Date(sorted[0]);
        streak = 1;

        for (let i = 1; i < sorted.length; i++) {
            const prevDateStr = sorted[i];
            const expectedDate = new Date(currentDate);
            expectedDate.setDate(expectedDate.getDate() - 1);
            const expectedStr = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}`;

            if (prevDateStr === expectedStr) {
                streak++;
                currentDate = expectedDate;
            } else {
                break;
            }
        }
        return streak;
    }

    function calculateTotalPoints(userCheckinDates: string[]): number {
        if (!challenge) return 0;
        if (!userCheckinDates || userCheckinDates.length === 0) return 0;

        const totalPointsPerWeek = challenge.weekly_points || 1; // Default to 1 if not set
        const meta = challenge.weekly_frequency;

        // Crio um array ordenado de checkins
        const uniqueDates = [...new Set(userCheckinDates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const challengeStart = new Date(challenge.start_date);

        // Group check-ins by week
        const weekMap = new Map<number, number>(); // weekIndex -> checkin count

        for (const dateStr of uniqueDates) {
            const checkinDate = new Date(dateStr);
            const diffTime = Math.abs(checkinDate.getTime() - challengeStart.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // Qual semana esse checkin caiu? (0 = primeira semana, 1 = segunda semana, etc)
            // Assumimos que a semana 1 começa na data de start_date
            const weekIndex = Math.floor(diffDays / 7);

            weekMap.set(weekIndex, (weekMap.get(weekIndex) || 0) + 1);
        }

        let totalPoints = 0;

        // Para cada semana, se atingiu a meta, ganha os pontos da semana
        for (const [weekIndex, count] of weekMap.entries()) {
            if (count >= meta) {
                totalPoints += totalPointsPerWeek;
            }
        }

        return totalPoints;
    }

    const leaderboard = participants.map(p => {
        const userCheckinDates = checkins.filter(ck => ck.user_id === p.user_id).map(ck => ck.checkin_date);
        const userCheckinsCount = userCheckinDates.length;
        const totalPoints = calculateTotalPoints(userCheckinDates);
        const streak = calculateStreak(userCheckinDates);
        const profile = store.profiles.find(u => u.id === p.user_id);

        return {
            ...p,
            profile,
            score: totalPoints,
            totalCheckins: userCheckinsCount,
            streak,
        };
    }).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.totalCheckins !== a.totalCheckins) return b.totalCheckins - a.totalCheckins;
        return b.streak - a.streak;
    });

    const participantCheckinDates = new Map<string, Set<string>>();
    checkins.forEach(ck => {
        if (!participantCheckinDates.has(ck.user_id)) {
            participantCheckinDates.set(ck.user_id, new Set());
        }
        participantCheckinDates.get(ck.user_id)!.add(ck.checkin_date);
    });

    const participantIds = new Set(participants.map(p => p.user_id));

    const challengeComments = store.challengeComments
        .filter(c => c.challenge_id === id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const challengeFeedEvents = store.feedEvents
        .filter(event => {
            if (event.eventType.startsWith('CHALLENGE_CHECKIN') && event.referenceId === challenge?.id) {
                return true;
            }
            const checkinFeedEventIds = checkins.map(ck => ck.feed_event_id).filter(Boolean);
            if (checkinFeedEventIds.includes(event.id)) return true;

            if (event.eventType.startsWith('WO_COMPLETED') && participantIds.has(event.userId)) {
                const eventDate = new Date(event.createdAt);
                const eventLocalDate = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
                const userCheckinDates = participantCheckinDates.get(event.userId);
                return userCheckinDates?.has(eventLocalDate) ?? false;
            }

            return false;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

            <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
                <button onClick={() => router.push('/challenges')} className="btn inline-flex items-center text-slate-500 hover:text-slate-800 text-sm font-bold mb-6">
                    <ChevronLeft size={16} className="-ml-1" /> Todos os Desafios
                </button>

                <div className="bg-white rounded-3xl p-6 sm:p-10 card-depth border border-transparent mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-20 pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row gap-6 md:gap-8 relative z-10">
                        <div className="size-20 md:size-28 rounded-2xl bg-amber-100 flex items-center justify-center text-4xl md:text-5xl shrink-0 shadow-inner">
                            {challenge.emoji}
                        </div>

                        <div className="flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-inter tracking-tight leading-tight">
                                        {challenge.title}
                                    </h1>
                                    <p className="text-slate-500 mt-2 text-sm md:text-base max-w-2xl leading-relaxed">
                                        {challenge.description || 'Sem descrição.'}
                                    </p>
                                </div>
                                <div className="text-center bg-slate-50 rounded-2xl p-3 border border-slate-100 hidden sm:block min-w-[100px]">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Dias</div>
                                    <div className="text-2xl font-black text-slate-800 font-roboto">
                                        {Math.max(1, Math.ceil((new Date(challenge.end_date).getTime() - new Date(challenge.start_date).getTime()) / (1000 * 60 * 60 * 24)))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                                    <Calendar size={14} /> {formatDate(challenge.start_date)} até {formatDate(challenge.end_date)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                                    <Flame size={14} /> {challenge.weekly_frequency}x por semana
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                                    <Users size={14} /> {participants.length} inscritos
                                </span>
                                {(() => {
                                    const ownerParticipant = participants.find(p => p.role === 'owner');
                                    const creator = ownerParticipant ? store.profiles.find(u => u.id === ownerParticipant.user_id) : null;
                                    if (!creator) return null;
                                    return (
                                        <span className="inline-flex items-center gap-2 text-xs font-bold text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-full">
                                            {creator.photo_url ? (
                                                <img src={creator.photo_url} alt={creator.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <span className="w-4 h-4 rounded-full bg-violet-200 text-violet-700 flex items-center justify-center text-[10px] font-black shrink-0">
                                                    {creator.name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                            👑 Criado por {creator.name.split(' ')[0]}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 relative z-10">
                        {!isParticipant && !isAdmin ? ( // Admins won't see "Join" if they just administrate, they use the add interface. Or if they joined they are participants.
                            <button
                                className="btn bg-amber-500 text-white hover:bg-amber-600 shadow-xl shadow-amber-500/20 px-8 py-3.5 border-none text-sm"
                                onClick={handleJoin}
                                disabled={saving}
                            >
                                {saving ? 'Entrando...' : '🚀 Participar do Desafio'}
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {isAdmin ? (
                                    <button
                                        className="btn bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 px-8 py-3.5 border-none text-sm w-full sm:w-auto"
                                        onClick={() => {
                                            setCheckinDate(todayStr); // Reset modal fields
                                            setSelectedParticipants(new Set());
                                            if (isParticipant) {
                                                setSelectedParticipants(new Set([userId]));
                                            }
                                            setShowCheckinModal(true);
                                        }}
                                    >
                                        <CheckCircle2 size={16} /> Lançar Check-in
                                    </button>
                                ) : (
                                    <>
                                        {!hasCheckedInToday && isActive && (
                                            <button
                                                className="btn bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 px-8 py-3.5 border-none text-sm w-full sm:w-auto"
                                                onClick={() => setShowCheckinModal(true)}
                                            >
                                                <CheckCircle2 size={16} /> Fazer Check-in Hoje
                                            </button>
                                        )}
                                        {hasCheckedInToday && (
                                            <div className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-6 py-3.5 rounded-xl w-full sm:w-auto justify-center">
                                                <CheckCircle2 size={18} /> Check-in Feito Hoje
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button className="btn bg-slate-50 text-slate-600 hover:bg-slate-100 px-4 py-3 border-transparent" title="Compartilhar" onClick={handleShare}>
                                <Share2 size={16} />
                            </button>
                            {isAdmin && (
                                <button className="btn bg-slate-50 text-slate-600 hover:bg-slate-100 px-4 py-3 border-transparent" title="Configurações (Admin)" onClick={() => setActiveTab('admin')}>
                                    <Cog size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200">
                    <button className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 outline-none ${activeTab === 'ranking' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`} onClick={() => setActiveTab('ranking')}>
                        <span className="flex items-center gap-2"><Trophy size={16} /> Ranking</span>
                    </button>
                    <button className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 outline-none ${activeTab === 'feed' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`} onClick={() => setActiveTab('feed')}>
                        <span className="flex items-center gap-2"><MessageSquare size={16} /> Feed & Atividade</span>
                    </button>
                    <button className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 outline-none ${activeTab === 'rules' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`} onClick={() => setActiveTab('rules')}>
                        <span className="flex items-center gap-2"><ShieldAlert size={16} /> Regras</span>
                    </button>
                    {isAdmin && (
                        <button className={`px-5 py-3 text-sm font-bold transition-colors border-b-2 outline-none ${activeTab === 'admin' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`} onClick={() => setActiveTab('admin')}>
                            <span className="flex items-center gap-2"><Cog size={16} /> Gestão (Admin)</span>
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-2xl card-depth p-4 sm:p-6 min-h-[400px]">
                    {activeTab === 'ranking' && (
                        <div className="animate-in fade-in duration-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 px-2">Leaderboard</h3>
                            <div className="flex flex-col gap-2">
                                {leaderboard.map((u, idx) => (
                                    <div key={u.id} className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${u.user_id === userId ? 'bg-amber-50 border border-amber-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                                        <div className="w-8 text-center font-black text-slate-400 font-roboto">
                                            {idx + 1}
                                        </div>
                                        <div className="size-10 rounded-xl bg-slate-200 overflow-hidden shadow-sm shrink-0">
                                            {u.profile?.photo_url ? (
                                                <img src={u.profile.photo_url} alt={u.profile.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 bg-slate-100">
                                                    {u.profile?.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-bold text-slate-900 text-sm truncate">{u.profile?.name}</h4>
                                                {u.role === 'owner' && <span className="text-[10px] uppercase font-black tracking-wider text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded">Criador</span>}
                                                {u.role === 'admin' && <span className="text-[10px] uppercase font-black tracking-wider text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">Admin</span>}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                                                <span className="flex items-center gap-1 font-semibold text-amber-600"><Trophy size={12} className="text-amber-500" /> {u.score} pts</span>
                                                <span className="flex items-center gap-1 font-semibold"><CheckCircle2 size={12} className="text-emerald-500" /> {u.totalCheckins} check-ins</span>
                                                {u.streak > 0 && (
                                                    <span className="flex items-center gap-1 font-semibold text-amber-500"><Flame size={12} /> {u.streak} {u.streak === 1 ? 'dia' : 'dias'}</span>
                                                )}
                                                {u.streak === 0 && (
                                                    <span className="flex items-center gap-1 font-semibold text-slate-400"><Flame size={12} /> 0 dias</span>
                                                )}
                                            </div>
                                        </div>
                                        {idx === 0 && u.score > 0 && <Medal size={24} className="text-amber-400 drop-shadow-sm" />}
                                        {idx === 1 && u.score > 0 && <Medal size={24} className="text-slate-300 drop-shadow-sm" />}
                                        {idx === 2 && u.score > 0 && <Medal size={24} className="text-amber-700 drop-shadow-sm" />}
                                    </div>
                                ))}
                                {leaderboard.length === 0 && (
                                    <p className="text-slate-500 text-center py-10 font-medium">Nenhum participante ainda.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'feed' && (
                        <div className="animate-in fade-in duration-200">
                            <h3 className="text-lg font-bold text-slate-800 mb-6 px-2">Atividade Recente</h3>
                            <Feed
                                friendIds={participants.map(p => p.user_id).filter(uid => uid !== userId)}
                                myId={userId}
                                customEvents={challengeFeedEvents}
                                challengeId={isParticipant ? id : undefined}
                                isAdmin={isAdmin}
                            />
                        </div>
                    )}

                    {activeTab === 'rules' && (() => {
                        const specificWorkout = challenge.specific_workout_id
                            ? store.workouts.find(w => w.id === challenge.specific_workout_id)
                            : null;
                        const maxP = challenge.max_participants;
                        const freq = challenge.weekly_frequency;

                        return (
                            <div className="animate-in fade-in duration-200 flex flex-col gap-5">
                                <h3 className="text-lg font-bold text-slate-800 px-1">Regras do Desafio</h3>

                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={16} className="text-slate-400" />
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Período</span>
                                    </div>
                                    <p className="text-slate-700 text-sm leading-relaxed">
                                        Este desafio começa em <strong>{formatDate(challenge.start_date)}</strong> e termina em <strong>{formatDate(challenge.end_date)}</strong>,
                                        totalizando <strong>{Math.max(1, Math.ceil((new Date(challenge.end_date).getTime() - new Date(challenge.start_date).getTime()) / (1000 * 60 * 60 * 24)))} dias</strong> de desafio.
                                    </p>
                                    <p className="text-slate-500 text-sm leading-relaxed">
                                        As inscrições ficam abertas até o último dia do desafio (<strong>{formatDate(challenge.end_date)}</strong>). Você pode entrar a qualquer momento enquanto o desafio estiver ativo, mas apenas os check-ins realizados a partir da sua data de inscrição serão contabilizados.
                                    </p>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Flame size={16} className="text-amber-500" />
                                        <span className="text-xs font-black uppercase tracking-widest text-amber-500">Frequência Semanal</span>
                                    </div>
                                    <p className="text-slate-700 text-sm leading-relaxed">
                                        Este desafio exige <strong>{freq} treino{freq > 1 ? 's' : ''} por semana</strong>.
                                        Ao atingir essa meta semanal, você ganha <strong>{challenge.weekly_points || 1} ponto{challenge.weekly_points !== 1 ? 's' : ''}</strong> na pontuação.
                                    </p>
                                    <p className="text-slate-500 text-sm">
                                        Exemplo: se este desafio exige {freq}x por semana e você treinar {freq + 1}x, os <strong>{freq + 1} check-ins</strong> serão somados ao seu total, porém a pontuação ganha será baseada nos <strong>{freq} check-ins</strong>.
                                    </p>
                                </div>

                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle2 size={16} className="text-emerald-500" />
                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Como fazer Check-in</span>
                                    </div>
                                    {challenge.checkin_type === 'any_workout' ? (
                                        <>
                                            <p className="text-slate-700 text-sm leading-relaxed">
                                                Qualquer treino finalizado no app conta como check-in para este desafio. Basta iniciar e finalizar uma sessão de treino — o check-in será registrado automaticamente.
                                            </p>
                                            <p className="text-slate-500 text-sm">
                                                Treinos de qualquer sessão (membros superiores, inferiores, cardio, etc.) são válidos.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-slate-700 text-sm leading-relaxed">
                                                Apenas o treino <strong>"{specificWorkout?.name ?? 'específico do desafio'}"</strong> conta como check-in. Ao finalizar especificamente esta sessão no app, o check-in é registrado automaticamente.
                                            </p>
                                            <p className="text-slate-500 text-sm">
                                                Outros treinos finalizados <strong>não</strong> contabilizam neste desafio.
                                            </p>
                                        </>
                                    )}
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Users size={16} className="text-blue-500" />
                                        <span className="text-xs font-black uppercase tracking-widest text-blue-500">Participantes</span>
                                    </div>
                                    <p className="text-slate-700 text-sm leading-relaxed">
                                        Atualmente <strong>{participants.length} pessoa{participants.length !== 1 ? 's estão' : ' está'} inscrita{participants.length !== 1 ? 's' : ''}</strong> neste desafio.
                                        {maxP
                                            ? ` O limite máximo de participantes é ${maxP}.${participants.length >= maxP ? ' As vagas estão esgotadas.' : ` Ainda restam ${maxP - participants.length} vaga${maxP - participants.length !== 1 ? 's' : ''}.`}`
                                            : ' Não há limite de participantes — qualquer pessoa pode se inscrever enquanto o desafio estiver ativo.'}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === 'admin' && isAdmin && (
                        <div className="animate-in fade-in duration-200">
                            <div className="flex items-center justify-between mb-6 px-2">
                                <h3 className="text-lg font-bold text-slate-800">Gestão do Desafio</h3>
                                {isOwner && (
                                    <button
                                        onClick={() => {
                                            setEditData({ title: challenge.title, description: challenge.description || '', end_date: challenge.end_date });
                                            setShowEditModal(true);
                                        }}
                                        className="btn bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 text-sm"
                                    >
                                        <Edit3 size={16} /> Editar Informações
                                    </button>
                                )}
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <UserPlus size={18} className="text-blue-500" />
                                    Adicionar Participante
                                </h4>
                                <form onSubmit={handleAddParticipant} className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="email"
                                        required
                                        className="flex-1 bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none transition-all"
                                        placeholder="Email do usuário..."
                                        value={newParticipantEmail}
                                        onChange={e => setNewParticipantEmail(e.target.value)}
                                        disabled={saving}
                                    />
                                    <button type="submit" disabled={saving || !newParticipantEmail.trim()} className="btn bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 px-6 py-3 border-none disabled:opacity-50">
                                        Adicionar
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <Users size={18} className="text-slate-500" />
                                    Gerenciar Inscritos ({participants.length})
                                </h4>
                                <div className="flex flex-col gap-2">
                                    {leaderboard.map((u) => (
                                        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                                                    {u.profile?.photo_url ? (
                                                        <img src={u.profile.photo_url} alt={u.profile.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs bg-slate-100">
                                                            {u.profile?.name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-sm">{u.profile?.name}</p>
                                                    <p className="text-xs text-slate-500">{u.profile?.email}</p>
                                                </div>
                                            </div>
                                            <div>
                                                {u.role === 'owner' ? (
                                                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-500 bg-amber-100 px-2 py-1 rounded">Criador</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {isOwner && (
                                                            <button
                                                                onClick={() => handleToggleAdmin(u.id, u.role as 'admin' | 'participant')}
                                                                disabled={saving}
                                                                className={`p-2 rounded-lg transition-colors ${u.role === 'admin' ? 'text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                                title={u.role === 'admin' ? "Remover admin" : "Tornar admin"}
                                                            >
                                                                <ShieldAlert size={18} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemoveParticipant(u.id, u.role)}
                                                            disabled={saving}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                            title="Remover participante"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {isOwner && (
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                                    <h4 className="font-bold text-red-800 flex items-center gap-2 mb-2">
                                        <Trash2 size={18} className="text-red-600" />
                                        Zona de Perigo
                                    </h4>
                                    <p className="text-sm text-red-600/80 mb-4 leading-relaxed">
                                        Excluir este desafio apagará todos os check-ins, comentários e o registro de participação de todos os usuários. Esta ação é irreversível.
                                    </p>
                                    <button
                                        onClick={handleDeleteChallenge}
                                        disabled={saving}
                                        className="btn bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/30 px-6 py-3 border-none"
                                    >
                                        Excluir Desafio Definitivamente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {showCheckinModal && (
                <Modal title="Fazer Check-in" onClose={() => setShowCheckinModal(false)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4 border-none" onClick={() => setShowCheckinModal(false)} disabled={saving}>Cancelar</button>
                            <button
                                className="btn bg-slate-900 text-white hover:scale-[1.02] shadow-xl shadow-slate-900/30 px-8 py-4 border-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                form="checkin-form"
                                type="submit"
                                disabled={saving || (isAdmin && selectedParticipants.size === 0)}
                            >
                                {saving ? 'Salvando...' : 'Confirmar Check-in 🔥'}
                            </button>
                        </div>
                    }
                >
                    <form id="checkin-form" onSubmit={handleManualCheckin} className="flex flex-col gap-5 mt-6">
                        {isAdmin ? (
                            <div className="flex flex-col gap-4">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm mb-2 flex items-start gap-3">
                                    <ShieldAlert className="mt-0.5 shrink-0 text-blue-600" size={16} />
                                    <p><strong>Modo Admin:</strong> Registre check-ins para um ou mais participantes. A pontuação usará rigorosamente a data selecionada abaixo.</p>
                                </div>

                                <div className="field">
                                    <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-1">Data do Check-in</label>
                                    <input
                                        type="date"
                                        className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white"
                                        value={checkinDate}
                                        min={challenge.start_date}
                                        max={todayStr}
                                        onChange={(e) => setCheckinDate(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="field flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block">Participantes ({selectedParticipants.size} selecionados)</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedParticipants.size === leaderboard.length) {
                                                    setSelectedParticipants(new Set());
                                                } else {
                                                    setSelectedParticipants(new Set(leaderboard.map(u => u.user_id)));
                                                }
                                            }}
                                            className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline"
                                        >
                                            {selectedParticipants.size === leaderboard.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar participante..."
                                        className="bg-white border border-slate-200 text-sm py-2 px-3 rounded-t-lg outline-none w-full focus:border-amber-500"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    <div className="max-h-[200px] overflow-y-auto border border-t-0 border-slate-200 rounded-b-lg divide-y divide-slate-100 bg-white">
                                        {leaderboard.filter(u => u.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                                            <label key={u.user_id} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedParticipants.has(u.user_id) ? 'bg-amber-50/50' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 accent-amber-500"
                                                    checked={selectedParticipants.has(u.user_id)}
                                                    onChange={(e) => {
                                                        const newSet = new Set(selectedParticipants);
                                                        if (e.target.checked) newSet.add(u.user_id);
                                                        else newSet.delete(u.user_id);
                                                        setSelectedParticipants(newSet);
                                                    }}
                                                />
                                                <div className="size-6 rounded-md bg-slate-200 overflow-hidden shrink-0">
                                                    {u.profile?.photo_url ? (
                                                        <img src={u.profile.photo_url} alt={u.profile.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-[10px] bg-slate-100">
                                                            {u.profile?.name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-semibold text-sm text-slate-800 flex-1 truncate">{u.profile?.name}</span>
                                            </label>
                                        ))}
                                        {leaderboard.filter(u => u.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                            <div className="p-4 text-center text-sm text-slate-500 font-medium">Nenhum participante encontrado.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm mb-2 text-center">
                                Você está registrando um check-in para o dia <strong className="font-bold">{formatDate(todayStr)}</strong>.
                            </div>
                        )}
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-2">Nota ou Link para Evidência (Opcional)</label>
                            <textarea
                                className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white min-h-[80px]"
                                placeholder={isAdmin ? "Nota da auditoria (será aplicado em lote)..." : "Gravei um stories treinando hoje!"}
                                value={checkinNote}
                                onChange={(e) => setCheckinNote(e.target.value)}
                            />
                        </div>
                    </form>
                </Modal>
            )}

            {showEditModal && (
                <Modal title="Editar Desafio" onClose={() => setShowEditModal(false)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4 border-none" onClick={() => setShowEditModal(false)} disabled={saving}>Cancelar</button>
                            <button className="btn bg-blue-600 text-white hover:scale-[1.02] shadow-xl shadow-blue-500/30 px-8 py-4 border-none text-sm" form="edit-form" type="submit" disabled={saving}>
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    }
                >
                    <form id="edit-form" onSubmit={handleEditSubmit} className="flex flex-col gap-4 mt-6">
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-2">Título do Desafio</label>
                            <input
                                required
                                className="bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white"
                                value={editData.title}
                                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-2">Descrição (Opcional)</label>
                            <textarea
                                className="bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white min-h-[80px]"
                                value={editData.description}
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest block mb-2">Data Final (Data Limite)</label>
                            <input
                                type="date"
                                required
                                className="bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 w-full outline-none transition-all focus:bg-white"
                                value={editData.end_date}
                                onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                            />
                            <p className="text-xs text-slate-500 mt-2">Você pode estender ou encurtar a duração do desafio alterando a data final.</p>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}