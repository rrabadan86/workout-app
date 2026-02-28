-- ============================================================
-- DESAFIOS (Challenges) — Migração completa
-- Executar no Supabase SQL Editor
-- ============================================================

-- Limpar tabelas de tentativas anteriores (ordem respeita dependências)
DROP TABLE IF EXISTS public.challenge_badges CASCADE;
DROP TABLE IF EXISTS public.challenge_comments CASCADE;
DROP TABLE IF EXISTS public.challenge_checkins CASCADE;
DROP TABLE IF EXISTS public.challenge_invites CASCADE;
DROP TABLE IF EXISTS public.challenge_participants CASCADE;
DROP TABLE IF EXISTS public.challenges CASCADE;

-- ─── 1. challenges ─────────────────────────────────────────────
CREATE TABLE public.challenges (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    emoji           TEXT DEFAULT '🏆',
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    weekly_frequency INT NOT NULL DEFAULT 3 CHECK (weekly_frequency BETWEEN 1 AND 7),
    checkin_type    TEXT NOT NULL DEFAULT 'any_workout'
                    CHECK (checkin_type IN ('any_workout', 'specific_workout')),
    specific_workout_id TEXT DEFAULT NULL,
    visibility      TEXT NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'private')),
    join_rule       TEXT NOT NULL DEFAULT 'anyone'
                    CHECK (join_rule IN ('anyone', 'followers_only', 'invite_only')),
    max_participants INT DEFAULT NULL,
    created_by      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'ended')),
    invite_token    TEXT UNIQUE DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. challenge_participants ─────────────────────────────────
CREATE TABLE public.challenge_participants (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    challenge_id    TEXT NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'participant'
                    CHECK (role IN ('owner', 'admin', 'participant')),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (challenge_id, user_id)
);

-- ─── 3. challenge_invites ──────────────────────────────────────
CREATE TABLE public.challenge_invites (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    challenge_id    TEXT NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. challenge_checkins ─────────────────────────────────────
CREATE TABLE public.challenge_checkins (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    challenge_id    TEXT NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    checkin_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    checkin_type    TEXT NOT NULL DEFAULT 'manual'
                    CHECK (checkin_type IN ('auto', 'manual')),
    evidence_note   TEXT DEFAULT NULL,
    workout_id      TEXT DEFAULT NULL,
    feed_event_id   TEXT DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (challenge_id, user_id, checkin_date)
);

-- ─── 5. challenge_comments ─────────────────────────────────────
CREATE TABLE public.challenge_comments (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    challenge_id    TEXT NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 6. challenge_badges ───────────────────────────────────────
CREATE TABLE public.challenge_badges (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    challenge_id    TEXT NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    badge_type      TEXT NOT NULL
                    CHECK (badge_type IN (
                        'first_flame',
                        'unstoppable_streak',
                        'challenge_elite',
                        'leading_pack',
                        'living_proof'
                    )),
    earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (challenge_id, user_id, badge_type)
);

-- ─── 7. Índices ────────────────────────────────────────────────
CREATE INDEX idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user ON public.challenge_participants(user_id);
CREATE INDEX idx_challenge_checkins_challenge ON public.challenge_checkins(challenge_id);
CREATE INDEX idx_challenge_checkins_user ON public.challenge_checkins(user_id);
CREATE INDEX idx_challenge_checkins_date ON public.challenge_checkins(checkin_date);
CREATE INDEX idx_challenge_comments_challenge ON public.challenge_comments(challenge_id);
CREATE INDEX idx_challenge_badges_challenge ON public.challenge_badges(challenge_id);
CREATE INDEX idx_challenges_status ON public.challenges(status);
CREATE INDEX idx_challenges_invite_token ON public.challenges(invite_token);

-- ─── 8. RLS ────────────────────────────────────────────────────
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_select" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "challenges_insert" ON public.challenges FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "challenges_update" ON public.challenges FOR UPDATE TO authenticated USING (true);
CREATE POLICY "challenges_delete" ON public.challenges FOR DELETE TO authenticated USING (true);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_select" ON public.challenge_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "cp_insert" ON public.challenge_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cp_update" ON public.challenge_participants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "cp_delete" ON public.challenge_participants FOR DELETE TO authenticated USING (true);

ALTER TABLE public.challenge_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ci_select" ON public.challenge_invites FOR SELECT TO authenticated USING (true);
CREATE POLICY "ci_insert" ON public.challenge_invites FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ci_update" ON public.challenge_invites FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ci_delete" ON public.challenge_invites FOR DELETE TO authenticated USING (true);

ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_select" ON public.challenge_checkins FOR SELECT TO authenticated USING (true);
CREATE POLICY "cc_insert" ON public.challenge_checkins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cc_update" ON public.challenge_checkins FOR UPDATE TO authenticated USING (true);
CREATE POLICY "cc_delete" ON public.challenge_checkins FOR DELETE TO authenticated USING (true);

ALTER TABLE public.challenge_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccom_select" ON public.challenge_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ccom_insert" ON public.challenge_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ccom_delete" ON public.challenge_comments FOR DELETE TO authenticated USING (true);

ALTER TABLE public.challenge_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cb_select" ON public.challenge_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "cb_insert" ON public.challenge_badges FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cb_delete" ON public.challenge_badges FOR DELETE TO authenticated USING (true);

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
