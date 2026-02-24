-- Insert exercises with auto-generated UUIDs
INSERT INTO exercises (id, name, muscle, description, "createdBy")
VALUES 
    -- Peito (Chest)
    (gen_random_uuid(), 'SUPINO INCLINADO (BARRA)', 'Peito', 'Supino em banco inclinado com barra.', 'system'),
    (gen_random_uuid(), 'SUPINO INCLINADO (HALTERES)', 'Peito', 'Supino em banco inclinado com halteres.', 'system'),
    (gen_random_uuid(), 'SUPINO DECLINADO', 'Peito', 'Supino em banco declinado com barra ou halteres.', 'system'),
    (gen_random_uuid(), 'CRUCIFIXO RETO (HALTERES)', 'Peito', 'Crucifixo em banco reto com halteres.', 'system'),
    (gen_random_uuid(), 'CRUCIFIXO INCLINADO', 'Peito', 'Crucifixo em banco inclinado com halteres.', 'system'),
    (gen_random_uuid(), 'CROSSOVER POLIA ALTA', 'Peito', 'Cruzamento de cabos na polia alta.', 'system'),
    (gen_random_uuid(), 'CROSSOVER POLIA BAIXA', 'Peito', 'Cruzamento de cabos na polia baixa.', 'system'),
    (gen_random_uuid(), 'FLEXÃO DE BRAÇO', 'Peito', 'Flexão de braço tradicional no solo.', 'system'),

    -- Costas (Back)
    (gen_random_uuid(), 'BARRA FIXA', 'Costas', 'Elevação do corpo em barra fixa supinada ou pronada.', 'system'),
    (gen_random_uuid(), 'PUXADA FRONTAL SUPINADA', 'Costas', 'Puxada na máquina com pegada supinada.', 'system'),
    (gen_random_uuid(), 'REMADA CURVADA (BARRA)', 'Costas', 'Remada com barra e tronco curvado.', 'system'),
    (gen_random_uuid(), 'REMADA CURVADA (HALTERES)', 'Costas', 'Remada com halteres e tronco curvado.', 'system'),
    (gen_random_uuid(), 'REMADA UNILATERAL', 'Costas', 'Remada unilateral com haltere (serrote).', 'system'),
    (gen_random_uuid(), 'PULLDOWN', 'Costas', 'Extensão de ombros na polia (pull-over na polia).', 'system'),
    (gen_random_uuid(), 'LEVANTAMENTO TERRA', 'Costas', 'Levantamento de barra do chão até a extensão do quadril.', 'system'),
    (gen_random_uuid(), 'EXTENSÃO LOMBAR', 'Costas', 'Extensão do tronco em banco romano.', 'system'),

    -- Pernas (Legs)
    (gen_random_uuid(), 'MESA FLEXORA', 'Pernas', 'Flexão de joelhos deitado na máquina.', 'system'),
    (gen_random_uuid(), 'LEG PRESS 45º', 'Pernas', 'Extensão de pernas no Leg Press 45 graus.', 'system'),
    (gen_random_uuid(), 'LEG PRESS HORIZONTAL', 'Pernas', 'Extensão de pernas no Leg Press horizontal.', 'system'),
    (gen_random_uuid(), 'STIFF', 'Pernas', 'Flexão de quadril com joelhos semi-estendidos com barra ou halteres.', 'system'),
    (gen_random_uuid(), 'AFUNDO (HALTERES)', 'Pernas', 'Avanço unilateral no lugar com halteres.', 'system'),
    (gen_random_uuid(), 'AFUNDO (BARRA)', 'Pernas', 'Avanço unilateral no lugar com barra livre ou no smith.', 'system'),
    (gen_random_uuid(), 'PASSADA', 'Pernas', 'Avanço com deslocamento (walking lunge).', 'system'),
    (gen_random_uuid(), 'LEVANTAMENTO PÉLVICO', 'Pernas', 'Extensão de quadril com as costas apoiadas no banco (hip thrust).', 'system'),
    (gen_random_uuid(), 'CADEIRA ADUTORA', 'Pernas', 'Adução de pernas na máquina.', 'system'),
    (gen_random_uuid(), 'CADEIRA ABDUTORA', 'Pernas', 'Abdução de pernas na máquina.', 'system'),

    -- Ombros (Shoulders)
    (gen_random_uuid(), 'DESENVOLVIMENTO COM HALTERES', 'Ombros', 'Desenvolvimento de ombros sentado com halteres.', 'system'),
    (gen_random_uuid(), 'DESENVOLVIMENTO NA MÁQUINA', 'Ombros', 'Desenvolvimento de ombros na máquina articulada.', 'system'),
    (gen_random_uuid(), 'ELEVAÇÃO LATERAL NA POLIA', 'Ombros', 'Elevação lateral de ombros usando a polia.', 'system'),
    (gen_random_uuid(), 'CRUCIFIXO INVERSO (MÁQUINA)', 'Ombros', 'Abdução horizontal de ombros na máquina voador.', 'system'),
    (gen_random_uuid(), 'CRUCIFIXO INVERSO (HALTERES)', 'Ombros', 'Abdução horizontal de ombros curvado com halteres.', 'system'),
    (gen_random_uuid(), 'ENCOLHIMENTO (BARRA)', 'Ombros', 'Elevação de escápulas com barra para o trapézio.', 'system'),
    (gen_random_uuid(), 'ENCOLHIMENTO (HALTERES)', 'Ombros', 'Elevação de escápulas com halteres para o trapézio.', 'system'),
    (gen_random_uuid(), 'ELEVAÇÃO FRONTAL NA POLIA', 'Ombros', 'Elevação frontal de ombros usando a polia.', 'system'),

    -- Bíceps (Biceps)
    (gen_random_uuid(), 'ROSCA ALTERNADA (HALTERES)', 'Bíceps', 'Flexão de cotovelos alternada com halteres.', 'system'),
    (gen_random_uuid(), 'ROSCA MARTELO (HALTERES)', 'Bíceps', 'Flexão de cotovelos com pegada neutra e halteres.', 'system'),
    (gen_random_uuid(), 'ROSCA MARTELO (CORDA)', 'Bíceps', 'Flexão de cotovelos com pegada neutra na polia com corda.', 'system'),
    (gen_random_uuid(), 'ROSCA SCOTT (MÁQUINA)', 'Bíceps', 'Flexão de cotovelos apoiado no banco Scott em máquina.', 'system'),
    (gen_random_uuid(), 'ROSCA SCOTT (BARRA W)', 'Bíceps', 'Flexão de cotovelos apoiado no banco Scott com barra W.', 'system'),
    (gen_random_uuid(), 'ROSCA CONCENTRADA', 'Bíceps', 'Flexão de cotovelo unilateral com braço apoiado na perna.', 'system'),
    (gen_random_uuid(), 'ROSCA DIRETA NA POLIA BAIXA', 'Bíceps', 'Flexão de cotovelos na polia baixa com barra reta.', 'system'),

    -- Tríceps (Triceps)
    (gen_random_uuid(), 'TRÍCEPS PULLEY (CORDA)', 'Tríceps', 'Extensão de cotovelos na polia alta com corda.', 'system'),
    (gen_random_uuid(), 'TRÍCEPS PULLEY (BARRA RETA)', 'Tríceps', 'Extensão de cotovelos na polia alta com barra reta.', 'system'),
    (gen_random_uuid(), 'TRÍCEPS PULLEY (BARRA V)', 'Tríceps', 'Extensão de cotovelos na polia alta com barra V.', 'system'),
    (gen_random_uuid(), 'TRÍCEPS TESTA (BARRA W)', 'Tríceps', 'Extensão de cotovelos deitado no banco com barra W.', 'system'),
    (gen_random_uuid(), 'TRÍCEPS TESTA (HALTERES)', 'Tríceps', 'Extensão de cotovelos deitado no banco com halteres.', 'system'),
    (gen_random_uuid(), 'TRÍCEPS FRANCÊS (HALTERA)', 'Tríceps', 'Extensão de cotovelos acima da cabeça com um haltere.', 'system'),
    (gen_random_uuid(), 'TRÍCEPS FRANCÊS (POLIA)', 'Tríceps', 'Extensão de cotovelos acima da cabeça na polia.', 'system'),
    (gen_random_uuid(), 'MERGULHO (MÁQUINA)', 'Tríceps', 'Extensão de cotovelos na máquina de mergulho guiada.', 'system'),
    (gen_random_uuid(), 'TRÍCEPS COICE (HALTERES)', 'Tríceps', 'Extensão de cotovelo com o tronco curvado usando haltere.', 'system'),
    (gen_random_uuid(), 'TRÍCEPS COICE (POLIA)', 'Tríceps', 'Extensão de cotovelo com o tronco curvado usando a polia.', 'system'),

    -- Abdômen (Core)
    (gen_random_uuid(), 'PRANCHA ISOMÉTRICA', 'Abdômen', 'Sustentação do corpo no solo apoiado nos antebraços e ponta dos pés.', 'system'),
    (gen_random_uuid(), 'ABDOMINAL INFRA', 'Abdômen', 'Elevação de pernas pendurado na barra fixa.', 'system'),
    (gen_random_uuid(), 'ABDOMINAL MÁQUINA', 'Abdômen', 'Flexão de tronco na máquina.', 'system'),
    (gen_random_uuid(), 'ABDOMINAL OBLÍQUO (POLIA)', 'Abdômen', 'Flexão lateral do tronco na polia alta.', 'system'),
    (gen_random_uuid(), 'ABDOMINAL OBLÍQUO (SOLO)', 'Abdômen', 'Flexão lateral do tronco deitado no solo.', 'system'),
    (gen_random_uuid(), 'ABDOMINAL REMADOR', 'Abdômen', 'Flexão completa do tronco abraçando os joelhos.', 'system'),

    -- Panturrilha (Calves)
    (gen_random_uuid(), 'PANTURRILHA SENTADO (SÓLEO)', 'Panturrilha', 'Flexão plantar sentado na máquina.', 'system'),
    (gen_random_uuid(), 'PANTURRILHA EM PÉ (MÁQUINA)', 'Panturrilha', 'Flexão plantar em pé na máquina.', 'system'),
    (gen_random_uuid(), 'PANTURRILHA EM PÉ (DEGRAU)', 'Panturrilha', 'Flexão plantar em pé no degrau (peso do corpo ou halteres).', 'system'),
    (gen_random_uuid(), 'PANTURRILHA NO LEG PRESS', 'Panturrilha', 'Flexão plantar no aparelho Leg Press.', 'system'),

    -- Aeróbico (Cardio)
    (gen_random_uuid(), 'ESTEIRA (CAMINHADA)', 'Aeróbico', 'Caminhada na esteira ergométrica.', 'system'),
    (gen_random_uuid(), 'ESTEIRA (CORRIDA)', 'Aeróbico', 'Corrida na esteira ergométrica.', 'system'),
    (gen_random_uuid(), 'BICICLETA ERGOMÉTRICA', 'Aeróbico', 'Pedalada em bicicleta estacionária.', 'system'),
    (gen_random_uuid(), 'TRANSPORT / ELÍPTICO', 'Aeróbico', 'Exercício no aparelho elíptico.', 'system'),
    (gen_random_uuid(), 'MÁQUINA DE ESCADA', 'Aeróbico', 'Exercício na máquina simuladora de escadas.', 'system'),
    (gen_random_uuid(), 'PULAR CORDA', 'Aeróbico', 'Exercício cardiovascular pulando corda.', 'system');
