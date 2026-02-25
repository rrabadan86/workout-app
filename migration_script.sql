DO $$
DECLARE
    old_user_record RECORD;
    new_profile_record RECORD;
    migrated_count INT := 0;
    orphan_owner RECORD;
    new_project_id UUID;
    fixed_count INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando script de migração...';

    -- 1. Migração de contas velhas (users) para o Google (profiles)
    FOR old_user_record IN SELECT * FROM public.users LOOP
        -- Encontrar conta google correspondente pelo email
        SELECT * INTO new_profile_record 
        FROM public.profiles 
        WHERE lower(email) = lower(old_user_record.email) 
          AND CAST(id AS TEXT) != CAST(old_user_record.id AS TEXT) 
        LIMIT 1;

        IF FOUND THEN
            RAISE NOTICE 'Migrando dados do usuário antigo % para o novo Google % (Email: %)', old_user_record.id, new_profile_record.id, old_user_record.email;

            -- Transferir workouts (Treinos antigos)
            UPDATE public.workouts 
            SET "ownerId" = new_profile_record.id 
            WHERE CAST("ownerId" AS TEXT) = CAST(old_user_record.id AS TEXT);
            
            -- Transferir exercises (Exercícios personalizados)
            UPDATE public.exercises 
            SET "createdBy" = new_profile_record.id 
            WHERE CAST("createdBy" AS TEXT) = CAST(old_user_record.id AS TEXT);
            
            -- Transferir workout_logs (Histórico de cargas)
            UPDATE public.workout_logs 
            SET "userId" = new_profile_record.id 
            WHERE CAST("userId" AS TEXT) = CAST(old_user_record.id AS TEXT);
            
            -- Deletar a conta antiga pra não conflitar
            DELETE FROM public.users WHERE CAST(id AS TEXT) = CAST(old_user_record.id AS TEXT);

            migrated_count := migrated_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Total de perfis migrados da tabela velha: %', migrated_count;

    -- 2. Reparo de treinos órfãos (que não tem projectId)
    FOR orphan_owner IN 
        SELECT DISTINCT "ownerId"
        FROM public.workouts 
        WHERE "projectId" IS NULL OR CAST("projectId" AS TEXT) = ''
    LOOP
        RAISE NOTICE 'Criando Projeto para agrupar treinos soltos do perfil: %', orphan_owner."ownerId";

        -- Criar um projeto de histórico antigo (sem aspas duplas nas colunas defaults)
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
            'Histórico Antigo',
            orphan_owner."ownerId",
            now(),
            now() + interval '10 years',
            'active',
            '{}' -- Array vazio
        ) RETURNING id INTO new_project_id;

        -- Colocar todos os treinos daquele usuário que estavam soltos dentro dessa pasta/projeto.
        UPDATE public.workouts 
        SET "projectId" = new_project_id 
        WHERE CAST("ownerId" AS TEXT) = CAST(orphan_owner."ownerId" AS TEXT)
          AND ("projectId" IS NULL OR CAST("projectId" AS TEXT) = '');

        fixed_count := fixed_count + 1;
    END LOOP;

    RAISE NOTICE 'Total de usuários que tiveram seus treinos órfãos resgatados para uma pasta: %', fixed_count;

END $$;
