-- ============================================================
-- challenge_comments: adicionar feed_event_id (v2)
-- Permite comentários por atividade (estilo Twitter)
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar coluna feed_event_id (nullable — comentários antigos não têm)
ALTER TABLE public.challenge_comments
    ADD COLUMN IF NOT EXISTS feed_event_id TEXT DEFAULT NULL;

-- 2. Índice para busca rápida por feed_event_id
CREATE INDEX IF NOT EXISTS idx_challenge_comments_feed_event
    ON public.challenge_comments(feed_event_id);

-- ============================================================
-- FIM
-- ============================================================
