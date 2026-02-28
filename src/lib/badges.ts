import { supabase } from '@/lib/supabase';
import { uid } from '@/lib/utils';
import type { ChallengeCheckin, ChallengeBadge, BadgeType } from '@/lib/types';

export async function evaluateBadges(
    userId: string,
    challengeId: string,
    allCheckins: ChallengeCheckin[],
    existingBadges: ChallengeBadge[]
) {
    const userCheckins = allCheckins.filter(ck => ck.user_id === userId && ck.challenge_id === challengeId);
    const userBadges = existingBadges.filter(b => b.user_id === userId && b.challenge_id === challengeId);

    const newBadges: { id: string, challenge_id: string, user_id: string, badge_type: BadgeType }[] = [];

    const hasBadge = (type: BadgeType) => userBadges.some(b => b.badge_type === type) || newBadges.some(b => b.badge_type === type);

    // 1. First Flame: First checkin
    if (userCheckins.length > 0 && !hasBadge('first_flame')) {
        newBadges.push({
            id: uid(),
            challenge_id: challengeId,
            user_id: userId,
            badge_type: 'first_flame'
        });
    }

    // 2. Unstoppable Streak: say 3 checkins total for now
    if (userCheckins.length >= 3 && !hasBadge('unstoppable_streak')) {
        newBadges.push({
            id: uid(),
            challenge_id: challengeId,
            user_id: userId,
            badge_type: 'unstoppable_streak'
        });
    }

    // 3. Challenge Elite: 10 checkins total
    if (userCheckins.length >= 10 && !hasBadge('challenge_elite')) {
        newBadges.push({
            id: uid(),
            challenge_id: challengeId,
            user_id: userId,
            badge_type: 'challenge_elite'
        });
    }

    // 4. Living Proof: Has at least one checkin with an evidence note
    const hasEvidence = userCheckins.some(ck => ck.evidence_note && ck.evidence_note.length > 5);
    if (hasEvidence && !hasBadge('living_proof')) {
        newBadges.push({
            id: uid(),
            challenge_id: challengeId,
            user_id: userId,
            badge_type: 'living_proof'
        });
    }

    // Insert new badges
    if (newBadges.length > 0) {
        const { error } = await supabase.from('challenge_badges').insert(newBadges);
        if (error) {
            console.error('[Badges] Failed to insert new badges:', error);
        } else {
            console.log(`[Badges] Awarded ${newBadges.length} new badges to user ${userId}`);
        }
    }
}
