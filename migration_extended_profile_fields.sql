-- Adiciona as colunas de localização e registro profissional na tabela Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS "state" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "cref" TEXT;
