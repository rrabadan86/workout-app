/**
 * ExerciseDB → Supabase GIF Mapper (v3 — Two-phase)
 * 
 * Phase 1 (MATCH): Fetch exercises, match PT→EN, save mapping to JSON
 *   node scripts/map-exercises.mjs match
 * 
 * Phase 2 (DOWNLOAD): Read mapping JSON, download GIFs, upload to Supabase
 *   node scripts/map-exercises.mjs download
 * 
 * Or run both at once:
 *   node scripts/map-exercises.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAPPING_FILE = resolve(__dirname, 'exercise-mapping.json');

// Auto-load .env.local
try {
    const envPath = resolve(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
} catch { }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXERCISEDB_API_KEY = process.env.EXERCISEDB_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── PT→EN Dictionary (pre-normalized, no accents) ────────────────────────
const PT_TO_EN = {
    'cadeira extensora': 'leg extension',
    'extensora': 'leg extension',
    'cadeira flexora': 'leg curl',
    'mesa flexora': 'lying leg curl',
    'flexora': 'leg curl',
    'supino reto': 'bench press',
    'supino reto barra': 'barbell bench press',
    'supino reto halteres': 'dumbbell bench press',
    'supino inclinado': 'incline bench press',
    'supino inclinado barra': 'barbell incline bench press',
    'supino inclinado halteres': 'dumbbell incline bench press',
    'supino declinado': 'decline bench press',
    'supino declinado halteres': 'dumbbell decline bench press',
    'crucifixo': 'dumbbell fly',
    'crucifixo reto': 'dumbbell fly',
    'crucifixo reto halteres': 'dumbbell fly',
    'crucifixo inclinado': 'incline dumbbell fly',
    'crucifixo inclinado halteres': 'incline dumbbell fly',
    'crucifixo inverso': 'reverse fly',
    'crossover': 'cable crossover',
    'crossover polia alta': 'cable crossover',
    'crossover polia baixa': 'cable crossover',
    'cross over': 'cable crossover',
    'peck deck': 'pec deck fly',
    'voador': 'pec deck fly',
    'flexao': 'push up',
    'flexao de braco': 'push up',
    'fly na maquina': 'pec deck fly',
    'chest press': 'chest press',
    'puxada frontal': 'lat pulldown',
    'puxada frontal supinada': 'lat pulldown',
    'puxada alta': 'lat pulldown',
    'puxada aberta': 'wide grip lat pulldown',
    'puxada fechada': 'close grip lat pulldown',
    'puxada': 'lat pulldown',
    'remada curvada': 'bent over row',
    'remada curvada barra': 'barbell bent over row',
    'remada curvada halteres': 'dumbbell bent over row',
    'remada unilateral': 'dumbbell row',
    'remada cavaleiro': 't bar row',
    'remada t': 't bar row',
    'remada na maquina': 'seated row',
    'remada sentada': 'cable seated row',
    'remada baixa': 'cable seated row',
    'remada': 'seated row',
    'pull up': 'pull up',
    'barra fixa': 'pull up',
    'pullover': 'dumbbell pullover',
    'pullover halteres': 'dumbbell pullover',
    'pullover halter': 'dumbbell pullover',
    'serratil': 'dumbbell pullover',
    'desenvolvimento': 'shoulder press',
    'desenvolvimento halteres': 'dumbbell shoulder press',
    'desenvolvimento barra': 'barbell shoulder press',
    'desenvolvimento militar': 'barbell shoulder press',
    'elevacao lateral': 'lateral raise',
    'elevacao frontal': 'front raise',
    'elevacao frontal halteres': 'dumbbell front raise',
    'face pull': 'face pull',
    'encolhimento': 'shrug',
    'encolhimento halteres': 'dumbbell shrug',
    'rosca direta': 'barbell curl',
    'rosca direta barra': 'barbell curl',
    'rosca direta halteres': 'dumbbell curl',
    'rosca alternada': 'alternate bicep curl',
    'rosca martelo': 'hammer curl',
    'rosca martelo halteres': 'dumbbell hammer curl',
    'rosca concentrada': 'concentration curl',
    'rosca scott': 'preacher curl',
    'rosca no banco scott': 'preacher curl',
    'rosca no cabo': 'cable curl',
    'rosca inclinada': 'incline curl',
    'rosca inversa': 'reverse curl',
    'rosca 21': 'barbell curl',
    'triceps pulley': 'pushdown',
    'triceps no pulley': 'pushdown',
    'triceps corda': 'rope pushdown',
    'triceps na corda': 'rope pushdown',
    'triceps frances': 'triceps extension',
    'triceps testa': 'lying triceps extension',
    'triceps na testa': 'lying triceps extension',
    'triceps mergulho': 'dip',
    'mergulho': 'dip',
    'triceps coice': 'kickback',
    'triceps banco': 'bench dip',
    'extensao de triceps': 'triceps extension',
    'agachamento': 'squat',
    'agachamento livre': 'barbell squat',
    'agachamento barra': 'barbell squat',
    'agachamento smith': 'smith machine squat',
    'agachamento no smith': 'smith machine squat',
    'agachamento bulgaro': 'bulgarian split squat',
    'agachamento frontal': 'front squat',
    'agachamento hack': 'hack squat',
    'hack squat': 'hack squat',
    'agachamento sumo': 'sumo squat',
    'leg press': 'leg press',
    'leg press 45': 'leg press',
    'leg press horizontal': 'leg press',
    'stiff': 'stiff leg deadlift',
    'levantamento terra': 'deadlift',
    'terra': 'deadlift',
    'afundo': 'lunge',
    'afundo halteres': 'dumbbell lunge',
    'afundo barra': 'barbell lunge',
    'avanco': 'lunge',
    'passada': 'walking lunge',
    'bulgaro': 'bulgarian split squat',
    'abducao': 'hip abduction',
    'abducao na maquina': 'hip abduction machine',
    'aducao': 'hip adduction',
    'aducao na maquina': 'hip adduction machine',
    'elevacao pelvica': 'hip thrust',
    'hip thrust': 'hip thrust',
    'gluteo na maquina': 'glute machine',
    'gluteo no cabo': 'cable kickback',
    'coice': 'kickback',
    'coice no cabo': 'cable kickback',
    'gluteo 4 apoios': 'glute kickback',
    'panturrilha em pe': 'standing calf raise',
    'panturrilha sentado': 'seated calf raise',
    'panturrilha no leg press': 'calf raise',
    'panturrilha': 'calf raise',
    'gemeos': 'calf raise',
    'extensao lombar': 'back extension',
    'abdominal': 'crunch',
    'abdominal reto': 'crunch',
    'abdominal supra': 'crunch',
    'abdominal infra': 'reverse crunch',
    'abdominal obliquo': 'oblique crunch',
    'prancha': 'plank',
    'prancha frontal': 'plank',
    'prancha lateral': 'side plank',
    'esteira': 'treadmill',
    'bicicleta': 'stationary bike',
    'eliptico': 'elliptical',
    'corda': 'jump rope',
    'pular corda': 'jump rope',
    'corrida': 'run',
};

function normalize(s) {
    return s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
            );
    return dp[m][n];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: MATCH — fetch from ExerciseDB + match + save to JSON
// ═══════════════════════════════════════════════════════════════════════════
async function phaseMatch() {
    if (!EXERCISEDB_API_KEY) {
        console.error('❌ Missing EXERCISEDB_API_KEY');
        process.exit(1);
    }

    console.log('📋 Phase 1: MATCH\n');

    // 1. Get exercises from Supabase
    const { data: exercises, error } = await supabase.from('exercises').select('*');
    if (error) { console.error('❌ Supabase error:', error); process.exit(1); }
    const toProcess = exercises.filter(e => !e.gif_url);
    console.log(`   ${toProcess.length} exercises need GIF mapping\n`);

    if (toProcess.length === 0) { console.log('✅ All done!'); return; }

    // 2. Paginate ExerciseDB API
    console.log('🌐 Fetching from ExerciseDB (paginated)...');
    const apiExercises = [];
    let offset = 0, requests = 0;
    while (requests < 100) {
        process.stdout.write(`\r   Batch ${requests + 1}... (${apiExercises.length} exercises)`);
        try {
            const res = await fetch(`https://exercisedb.p.rapidapi.com/exercises?limit=10&offset=${offset}`, {
                headers: { 'X-RapidAPI-Key': EXERCISEDB_API_KEY, 'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com' }
            });
            requests++;
            if (!res.ok) {
                if (res.status === 429) { console.log('\n   Rate limited, waiting...'); await sleep(3000); continue; }
                break;
            }
            const batch = await res.json();
            if (!Array.isArray(batch) || batch.length === 0) break;
            apiExercises.push(...batch);
            offset += 10;
            await sleep(300);
        } catch { break; }
    }
    console.log(`\n   ✅ Fetched ${apiExercises.length} exercises (${requests} API calls)\n`);

    if (apiExercises.length === 0) { console.error('❌ No exercises from API!'); process.exit(1); }

    // 3. Match
    const sortedDict = Object.entries(PT_TO_EN).sort((a, b) => b[0].length - a[0].length);
    const matched = [];
    const unmatched = [];

    for (const ex of toProcess) {
        const nameNorm = normalize(ex.name);
        let enName = null;
        for (const [pt, en] of sortedDict) {
            if (nameNorm === pt || nameNorm.includes(pt)) { enName = en; break; }
        }

        let bestMatch = null, bestScore = Infinity;
        const terms = [];
        if (enName) terms.push(normalize(enName));
        terms.push(nameNorm);

        for (const term of terms) {
            for (const apiEx of apiExercises) {
                const apiNorm = normalize(apiEx.name);
                if (apiNorm === term) { bestScore = 0; bestMatch = apiEx; break; }
                if (apiNorm.includes(term) || term.includes(apiNorm)) {
                    const d = Math.abs(apiNorm.length - term.length);
                    if (d < bestScore) { bestScore = d; bestMatch = apiEx; }
                    continue;
                }
                const d = levenshtein(term, apiNorm);
                if (d < bestScore) { bestScore = d; bestMatch = apiEx; }
            }
            if (bestScore === 0) break;
        }

        const minLen = Math.min(enName ? normalize(enName).length : nameNorm.length, bestMatch ? normalize(bestMatch.name).length : 999);
        const threshold = Math.ceil(minLen * 0.55);

        if (bestMatch && bestScore <= threshold) {
            matched.push({ dbId: ex.id, dbName: ex.name, apiId: bestMatch.id, apiName: bestMatch.name, score: bestScore });
        } else {
            unmatched.push({ dbId: ex.id, dbName: ex.name, muscle: ex.muscle, enName, closestApi: bestMatch?.name, score: bestScore });
        }
    }

    // 4. Save mapping
    const mapping = { matched, unmatched, savedAt: new Date().toISOString() };
    writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

    console.log(`✅ Matched: ${matched.length} / ${toProcess.length}`);
    console.log(`❌ Unmatched: ${unmatched.length}`);
    console.log(`\n💾 Mapping saved to: ${MAPPING_FILE}`);
    console.log(`\n👉 Now run: node scripts/map-exercises.mjs download`);

    if (unmatched.length > 0) {
        console.log('\n📋 Unmatched exercises:');
        for (const u of unmatched) {
            console.log(`   • ${u.dbName} (${u.muscle})${u.enName ? ` → "${u.enName}"` : ''}`);
            if (u.closestApi) console.log(`     Closest: "${u.closestApi}" (dist: ${u.score})`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: DOWNLOAD — read mapping, download GIFs via image endpoint, upload
// ═══════════════════════════════════════════════════════════════════════════
async function phaseDownload() {
    if (!EXERCISEDB_API_KEY) {
        console.error('❌ Missing EXERCISEDB_API_KEY');
        process.exit(1);
    }
    if (!existsSync(MAPPING_FILE)) {
        console.error('❌ Mapping file not found. Run: node scripts/map-exercises.mjs match');
        process.exit(1);
    }

    console.log('📋 Phase 2: DOWNLOAD\n');

    const mapping = JSON.parse(readFileSync(MAPPING_FILE, 'utf-8'));
    console.log(`   ${mapping.matched.length} exercises to download GIFs for\n`);

    // Ensure bucket exists
    await supabase.storage.createBucket('exercise-media', {
        public: true,
        allowedMimeTypes: ['image/gif', 'image/webp', 'image/png', 'image/jpeg'],
        fileSizeLimit: 5 * 1024 * 1024,
    }).catch(() => { });

    let success = 0, failed = 0;

    for (const { dbId, dbName, apiId, apiName, score } of mapping.matched) {
        try {
            console.log(`⬇️  ${dbName} → ${apiName}`);

            // Use the correct image endpoint with query params
            const imageUrl = `https://exercisedb.p.rapidapi.com/image/${apiId}`;
            const res = await fetch(imageUrl, {
                headers: {
                    'X-RapidAPI-Key': EXERCISEDB_API_KEY,
                    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
                }
            });

            if (!res.ok) {
                // Try alternative URL format
                const altUrl = `https://exercisedb.p.rapidapi.com/image?exerciseId=${apiId}&resolution=180`;
                const altRes = await fetch(altUrl, {
                    headers: {
                        'X-RapidAPI-Key': EXERCISEDB_API_KEY,
                        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
                    }
                });
                if (!altRes.ok) throw new Error(`HTTP ${res.status} (tried both URL formats)`);
                var gifBuffer = Buffer.from(await altRes.arrayBuffer());
            } else {
                var gifBuffer = Buffer.from(await res.arrayBuffer());
            }

            if (gifBuffer.length < 500) throw new Error(`Response too small (${gifBuffer.length}b)`);

            // Upload to Supabase Storage
            const fileName = `${dbId}.gif`;
            const { error: upErr } = await supabase.storage
                .from('exercise-media')
                .upload(fileName, gifBuffer, { contentType: 'image/gif', upsert: true });
            if (upErr) throw upErr;

            const { data } = supabase.storage.from('exercise-media').getPublicUrl(fileName);

            await supabase.from('exercises')
                .update({ thumbnail_url: data.publicUrl, gif_url: data.publicUrl })
                .eq('id', dbId);

            console.log(`   ✅ Done\n`);
            success++;
            await sleep(500);
        } catch (err) {
            console.error(`   ❌ ${err.message}\n`);
            failed++;
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RELATÓRIO FINAL');
    console.log('═'.repeat(60));
    console.log(`   ✅ Com GIF:       ${success}`);
    console.log(`   ❌ Falha:         ${failed}`);
    console.log(`   ⚠️  Sem match:    ${mapping.unmatched.length}`);
    console.log('═'.repeat(60));
}

// ─── Entry point ───────────────────────────────────────────────────────────
const command = process.argv[2] || 'all';

if (command === 'match') {
    phaseMatch().catch(console.error);
} else if (command === 'download') {
    phaseDownload().catch(console.error);
} else {
    // Run both
    phaseMatch().then(() => {
        console.log('\n\n' + '─'.repeat(60) + '\n');
        return phaseDownload();
    }).catch(console.error);
}
