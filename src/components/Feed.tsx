'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { FeedEvent, Kudo } from '@/lib/types';
import { uid } from '@/lib/utils';
import { Dumbbell, Heart, MessageCircle, Clock, ChevronRight } from 'lucide-react';

function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'ontem';
    return `${diffDays}d atrás`;
}

export default function Feed({ friendIds, myId }: { friendIds: string[], myId: string }) {
    const { store, toggleKudo } = useStore();
    const router = useRouter();

    // Include friends' events + my own events
    const allRelevantIds = [...friendIds, myId];

    const feedItems = useMemo(() => {
        return store.feedEvents
            .filter(e => allRelevantIds.includes(e.userId))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20); // show last 20
    }, [store.feedEvents, allRelevantIds]);

    if (feedItems.length === 0) {
        return (
            <div className="card" style={{ padding: '30px 20px', textAlign: 'center' }}>
                <MessageCircle size={32} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                <p style={{ color: 'var(--text-secondary)' }}>Nenhuma atividade recente.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>Os treinos concluídos por você e seus amigos aparecerão aqui.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {feedItems.map(event => {
                const user = store.users.find(u => u.id === event.userId);
                if (!user) return null;

                const eventKudos = store.kudos.filter(k => k.feedEventId === event.id);
                const hasMyKudo = eventKudos.some(k => k.userId === myId);

                let eventText = '';
                let icon = <Dumbbell size={20} />;
                let colorClass = 'stat-icon-purple';
                let actionOnClick: (() => void) | undefined;
                let logsSummary: React.ReactNode = null;

                if (event.eventType === 'WO_COMPLETED') {
                    const workout = store.workouts.find(w => w.id === event.referenceId);
                    const project = workout ? store.projects.find(p => p.id === workout.projectId) : null;
                    if (workout) {
                        eventText = project
                            ? `concluiu o treino "${workout.name}" do projeto "${project.name}"`
                            : `concluiu o treino "${workout.name}"`;
                        icon = <Dumbbell size={20} />;
                        colorClass = 'stat-icon-green';
                        if (project) {
                            actionOnClick = () => router.push(`/projects/${project.id}`);
                        }

                        // Connect with workout_logs
                        // Get the date of the event in YYYY-MM-DD format (local time)
                        const eventDateObj = new Date(event.createdAt);
                        const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;

                        // Find all logs for this user, this workout, on this specific date
                        const dayLogs = store.logs.filter(l =>
                            l.userId === event.userId &&
                            l.workoutId === workout.id &&
                            l.date === localDateStr
                        );

                        if (dayLogs.length > 0) {
                            logsSummary = (
                                <div style={{
                                    marginTop: 10, padding: '10px 12px', background: 'var(--glass)',
                                    border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)'
                                }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        O que foi feito:
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {dayLogs.map((log) => {
                                            const exName = store.exercises.find(e => e.id === log.exerciseId)?.name || 'Exercício';
                                            const plannedExercise = workout.exercises.find(ex => ex.exerciseId === log.exerciseId);
                                            const plannedSets = plannedExercise ? plannedExercise.sets.length : log.sets.length;
                                            const skippedSets = Math.max(0, plannedSets - log.sets.length);

                                            const groups: { count: number, weight: number }[] = [];
                                            for (const s of log.sets) {
                                                if (groups.length > 0 && groups[groups.length - 1].weight === s.weight) {
                                                    groups[groups.length - 1].count++;
                                                } else {
                                                    groups.push({ count: 1, weight: s.weight });
                                                }
                                            }
                                            const setsDisplay = groups.map(g => `${g.count}x ${g.weight}kg`).join(' / ');

                                            return (
                                                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '2px 0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <span style={{ color: 'var(--text-primary)' }}>{exName}</span>
                                                        {skippedSets > 0 && (
                                                            <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                                                faltou {skippedSets} {skippedSets === 1 ? 'série' : 'séries'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ color: 'var(--accent-light)', fontWeight: 500, textAlign: 'right', paddingLeft: 12 }}>
                                                        {setsDisplay}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        }

                    } else {
                        eventText = `concluiu um treino`;
                    }
                }

                return (
                    <div key={event.id} className="card animate-fade" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className={`stat-icon ${colorClass}`} style={{ width: 44, height: 44, borderRadius: '50%' }}>
                                    {icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{user.id === myId ? 'Você' : user.name}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.4, marginTop: 2 }}>
                                        {eventText}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                <Clock size={12} />
                                {timeAgo(event.createdAt)}
                            </div>
                        </div>

                        {logsSummary}

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

                        {/* Footer / Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleKudo({
                                        id: uid(),
                                        feedEventId: event.id,
                                        userId: myId,
                                        createdAt: new Date().toISOString()
                                    });
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: hasMyKudo ? 'rgba(255,101,132,0.15)' : 'transparent',
                                    border: `1px solid ${hasMyKudo ? 'rgba(255,101,132,0.3)' : 'var(--glass-border)'}`,
                                    padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                                    color: hasMyKudo ? '#ff6584' : 'var(--text-secondary)',
                                    fontWeight: hasMyKudo ? 700 : 500,
                                    transition: 'all 0.2s',
                                    outline: 'none'
                                }}
                            >
                                <Heart size={16} fill={hasMyKudo ? 'currentColor' : 'none'} color={hasMyKudo ? 'currentColor' : 'var(--text-muted)'} />
                                {eventKudos.length > 0 ? eventKudos.length : 'Kudos'}
                            </button>

                            {actionOnClick && (
                                <button className="btn btn-ghost btn-sm" onClick={actionOnClick} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                                    Ver Projeto <ChevronRight size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
