'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, MapPin, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store';

interface GymRankingProps {
    userId: string;
}

export default function GymRanking({ userId }: GymRankingProps) {
    const router = useRouter();
    const { store } = useStore();

    // Only count check-ins whose feed_event still exists AND is not hidden
    const validCheckins = useMemo(() => {
        const activeFeedEventIds = new Set(
            store.feedEvents
                .filter(e => e.eventType.startsWith('WO_COMPLETED') && !e.eventType.startsWith('WO_COMPLETED_HIDDEN'))
                .map(e => e.id)
        );
        return store.gymCheckins.filter(c => c.feed_event_id && activeFeedEventIds.has(c.feed_event_id));
    }, [store.gymCheckins, store.feedEvents]);

    // Gyms where the current user has at least 1 valid check-in
    const myGyms = useMemo(() => {
        const gymMap: Record<string, { totalUsers: number; myCount: number; leaderProfile: typeof store.profiles[0] | undefined }> = {};

        // Get all gym names where I checked in
        const myNames = new Set<string>();
        validCheckins.filter(c => c.user_id === userId).forEach(c => myNames.add(c.place_name));

        for (const gymName of myNames) {
            const gymCheckins = validCheckins.filter(c => c.place_name === gymName);
            const userCounts: Record<string, number> = {};
            gymCheckins.forEach(c => { userCounts[c.user_id] = (userCounts[c.user_id] || 0) + 1; });
            const sorted = Object.entries(userCounts).sort((a, b) => b[1] - a[1]);

            gymMap[gymName] = {
                totalUsers: Object.keys(userCounts).length,
                myCount: userCounts[userId] || 0,
                leaderProfile: store.profiles.find(p => p.id === sorted[0]?.[0]),
            };
        }

        return gymMap;
    }, [validCheckins, userId, store.profiles]);

    const gymNames = Object.keys(myGyms);

    if (gymNames.length === 0) {
        return (
            <div className="bg-white rounded-xl card-depth p-10 text-center flex flex-col items-center border border-slate-100">
                <MapPin size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold font-roboto">Nenhum check-in realizado ainda.</p>
                <p className="text-xs text-slate-400 mt-1">Faca check-in ao finalizar um treino para ver o ranking.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {gymNames.map(gymName => {
                const info = myGyms[gymName];
                return (
                    <div
                        key={gymName}
                        className="bg-white rounded-2xl card-depth overflow-hidden border border-transparent hover:border-primary/20 cursor-pointer active:scale-[0.99] transition-all duration-200 group"
                        onClick={() => router.push(`/community/gym?name=${encodeURIComponent(gymName)}`)}
                    >
                        <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="size-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                    <MapPin size={20} className="text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-extrabold text-slate-900 truncate">{gymName}</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {info.totalUsers} usuario{info.totalUsers !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-slate-300">·</span>
                                        <span className="text-[10px] font-bold text-primary">
                                            {info.myCount} check-in{info.myCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Leader preview */}
                            {info.leaderProfile && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="relative">
                                        <div className={`size-8 rounded-full overflow-hidden ${info.leaderProfile.photo_url ? '' : 'bg-amber-100 text-amber-600'} flex items-center justify-center font-bold text-xs`}>
                                            {info.leaderProfile.photo_url
                                                ? <img src={info.leaderProfile.photo_url} alt="" className="w-full h-full object-cover" />
                                                : info.leaderProfile.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <Crown size={12} className="absolute -top-1.5 -right-1.5 text-amber-500 drop-shadow" />
                                    </div>
                                </div>
                            )}

                            <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
