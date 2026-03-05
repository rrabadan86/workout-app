const fs = require('fs');
const crypto = require('crypto');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        // Remove trailing \r from Windows files and quotes
        let val = match[2].trim().replace(/^"/, '').replace(/"$/, '').replace(/\r$/, '');
        envVars[match[1]] = val;
    }
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const key = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function run() {
    console.log(`Sending to: ${url}/rest/v1/feed_events`);

    // Convert duration to postgres interval by inserting an integer into duration (history feed expects seconds)
    // Also use the exact casing of original camelCase since it is postgREST mapping.

    const res = await fetch(`${url}/rest/v1/feed_events`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            id: crypto.randomUUID(),
            userId: 'd4f799bc-b23b-419a-9a88-2234a80787c4',
            eventType: 'WO_COMPLETED_HIDDEN',
            referenceId: '96d443e8-9113-4756-847f-66cee145a590',
            duration: 3506,
            createdAt: '2026-03-04T12:00:00.000Z'
        })
    });

    const data = await res.json();
    console.log("Response:", data);
}

run();
