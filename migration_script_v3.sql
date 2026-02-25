DO $$
DECLARE
    fixed_count INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando sincronização de donos de Projetos...';

    -- Atualiza o ownerId do projeto para ser igual ao ownerId de qualquer treino que esteja dentro dele,
    -- desde que o dono atual do projeto não exista na tabela de profiles (ou seja, é um ID legado/conta deletada).
    UPDATE public.projects p
    SET "ownerId" = (
        SELECT w."ownerId"
        FROM public.workouts w
        WHERE CAST(w."projectId" AS TEXT) = CAST(p.id AS TEXT)
          AND w."ownerId" IN (SELECT id FROM public.profiles)
        LIMIT 1
    )
    WHERE p."ownerId" NOT IN (SELECT id FROM public.profiles)
      AND EXISTS (
        SELECT 1
        FROM public.workouts w
        WHERE CAST(w."projectId" AS TEXT) = CAST(p.id AS TEXT)
          AND w."ownerId" IN (SELECT id FROM public.profiles)
      );

    -- Pega quantas linhas foram atualizadas
    GET DIAGNOSTICS fixed_count = ROW_COUNT;

    RAISE NOTICE 'Total de Projetos cujos donos foram corrigidos/sincronizados: %', fixed_count;

END $$;
