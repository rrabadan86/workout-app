-- 1) Retroactive update for existing users who already have prescribed workouts

UPDATE public.profiles p
SET "friendIds" = COALESCE((
  SELECT jsonb_agg(DISTINCT el)
  FROM (
    SELECT jsonb_array_elements_text(COALESCE(p."friendIds", '[]'::jsonb)) AS el
    UNION
    SELECT prescribed_to::text AS el FROM public.projects WHERE prescribed_by = p.id AND prescribed_to IS NOT NULL
    UNION
    SELECT prescribed_by::text AS el FROM public.projects WHERE prescribed_to = p.id AND prescribed_by IS NOT NULL
  ) sub
  WHERE el IS NOT NULL
), '[]'::jsonb)
WHERE EXISTS (
  SELECT 1 FROM public.projects pr
  WHERE (pr.prescribed_by = p.id AND pr.prescribed_to IS NOT NULL)
     OR (pr.prescribed_to = p.id AND pr.prescribed_by IS NOT NULL)
);


-- 2) Create a database function and trigger to automatically follow going forward

CREATE OR REPLACE FUNCTION auto_follow_on_prescription()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tem personal e tem aluno vinculados neste projeto/treino
    IF (NEW.prescribed_by IS NOT NULL AND NEW.prescribed_to IS NOT NULL) THEN
        
        -- Garante que o Personal vai seguir o Aluno
        UPDATE public.profiles
        SET "friendIds" = COALESCE((
            SELECT jsonb_agg(DISTINCT el)
            FROM (
                SELECT jsonb_array_elements_text(COALESCE("friendIds", '[]'::jsonb)) AS el
                UNION
                SELECT NEW.prescribed_to::text
            ) sub
            WHERE el IS NOT NULL
        ), '[]'::jsonb)
        WHERE id = NEW.prescribed_by;

        -- Garante que o Aluno vai seguir o Personal
        UPDATE public.profiles
        SET "friendIds" = COALESCE((
            SELECT jsonb_agg(DISTINCT el)
            FROM (
                SELECT jsonb_array_elements_text(COALESCE("friendIds", '[]'::jsonb)) AS el
                UNION
                SELECT NEW.prescribed_by::text
            ) sub
            WHERE el IS NOT NULL
        ), '[]'::jsonb)
        WHERE id = NEW.prescribed_to;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_follow_prescription ON public.projects;

CREATE TRIGGER trigger_auto_follow_prescription
AFTER INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION auto_follow_on_prescription();
