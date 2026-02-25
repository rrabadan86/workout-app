DO $$
DECLARE
    orphan_workout RECORD;
    new_project_id UUID;
    restored_count INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando restauração da hierarquia verdadeira (Treino -> Projeto)...';

    FOR orphan_workout IN 
        SELECT w.id, w.name, w."ownerId"
        FROM public.workouts w
        LEFT JOIN public.projects p ON CAST(w."projectId" AS TEXT) = CAST(p.id AS TEXT)
        WHERE w."projectId" IS NULL 
           OR CAST(w."projectId" AS TEXT) = ''
           OR p.name = 'Histórico Antigo'
    LOOP
        -- Criar um Projeto 1:1 para hospedar esse treino antigo de forma independente
        INSERT INTO public.projects (
            id,
            name, 
            "ownerId", 
            "startDate", 
            "endDate", 
            status, 
            "sharedWith"
        ) 
        VALUES (
            gen_random_uuid(),
            orphan_workout.name,
            orphan_workout."ownerId",
            now(),
            now() + interval '10 years',
            'active',
            '{}' 
        ) RETURNING id INTO new_project_id;

        -- Colocar o treino antigo (Session) dentro do seu Projeto apropriado
        UPDATE public.workouts 
        SET "projectId" = new_project_id 
        WHERE CAST(id AS TEXT) = CAST(orphan_workout.id AS TEXT);

        -- Tentativa de resgatar o field `sharedWith` e 'endDate' de quando o Workout era a raiz
        BEGIN
            EXECUTE 'UPDATE public.projects SET "sharedWith" = COALESCE((SELECT "sharedWith" FROM public.workouts WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)), ''{}'') WHERE CAST(id AS TEXT) = CAST($2 AS TEXT)'
            USING orphan_workout.id, new_project_id;
        EXCEPTION WHEN undefined_column THEN
        END;

        BEGIN
            EXECUTE 'UPDATE public.projects SET "endDate" = (SELECT "endDate" FROM public.workouts WHERE CAST(id AS TEXT) = CAST($1 AS TEXT)) WHERE CAST(id AS TEXT) = CAST($2 AS TEXT)'
            USING orphan_workout.id, new_project_id;
        EXCEPTION WHEN undefined_column THEN
        END;

        restored_count := restored_count + 1;
    END LOOP;

    -- Apagar as pastas 'Histórico Antigo' pois os treinos já foram transferidos pra raiz
    DELETE FROM public.projects WHERE name = 'Histórico Antigo';

    RAISE NOTICE 'Total de treinos antigos convertidos para o formato moderno de Projetos: %', restored_count;

END $$;
