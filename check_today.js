const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = line.split('=')[1].replace(/"/g, '');
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        supabaseKey = line.split('=')[1].replace(/"/g, '');
    }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("== Consultando o Banco de Dados do uFit ==");
    const userId = "d4f799bc-b23b-419a-9a88-2234a80787c4"; // O ID do rrabadan do script anterior

    // Pegar logs do dia 25/02/2026
    const { data: logs, error: logsErr } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('userId', userId)
        .eq('date', '2026-02-25');

    if (logsErr) {
        console.error("Erro ao buscar logs:", logsErr);
    } else {
        console.log(`\n=> Encontrados ${logs?.length || 0} exercícios gravados para HOJE (25/02/2026):`);
        let totalSets = 0;
        let totalVolume = 0;
        logs.forEach(l => {
            totalSets += l.sets.length;
            const vol = l.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0);
            totalVolume += vol;
        });
        console.log(`Você salvou um total de ${totalSets} séries hoje, somando ${totalVolume} kg levantados.`);

        if (logs.length > 0) {
            console.log("\nAqui está uma das séries para atestar a comunicação:");
            console.log(logs[0].sets);
        }
    }

    // Checar se o feed_event de conclusão foi gerado
    const { data: events, error: evErr } = await supabase
        .from('feed_events')
        .select('*')
        .eq('userId', userId)
        .gte('createdAt', '2026-02-25T00:00:00.000Z');

    if (evErr) {
        console.error("Erro eventos:", evErr);
    } else {
        const completedEvents = events.filter(e => e.eventType === 'WO_COMPLETED');
        console.log(`\n=> Encontrados ${completedEvents.length} eventos de CONCLUSÃO de treino hoje.`);
        if (completedEvents.length > 0) {
            console.log(`Duração gravada no banco de dados para o seu último treino de hoje: ${completedEvents[0].duration} segundos.`);
        } else {
            console.log("O botão de Finalizar ainda não disparou o registro definitivo no feed.");
        }
    }
}

run();
