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

    // existingExercises is a list of object { id, name, muscle } to help the AI map exercises.

    const prompt = `Você é um personal trainer especialista e altamente técnico.
Crie um projeto de Musculação para um usuário com as seguintes características:
- Foco: ${focus}
- Dias por semana: ${daysPerWeek}
- Tempo máximo por treino: ${maxTimeMins} minutos
- Nível de Experiência: ${experienceLevel}
${limitations ? `- Limitações ou restrições: ${limitations}` : ''}
${lastProjectInfo ? `- Contexto do projeto anterior: ${lastProjectInfo}` : ''}

Você tem a seguinte lista de exercícios disponíveis no banco de dados do aplicativo (Listados como 'ID | Nome | Músculo'):
${existingExercises.map((e: any) => `${e.id} | ${e.name} | ${e.muscle}`).join('\n')}

Seu objetivo é montar um projeto que contenha de ${daysPerWeek} treinos diferentes (ex: Treino A, Treino B, etc).
Cada treino deve conter uma lista de exercícios escolhidos ESTRITAMENTE da lista fornecida acima. A quantidade de exercícios e séries por treino deve respeitar o limite de tempo de ${maxTimeMins} minutos (assumindo descanso e execução).
Você deve retornar os IDs exatos dos exercícios escolhidos.
Para cada exercício, defina a quantidade de séries (sets) e as repetições (ex: 10, 12, ou "Até a falha").

Responda APENAS com um JSON válido e sem formatação Markdown extra contendo a exata estrutura abaixo:

{
  "projectName": "Nome do Projeto Sugerido",
  "workouts": [
    {
      "name": "Nome do Treino (Ex: Treino A - Peito e Tríceps)",
      "order": 1,
      "exercises": [
        {
          "exerciseId": "ID-EXATO-DA-LISTA",
          "sets": [
            { "reps": 12, "label": "Aquecimento", "notes": "" },
            { "reps": 10, "label": "Trabalho", "notes": "" },
            { "reps": 8, "label": "Trabalho", "notes": "" }
          ]
        }
      ]
    }
  ]
}
Lembre-se: Use APENAS os IDs de exercícios da lista fornecida. Retorne APENAS o JSON, nada mais.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
      return NextResponse.json(data);
    } catch (jsonErr) {
      console.error("Failed to parse JSON:", responseText);
      return NextResponse.json({ error: 'Erro ao gerar o formato do treino. Tente novamente.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
