-- Script para adicionar a coluna friendIds na tabela profiles
-- Essa coluna é usada para permitir que os usuários se sigam na página de Comunidade.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS "friendIds" JSONB DEFAULT '[]'::jsonb;

-- Atualiza os perfis já existentes para garantir que ninguém fique com o valor nulo
UPDATE public.profiles
SET "friendIds" = '[]'::jsonb
WHERE "friendIds" IS NULL;
