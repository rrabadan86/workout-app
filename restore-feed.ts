import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const userId = "d4f799bc-b23b-419a-9a88-2234a80787c4";
    const workoutId = "96d443e8-9113-4756-847f-66cee145a590";

    const { data: logs, error: logsErr } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('userid', userId)
        .eq('workoutid', workoutId)
        .eq('date', '2026-03-04');

    if (logsErr) {
        console.error("Error fetching logs:", logsErr);
        return;
    }

    // 58 mins 26 seconds = 3506 seconds
    const durationObj = 3506;

    // Create a mock payload to render the completion percentage.
    const uniqueExercises = new Set(logs.map(l => l.exerciseid));
    const completedSets = logs.reduce((sum, log) => sum + log.sets.length, 0);

    // This user completed 14 / 30 sets for the "Peito / Costas / Hit". We will mock a generic string to trigger rendering
    // since we do not have total sets easily without fetching the project. But wait, History pulls the full Workout JSON directly to calculate percentages, so we just need WO_COMPLETED!

    const eventId = crypto.randomUUID();
    const eventType = `WO_COMPLETED`;

    // As seen in page.tsx, if eventType is just WO_COMPLETED without payload, the History app fetches `store.workouts.find(w => w.id === event.referenceId)` dynamically and rebuilds the whole list based on the logs we fetched.

    const { error: insertErr } = await supabase.from('feed_events').insert({
        id: eventId,
        user_id: userId,
        event_type: eventType,
        reference_id: workoutId,
        duration: durationObj,
        created_at: new Date('2026-03-04T12:00:00Z').toISOString()
    });

    if (insertErr) {
        console.error("Failed to insert:", insertErr);
    } else {
        console.log("Success! Regenerated WO_COMPLETED feed item.");
    }
}

run();
