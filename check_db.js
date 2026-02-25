const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- PROJECTS ---');
    const { data: p, error: pe } = await supabase.from('projects').select('*');
    if (pe) console.error(pe);
    else console.log(p.map(x => ({ id: x.id, name: x.name, status: x.status })));

    console.log('\n--- WORKOUTS ---');
    const { data: w, error: we } = await supabase.from('workouts').select('*');
    if (we) console.error(we);
    else console.log(w.map(x => ({ id: x.id, name: x.name, projectId: x.projectId })));
}
check();
