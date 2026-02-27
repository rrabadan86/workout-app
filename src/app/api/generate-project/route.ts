import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini SDK. The API key must be in the `.env.local` file as GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req: NextRequest) {
  if (!genAI) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no servidor.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { focus, daysPerWeek, maxTimeMins, experienceLevel, limitations, lastProjectInfo, existingExercises } = body;

    // existingExercises now includes description for smarter exercise selection
    const exerciseList = existingExercises
      .map((e: { id: string; name: string; muscle: string; description?: string }) =>
        `${e.id} | ${e.name} | ${e.muscle}${e.description ? ` | ${e.description}` : ''}`
      )
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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    const result = await model.generateContent({
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
  } catch (error: unknown) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Erro interno no servidor' }, { status: 500 });
  }
}