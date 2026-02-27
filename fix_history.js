const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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

function uid() {
    return crypto.randomUUID();
}

async function fixHistory() {
    console.log("Buscando todos os logs...");
    const { data: logs, error: logsErr } = await supabase.from('workout_logs').select('*');

    if (logsErr) {
        console.error("Erro ao buscar logs", logsErr);
        return;
    }

    // Group logs by userId + workoutId + date
    const sessions = {};
    for (const log of logs) {
        if (!log.date) continue; // ignoring invalid dates
        const key = `${log.userId}|${log.workoutId}|${log.date}`;
        if (!sessions[key]) {
            sessions[key] = { userId: log.userId, workoutId: log.workoutId, date: log.date };
        }
    }

    console.log(`Encontradas ${Object.keys(sessions).length} treinos baseadas em logs.`);

    console.log("Buscando todos os feed_events de WO_COMPLETED...");
    const { data: events, error: evErr } = await supabase
        .from('feed_events')
        .select('*')
        .in('eventType', ['WO_COMPLETED', 'WO_COMPLETED_HIDDEN']);

    if (evErr) {
        console.error("Erro ao buscar eventos", evErr);
        return;
    }

    let inserted = 0;

    for (const key of Object.keys(sessions)) {
        const session = sessions[key];

        // Verifica se existe um evento para este usuário, referência e mesma data
        const eventExists = events.some(e => {
            if (e.userId !== session.userId || e.referenceId !== session.workoutId) return false;
            // Verifica a data
            const eDateObj = new Date(e.createdAt);
            const eDateStr = `${eDateObj.getFullYear()}-${String(eDateObj.getMonth() + 1).padStart(2, '0')}-${String(eDateObj.getDate()).padStart(2, '0')}`;
            return eDateStr === session.date;
        });

        if (!eventExists) {
            console.log(`-> Corrigindo retroativo para treino: ${session.date} | User: ${session.userId} | Workout: ${session.workoutId}`);

            // Inserir novo feed_event para preencher a lacuna
            const newEvent = {
                id: uid(),
                userId: session.userId,
                eventType: 'WO_COMPLETED',
                referenceId: session.workoutId,
                // Simulando que foi feito no meio-dia daquela data do treino para evitar bugs de fuso
                createdAt: `${session.date}T12:00:00.000Z`,
                duration: null
            };

            const { error: insErr } = await supabase.from('feed_events').insert(newEvent);
            if (insErr) {
                console.error("Erro ao inserir: ", insErr);
            } else {
                inserted++;
            }
        }
    }

    console.log(`\nFinalizado! Foram inseridos ${inserted} feed_events ausentes no banco.`);
}

fixHistory();
