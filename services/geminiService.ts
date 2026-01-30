
import { GoogleGenAI, Type } from "@google/genai";
import { Course } from '../types';

const courseSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: "The main topic or subject of the course." },
    title: { type: Type.STRING, description: "The main title of the course." },
    description: { type: Type.STRING, description: "A short, engaging description of the course." },
    modules: {
      type: Type.ARRAY,
      description: "A list of modules, each representing a main section of the course.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The title of the module." },
          lessons: {
            type: Type.ARRAY,
            description: "A list of lessons within the module.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "The title of the lesson." },
              },
              required: ["title"],
            },
          },
        },
        required: ["title", "lessons"],
      },
    },
  },
  required: ["topic", "title", "description", "modules"],
};

/**
 * Helper to clean the response text from Markdown code blocks (```json ... ```)
 * which Gemini often includes even when instructed to return JSON.
 */
const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  // Remove markdown code block syntax if present
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  return clean;
};

export const generateCourseFromText = async (text: string): Promise<Course | null> => {
  try {
    // Initializing AI client inside the function to ensure the correct environment variables are captured
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Você é um Arquiteto Pedagógico de IA. Sua missão é analisar o texto fornecido e projetar a estrutura de um curso online. Você deve operar com base em princípios de Design Instrucional, como o modelo ADDIE e a Taxonomia de Bloom, para garantir uma jornada de aprendizado lógica e eficaz.

Siga estas etapas:
1.  **Análise:** Identifique os temas centrais, o público-alvo implícito e os principais objetivos de aprendizado contidos no texto.
2.  **Design Estrutural:** Organize o conteúdo em uma hierarquia de Módulos e Aulas. A sequência deve seguir uma progressão de complexidade cognitiva, começando com conceitos fundamentais e avançando para tópicos mais aplicados ou complexos.
3.  **Saída:** Gere um título de curso atraente, identifique o tópico principal, crie uma descrição concisa e a estrutura de módulos e aulas.

Texto para análise:
---
${text.substring(0, 30000)}
---
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: courseSchema,
      }
    });

    const rawText = response.text || "{}";
    const cleanedText = cleanJsonString(rawText);
    const jsonResponse = JSON.parse(cleanedText);

    // Add unique IDs and initial content to the generated structure
    const courseWithIds: Course = {
      id: `course-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ...jsonResponse,
      createdAt: Date.now(),
      lastAccess: Date.now(),
      modules: jsonResponse.modules.map((module: any, moduleIndex: number) => ({
        ...module,
        id: `m-${moduleIndex}`,
        lessons: module.lessons.map((lesson: any, lessonIndex: number) => ({
          ...lesson,
          id: `m-${moduleIndex}-l-${lessonIndex}`,
          content: `Conteúdo para "${lesson.title}" será gerado aqui.`
        }))
      }))
    };
    
    return courseWithIds;

  } catch (error) {
    console.error("Error generating course structure:", error);
    return null;
  }
};

export const generateLessonContent = async (lessonTitle: string): Promise<string> => {
    try {
        // Fresh AI instance for each generation task
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Você é o "Didata", uma IA geradora de conteúdo educacional de elite. Sua tarefa é criar um conteúdo de aula detalhado sobre: "${lessonTitle}".

**REGRAS OBRIGATÓRIAS DE FORMATAÇÃO DE ALERTAS:**

Para Notas, Dicas, Avisos ou Reflexões, use a sintaxe de blockquote do GitHub.

O formato deve ser ESTRITAMENTE este (com a quebra de linha OBRIGATÓRIA):

> [!NOTE]
> Escreva o texto aqui na linha de baixo.

> [!TIP]
> Dica aqui.

> [!IMPORTANT]
> Coisa importante.

> [!WARNING]
> Aviso de perigo.

> [!QUESTION]
> Pergunta reflexiva.

**PROIBIDO:**
NUNCA coloque o texto na mesma linha do marcador. 
ERRADO: > [!NOTE] Texto
CERTO: 
> [!NOTE]
> Texto

**Conteúdo:**
Seja profundo, didático e claro. Use Markdown padrão.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 16000 } 
            }
        });

        return response.text || "Erro ao gerar conteúdo.";
    } catch (error) {
        console.error(`Error generating content for lesson "${lessonTitle}":`, error);
        return "Ocorreu um erro ao gerar o conteúdo desta aula. Por favor, tente novamente.";
    }
};

export const searchInLessonContent = async (query: string, content: string): Promise<string> => {
    try {
        // Fresh AI instance for searching task
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Você é um assistente de estudos. Responda à busca "${query}" com base no conteúdo abaixo.
Use o formato de alerta correto para o resumo:

> [!NOTE]
> Resumo da resposta aqui.

Conteúdo:
---
${content.substring(0, 20000)}
---
`;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return response.text || "Nenhum resultado encontrado.";
    } catch (error) {
        console.error(`Error searching in lesson content for query "${query}":`, error);
        return "Desculpe, ocorreu um erro ao tentar pesquisar o conteúdo. Por favor, tente novamente.";
    }
};
