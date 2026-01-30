import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage } from "@google/genai";
import { Lesson, ChatMessage, Settings, ChatSession, Course } from '../types';
import { db } from '../services/db';
import { useTutorAudio } from '../hooks/useTutorAudio';
import { LIVE_MODEL, getLiveConfig, buildLessonContext } from '../services/geminiLive';
import AudioVisualizer from './Live/AudioVisualizer';
import SessionMetadataModal from './SessionMetadataModal';
import ChatHistoryModal from './ChatHistoryModal';

interface AITutorChatProps {
  lesson: Lesson | null;
  course: Course | null;
  settings: Settings;
}

const AITutorChat: React.FC<AITutorChatProps> = ({ lesson, course, settings }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Conexão Neural Inativa');
  const [lastTranscript, setLastTranscript] = useState<string>('');
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { 
      startInput, 
      stopInput, 
      playAudioChunk, 
      stopAudioPlayback, 
      resetAudioState,
      isUserSpeaking, 
      isAiSpeaking,
      userVolume,
      aiVolume,
      audioError
  } = useTutorAudio();

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const activeUserMessageIdRef = useRef<number | null>(null);
  const activeAiMessageIdRef = useRef<number | null>(null);
  const currentAiResponseRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 && lesson && course) {
      const saveToDb = async () => {
        const sessionData: ChatSession = {
          id: currentSessionId || undefined,
          lessonId: lesson.id,
          courseId: course.id,
          title: currentSessionId ? '' : `${course.title} - ${lesson.title}`,
          version: '1.0',
          messages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isArchived: false
        };
        
        if (currentSessionId) {
            await db.chatSessions.update(currentSessionId, { messages, updatedAt: Date.now() });
        } else {
            const existing = await db.chatSessions
                .where({ lessonId: lesson.id, isArchived: 0 })
                .first();
            
            if (existing) {
                setCurrentSessionId(existing.id!);
                await db.chatSessions.update(existing.id!, { messages, updatedAt: Date.now() });
            } else {
                const id = await db.chatSessions.add(sessionData);
                setCurrentSessionId(id.toString());
            }
        }
      };
      saveToDb();
    }
  }, [messages, lesson, course, currentSessionId]);

  useEffect(() => {
    if (lesson) {
        db.chatSessions
            .where({ lessonId: lesson.id, isArchived: 0 })
            .first()
            .then(session => {
                if (session) {
                    setMessages(session.messages);
                    setCurrentSessionId(session.id!);
                } else {
                    setMessages([]);
                    setCurrentSessionId(null);
                }
            });
    }
  }, [lesson]);

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, lastTranscript]);

  const cleanUp = useCallback((pausedMessage?: string) => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(s => s.close()).catch(console.error);
      sessionPromiseRef.current = null;
    }
    resetAudioState();
    setIsSessionActive(false);
    setIsConnecting(false);
    setLastTranscript('');
    setStatusMessage(pausedMessage || 'Conexão Encerrada');
  }, [resetAudioState]);

  useEffect(() => {
      if (audioError) {
          cleanUp(audioError);
          setMessages(prev => [...prev, { id: Date.now(), text: audioError, sender: 'ai', timestamp: Date.now()}]);
      }
  }, [audioError, cleanUp]);

  const startSession = useCallback(async (currentLesson: Lesson) => {
      if (isConnecting || isSessionActive) return;
      setIsConnecting(true);
      setStatusMessage('Sincronizando Hardware...');
      
      try {
        await startInput((pcmBlob) => {
             sessionPromiseRef.current?.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
             });
        });
        
        const systemInstruction = buildLessonContext(currentLesson, messages);
        const config = getLiveConfig(settings.voiceName, systemInstruction);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        sessionPromiseRef.current = ai.live.connect({
          model: LIVE_MODEL,
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              setIsSessionActive(true);
              setStatusMessage('SSOT Ativo: 16k Thinking');
            },
            onmessage: async (message: LiveServerMessage) => {
              const cleanText = (text: string) => text.replace(/<noise>/g, '');

              if (message.serverContent?.inputTranscription) {
                const textDelta = cleanText(message.serverContent.inputTranscription.text);
                if (textDelta) {
                    setLastTranscript(textDelta);
                    if (activeUserMessageIdRef.current === null) {
                        const newId = Date.now();
                        activeUserMessageIdRef.current = newId;
                        setMessages(prev => [...prev, { id: newId, text: textDelta, sender: 'user', timestamp: Date.now() }]);
                    } else {
                        setMessages(prev => prev.map(msg => 
                            msg.id === activeUserMessageIdRef.current ? { ...msg, text: msg.text + textDelta } : msg
                        ));
                    }
                }
              }
              if (message.serverContent?.outputTranscription) {
                  const textDelta = cleanText(message.serverContent.outputTranscription.text);
                  if (textDelta) {
                    currentAiResponseRef.current += textDelta;
                    setLastTranscript(textDelta);
                    if (activeAiMessageIdRef.current === null) {
                        const newId = Date.now();
                        activeAiMessageIdRef.current = newId;
                        setMessages(prev => [...prev, { id: newId, text: textDelta, sender: 'ai', timestamp: Date.now() }]);
                    } else {
                        setMessages(prev => prev.map(msg => 
                            msg.id === activeAiMessageIdRef.current ? { ...msg, text: msg.text + textDelta } : msg
                        ));
                    }
                  }
              }

              if (message.serverContent?.turnComplete) {
                activeUserMessageIdRef.current = null;
                activeAiMessageIdRef.current = null;
                currentAiResponseRef.current = '';
              }

              if (message.serverContent?.interrupted) {
                  stopAudioPlayback();
                  setLastTranscript('(Interrompido)');
              }

              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio) {
                  await playAudioChunk(base64Audio);
              }
            },
            onerror: (e: ErrorEvent) => {
              console.error('Live error:', e);
              cleanUp('Falha de Protocolo');
            },
            onclose: (e: CloseEvent) => {
              if (isSessionActive) cleanUp();
            },
          },
          config: config,
        });
      } catch (error) {
          console.error("Connection failed:", error);
          setStatusMessage('Erro na Matriz.');
          cleanUp();
      }
  }, [cleanUp, isConnecting, isSessionActive, messages, settings.voiceName, startInput, playAudioChunk, stopAudioPlayback]);

  const handleToggleSession = useCallback(() => {
    if (isSessionActive) {
      cleanUp();
    } else if (lesson) {
      startSession(lesson);
    }
  }, [isSessionActive, lesson, cleanUp, startSession]);

  const handleArchiveSession = () => {
      if (messages.length === 0) return;
      setIsMetadataModalOpen(true);
  };

  const handleArchiveSubmit = async (metadata: { title: string, version: string }) => {
      if (!currentSessionId || !lesson || !course) return;
      
      await db.chatSessions.update(currentSessionId, {
          title: metadata.title,
          version: metadata.version,
          isArchived: true,
          updatedAt: Date.now()
      });
      
      setMessages([]);
      setCurrentSessionId(null);
      setIsMetadataModalOpen(false);
  };

  const handleLoadSession = (session: ChatSession) => {
      setMessages(session.messages);
      setCurrentSessionId(session.id!);
      setIsHistoryOpen(false);
  };

  if (!lesson || !course) {
      return (
          <div className="h-full w-full flex flex-col items-center justify-center glass-module p-8 text-center rounded-none">
              <div className="w-24 h-24 border-2 border-dashed border-gray-600 flex items-center justify-center mb-4 rounded-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-300 rounded-none">Terminal Geométrico</h3>
              <p className="text-gray-500 mt-2 rounded-none">Selecione um módulo para iniciar o uplink socrático.</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full glass-module relative overflow-hidden border-none rounded-none">
      
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none rounded-none">
        <div>
             <h3 className="text-sm font-bold text-sky-400 uppercase tracking-widest drop-shadow-md rounded-none">Didata SSOT</h3>
             <p className="text-xs text-gray-400 font-mono rounded-none">{statusMessage}</p>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto rounded-none">
             <button 
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-none"
                title="Histórico de Sessões"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>
             {messages.length > 0 && (
                <button 
                    onClick={handleArchiveSession}
                    className="p-2 text-gray-400 hover:text-sky-400 transition-colors rounded-none"
                    title="Arquivar Sessão Atual"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </button>
             )}
             <div className={`w-3 h-3 rounded-none ${isSessionActive ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-600'}`}></div>
        </div>
      </div>

      <div className="flex-grow relative bg-[#020408] flex flex-col rounded-none">
        <div className="absolute inset-0 z-0 rounded-none">
            <AudioVisualizer 
                state={audioError ? 'error' : isConnecting ? 'connecting' : isSessionActive ? 'connected' : 'idle'}
                isUserSpeaking={isUserSpeaking}
                isAiSpeaking={isAiSpeaking}
                userVolume={userVolume}
                aiVolume={aiVolume}
            />
        </div>
        
        <div className="flex-grow z-10 flex flex-col justify-end pb-32 px-4 pointer-events-none rounded-none">
            <div className="pointer-events-auto max-h-[60vh] overflow-y-auto space-y-3 pr-2 scrollbar-thin rounded-none" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%)' }}>
                {messages.length === 0 && (
                    <div className="text-center text-gray-700 text-[10px] uppercase tracking-[0.2em] opacity-40 py-24 font-mono rounded-none">Uplink Geométrico Disponível</div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} rounded-none`}>
                        <div className={`max-w-[85%] p-4 rounded-none text-sm leading-relaxed backdrop-blur-xl border shadow-2xl transition-all duration-500 animate-fade-in ${
                            msg.sender === 'user' 
                              ? 'bg-emerald-900/40 border-emerald-500/30 text-emerald-50' 
                              : 'bg-sky-900/40 border-sky-500/30 text-sky-50'
                        }`}>
                           {msg.text}
                           <div className="text-[9px] opacity-30 mt-2 text-right font-mono rounded-none">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} className="rounded-none" />
            </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 z-20 flex justify-center items-center bg-gradient-to-t from-black via-black/40 to-transparent rounded-none">
        <button
            onClick={handleToggleSession}
            disabled={isConnecting}
            className={`
                group relative flex items-center justify-center w-24 h-24 rounded-none transition-all duration-700
                ${isSessionActive 
                    ? 'bg-red-500/30 hover:bg-red-500/50 border border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]' 
                    : 'bg-sky-500/30 hover:bg-sky-500/50 border border-sky-500/50 shadow-[0_0_40px_rgba(14,165,233,0.2)]'
                }
                backdrop-blur-md
            `}
        >
            <div className={`absolute inset-0 rounded-none border border-white/5 transition-transform duration-1000 ${isConnecting ? 'animate-ping' : 'scale-100'}`}></div>
            
            {isConnecting ? (
                 <svg className="animate-spin h-10 w-10 text-white opacity-80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
            ) : isSessionActive ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-100 drop-shadow-xl rounded-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-sky-100 drop-shadow-xl group-hover:scale-110 transition-transform rounded-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3-3z" />
                </svg>
            )}
        </button>
      </div>

      <SessionMetadataModal 
          isOpen={isMetadataModalOpen}
          onClose={() => setIsMetadataModalOpen(false)}
          onSubmit={handleArchiveSubmit}
          defaultTitle={`${course.title} - ${lesson.title}`}
          lessonTitle={lesson.title}
          courseTitle={course.title}
      />

      <ChatHistoryModal 
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          lessonId={lesson.id}
          onLoadSession={handleLoadSession}
      />
    </div>
  );
};

export default AITutorChat;