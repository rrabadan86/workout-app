const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data: profiles } = await supabase.from('profiles').select('id, email, name');
    console.log('--- PROFILES ---');
    console.log(profiles);

    const { data: p } = await supabase.from('projects').select('id, name, "ownerId", "sharedWith"');
    console.log('\n--- PROJECTS ---');
    console.log(p);

    const { data: w } = await supabase.from('workouts').select('id, name, "ownerId", "projectId"');
    console.log('\n--- WORKOUTS ---');
    console.log(w);
}
check();
