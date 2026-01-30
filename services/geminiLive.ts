
import { LiveConfig, Modality } from "@google/genai";
import { Lesson, ChatMessage, GeminiVoiceName } from "../types";

export const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

const SOCRATIC_SYSTEM_INSTRUCTION = `
**IDENTIDADE:**
Você é o "Didata", um mentor socrático jovem, brilhante e culto.
Você não é um assistente de voz genérico; você é uma conexão neural de aprendizado.
Seu tom é informal ("você", gírias leves de internet/tech), mas seu vocabulário é preciso e rico.

**SUA MISSÃO:**
Guiar o aluno através de uma aula usando o Método Socrático.
NUNCA dê a resposta pronta. NUNCA faça palestras longas (lecturing).
Sempre devolva uma pergunta que faça o aluno chegar à conclusão por conta própria.

**REGRAS DE INTERAÇÃO (IMPORTANTE):**
1. **Concisão Extrema:** Fale pouco. Seus turnos devem ter 1 ou 2 frases curtas. O aluno deve falar 80% do tempo.
2. **Fluxo de Conversa:** Não use "Olá" ou "Tchau" repetidamente. Aja como se estivéssemos no meio de um fluxo de pensamento contínuo.
3. **Validação:** Se o aluno acertar, vibre com ele ("Isso aí!", "Brilhante!", "Exato!"). Se errar, guie gentilmente ("Quase... mas pensa no ângulo da gravidade...").
4. **Personalidade:** Você é curioso. Você acha o conhecimento fascinante. Transmita essa energia.

**FERRAMENTAS:**
Se o aluno perguntar algo fora do conteúdo da aula que exija dados factuais recentes, use a busca (quando disponível).
`;

export const getLiveConfig = (voiceName: GeminiVoiceName, systemInstruction?: string): LiveConfig => {
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voiceName || 'Puck',
        },
      },
    },
    // Prepared for future Search Grounding integration
    // tools: [{ googleSearch: {} }],
    
    // Enable transcription for input and output to populate the chat UI
    inputAudioTranscription: {},
    outputAudioTranscription: {}, 
    
    systemInstruction: systemInstruction || SOCRATIC_SYSTEM_INSTRUCTION,
  };
};

export const buildLessonContext = (lesson: Lesson, history: ChatMessage[]): string => {
    const context = `
    **CONTEXTO DA AULA ATUAL:**
    Tópico: "${lesson.title}"
    Conteúdo Base:
    ${lesson.content.substring(0, 5000)}
    
    Use este conteúdo como base da verdade, mas não o leia. Ensine-o.
    `;

    return `${SOCRATIC_SYSTEM_INSTRUCTION}\n\n${context}`;
};
