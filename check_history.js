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
    console.log("Fetching all logs for User d4f799bc-b23b-419a-9a88-2234a80787c4...");
    const { data: logs, error: logsErr } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('userId', 'd4f799bc-b23b-419a-9a88-2234a80787c4');

    if (logsErr) {
        console.error("Logs Error:", logsErr);
    } else {
        const dates = [...new Set(logs.map(l => l.date))];
        console.log(`Dates with logs:`, dates);

        const feblogs = logs.filter(l => l.date && l.date.includes('2026-02'));
        console.log(`Logs in Feb:`, feblogs.length);
        if (feblogs.length > 0) {
            console.log("Sample Feb logs dates:", [...new Set(feblogs.map(l => l.date))]);
            // check workoutIds of these logs
            const wIds = [...new Set(feblogs.map(l => l.workoutId))];
            console.log("Workout IDs for Feb logs:", wIds);

            // Do feed events exist for these ids?
            for (let wid of wIds) {
                const { data: fe } = await supabase.from('feed_events').select('*').eq('referenceId', wid).eq('userId', 'd4f799bc-b23b-419a-9a88-2234a80787c4');
                console.log(`Feed events for workoutId ${wid}: `, fe?.length);
            }
        }
    }
}

run();
