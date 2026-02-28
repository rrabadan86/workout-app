import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini SDK. The API key must be in the `.env.local` file as GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ── Retry helper with exponential backoff for rate-limit (429) errors ──
async function generateWithRetry(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  contents: Parameters<typeof model.generateContent>[0],
  maxRetries = 3
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(contents);
    } catch (error: any) {
      const msg = error.message || '';
      const isRateLimit = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED');

      if (isRateLimit && attempt < maxRetries) {
        // Exponential backoff: 15s, 30s, 60s
        const waitSec = 15 * Math.pow(2, attempt);
        console.log(`Rate-limited (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${waitSec}s...`);
        await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
      } else {
        throw error; // Not rate-limit, or out of retries
      }
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(req: NextRequest) {
  if (!genAI) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no servidor.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { focus, daysPerWeek, maxTimeMins, experienceLevel, limitations, lastProjectInfo, existingExercises } = body;

    // Build exercise list — only include description when it adds value (non-empty)
    const exerciseList = existingExercises
      .map((e: { id: string; name: string; muscle: string; description?: string }) => {
        const desc = e.description?.trim();
        return desc ? `${e.id} | ${e.name} | ${e.muscle} | ${desc}` : `${e.id} | ${e.name} | ${e.muscle}`;
      })
      .join('\n');

    const prompt = `Você é o Vimu, educador físico com mais de 15 anos de experiência prática, especialista em musculação, biomecânica e periodização de treinos. Possui pós-graduação em Fisiologia do Exercício e já atuou com atletas amadores e profissionais de alto rendimento. Você aplica as metodologias mais modernas da ciência do esporte, como princípios de sobrecarga progressiva, especificidade, variação de estímulos e recuperação adequada. Sua missão é criar programas de treino altamente eficazes, seguros e 100% personalizados ao perfil do aluno.

Crie um programa completo de Musculação para um usuário com as seguintes características:
- Foco/Objetivo: ${focus}
- Dias por semana: ${daysPerWeek}
- Tempo máximo por treino: ${maxTimeMins} minutos
- Nível de Experiência: ${experienceLevel}
${limitations ? `- Limitações ou restrições físicas: ${limitations}` : ''}
${lastProjectInfo ? `- Contexto do treino anterior (para evolução progressiva): ${lastProjectInfo}` : ''}

Diretrizes obrigatórias que você deve seguir ao montar o programa:
1. Respeite o princípio da sobrecarga progressiva: distribua o volume e a intensidade de forma coerente com o nível de experiência do aluno.
2. Aplique divisões de treino inteligentes (ex: Push/Pull/Legs, ABC, ABCDE) conforme o número de dias disponíveis.
3. Priorize exercícios compostos (multiarticulares) no início de cada treino e exercícios isoladores no final.
4. Respeite o tempo máximo por treino, considerando aproximadamente 2-3 minutos de descanso entre séries e ~1 minuto por série de execução.
5. Adapte o volume (número de séries e repetições) ao objetivo: hipertrofia (6-12 reps), força (3-6 reps), resistência (15+ reps), emagrecimento (12-20 reps com menor descanso).
6. Se houver limitações físicas, substitua exercícios que possam agravar a condição. Use a descrição dos exercícios para entender o equipamento e biomecânica envolvida.
7. Se houver treino anterior, evolua o programa com variação de exercícios ou aumento de volume para evitar estagnação. Não repita exatamente os mesmos exercícios e séries — mude ângulos, ordens ou técnicas.
8. REGRA CRÍTICA DE COERÊNCIA: Cada treino deve conter SOMENTE exercícios dos grupos musculares indicados no nome do treino. Se o treino se chama "Treino A - Peito, Costas e Ombros", ele NÃO pode conter exercícios de Bíceps, Tríceps, Pernas ou qualquer outro grupo não listado no nome. Verifique o campo "Músculo" de cada exercício da lista antes de incluí-lo. Exercícios de músculos secundários (como bíceps em treino de costas) NÃO devem ser adicionados separadamente — eles já serão ativados indiretamente nos exercícios compostos.

Você tem a seguinte lista de exercícios disponíveis no banco de dados do aplicativo (Listados como 'ID | Nome | Músculo | Descrição'):
${exerciseList}

Monte um programa com ${daysPerWeek} treinos diferentes. Cada treino deve conter exercícios escolhidos ESTRITAMENTE da lista acima. A quantidade de exercícios e séries por treino deve respeitar rigorosamente o limite de ${maxTimeMins} minutos.

Para cada exercício, defina séries e repetições com labels descritivos (ex: "Aquecimento", "Trabalho", "Drop-set", "Falha muscular") conforme a estratégia de treino mais adequada ao perfil do aluno.

Responda APENAS com um JSON válido e sem formatação Markdown extra contendo a exata estrutura abaixo:

{
  "projectName": "Nome do Treino Sugerido",
  "workouts": [
    {
      "name": "Nome da Treino (Ex: Treino A - Peito e Tríceps)",
      "order": 1,
      "exercises": [
        {
          "exerciseId": "ID-EXATO-DA-LISTA",
          "sets": [
            { "reps": 12, "label": "Aquecimento", "notes": "Foco na conexão mente-músculo" },
            { "reps": 10, "label": "Trabalho", "notes": "" },
            { "reps": 8, "label": "Trabalho", "notes": "Aumente o peso em relação à série anterior" }
          ]
        }
      ]
    }
  ]
}

Lembre-se: Use APENAS os IDs de exercícios da lista fornecida. Retorne APENAS o JSON, nada mais.`;

    // Use gemini-2.5-flash for better performance and potentially higher limits
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Use retry with exponential backoff for rate-limit resilience
    const result = await generateWithRetry(model, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    let responseText = result.response.text();

    try {
      // Clean up markdown block if the model returns it
      if (responseText.includes('```')) {
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const data = JSON.parse(responseText);

      // ── Post-generation validation: remove exercises with invalid IDs ──
      const validIds = new Set(
        existingExercises.map((e: { id: string }) => e.id)
      );

      if (data.workouts && Array.isArray(data.workouts)) {
        for (const workout of data.workouts) {
          if (workout.exercises && Array.isArray(workout.exercises)) {
            workout.exercises = workout.exercises.filter(
              (ex: { exerciseId: string }) => validIds.has(ex.exerciseId)
            );
          }
        }
        // Remove workouts that ended up with zero exercises after validation
        data.workouts = data.workouts.filter(
          (w: { exercises: unknown[] }) => w.exercises && w.exercises.length > 0
        );
      }

      if (!data.workouts || data.workouts.length === 0) {
        return NextResponse.json(
          { error: 'A IA não conseguiu mapear os exercícios corretamente. Tente novamente.' },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    } catch {
      console.error("Failed to parse JSON:", responseText);
      return NextResponse.json({ error: 'Erro ao gerar o formato do treino. Tente novamente.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Gemini API error:', error);

    const errorMessage = error.message || '';
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json(
        { error: 'Limite gratuito atingido. Aguarde 1 minuto e tente novamente. O sistema tentou automaticamente, mas o limite persiste.' },
        { status: 429 }
      );
    } else if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('overloaded')) {
      return NextResponse.json(
        { error: 'Os servidores da Inteligência Artificial estão congestionados no momento. Aguarde alguns instantes e clique em Gerar novamente.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: errorMessage || 'Erro interno no servidor' }, { status: 500 });
  }
}