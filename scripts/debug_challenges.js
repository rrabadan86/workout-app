const fs = require('fs');
const envFile = fs.readFileSync('c:\\AntiGravity\\workout-app\\.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const anonMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="(.*?)"/);

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(urlMatch[1], anonMatch[1]);

async function run() {
    console.log("Fetching challenges...");
    const { data: challenges, error: cErr } = await supabase.from('challenges').select('*').order('created_at', { ascending: false }).limit(5);
    if (cErr) console.error(cErr);
    console.log("Challenges:", JSON.stringify(challenges, null, 2));

    console.log("Fetching participants...");
    const challengeIds = challenges ? challenges.map(c => c.id) : [];
    const { data: parts } = await supabase.from('challenge_participants').select('*').in('challenge_id', challengeIds);
    console.log("Participants:", JSON.stringify(parts, null, 2));
}
run();
