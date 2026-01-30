
export interface Lesson {
  id: string;
  title: string;
  content: string;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  topic: string;
  title: string;
  description: string;
  modules: Module[];
  createdAt: number;
  lastAccess: number;
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

export interface ChatSession {
  id?: string; // Auto-generated UUID or DB ID
  lessonId: string;
  courseId: string;
  title: string;
  version: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
}

export interface UpdateSuggestion {
  id: string;
  topic: string;
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type GeminiVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede' | 'Zephyr';

export interface Settings {
  lang: 'pt-BR';
  voiceName: GeminiVoiceName;
}
