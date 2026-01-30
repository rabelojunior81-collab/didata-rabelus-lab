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

const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  return clean;
};

export const generateCourseFromText = async (text: string): Promise<Course | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Você é um Arquiteto Pedagógico de IA do Rabelus Lab. Sua missão é analisar o texto fornecido e projetar a estrutura de um curso online seguindo a Lei Fundamental da Rigidez Pedagógica.

Diretrizes:
1.  **Análise SSOT:** Identifique o núcleo da verdade no texto.
2.  **Arquitetura:** Módulos e Aulas devem seguir uma progressão técnica absoluta.
3.  **Saída:** JSON rigoroso.

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
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Você é o "Didata", a SSOT de conteúdo educacional. Gere um conteúdo de aula denso, técnico e socrático para: "${lessonTitle}".

**REGRAS DE FORMATAÇÃO DIDATA:**
Use blockquotes para alertas estruturais:
> [!NOTE]
> Nota técnica aqui.

**RIGOR GEOMÉTRICO:**
Seja direto. Use Markdown preciso. Sem redundâncias.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 16000 } 
            }
        });

        return response.text || "Falha na extração de dados.";
    } catch (error) {
        console.error(`Error generating lesson content:`, error);
        return "Ocorreu um erro no pipeline de geração. Recarregue a matriz.";
    }
};

export const searchInLessonContent = async (query: string, content: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analise a base de conhecimento e extraia informações para a query: "${query}".
Use o formato:
> [!NOTE]
> Resumo extraído.

Base:
---
${content.substring(0, 20000)}
---
`;
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return response.text || "Dados não localizados.";
    } catch (error) {
        console.error(`Search error:`, error);
        return "Erro no indexador neural.";
    }
};