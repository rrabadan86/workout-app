import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- PROJECTS ---');
    const { data: projects, error: pErr } = await supabase.from('projects').select('*');
    if (pErr) console.error(pErr);
    else console.log(projects?.map(p => ({ id: p.id, name: p.name, owner: p.ownerId })));

    console.log('--- WORKOUTS ---');
    const { data: workouts, error: wErr } = await supabase.from('workouts').select('*');
    if (wErr) console.error(wErr);
    else console.log(workouts?.map(w => ({ id: w.id, name: w.name, projectId: w.projectId, owner: w.ownerId })));
}

checkData();
