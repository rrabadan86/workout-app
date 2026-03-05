const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1]] = match[2].trim().replace(/^"/, '').replace(/"$/, '').replace(/\r$/, '');
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const key = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function run() {
    const res = await fetch(`${url}/rest/v1/workout_logs?select=workoutId,date&userId=eq.d4f799bc-b23b-419a-9a88-2234a80787c4`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log(await res.json());
}
run();
