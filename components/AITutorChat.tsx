
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
  
  // Persistence & History State
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

  // Auto-save logic
  useEffect(() => {
    if (messages.length > 0 && lesson && course) {
      const saveToDb = async () => {
        const sessionData: ChatSession = {
          id: currentSessionId || undefined,
          lessonId: lesson.id,
          courseId: course.id,
          title: currentSessionId ? '' : `${course.title} - ${lesson.title}`, // Placeholder
          version: '1.0',
          messages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isArchived: false
        };
        
        // If it's a new unsaved session, we don't force title until archive
        // But we persist the messages for current lesson context
        if (currentSessionId) {
            await db.chatSessions.update(currentSessionId, { messages, updatedAt: Date.now() });
        } else {
            // Find existing non-archived session for this lesson or create new
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

  // Load persistence on lesson change
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
      setStatusMessage('Estabelecendo Uplink...');
      
      try {
        await startInput((pcmBlob) => {
             sessionPromiseRef.current?.then((session) => {
                 session.sendRealtimeInput({ media: pcmBlob });
             });
        });
        
        const systemInstruction = buildLessonContext(currentLesson, messages);
        const config = getLiveConfig(settings.voiceName, systemInstruction);

        // Initializing AI instance right before the session connection
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        sessionPromiseRef.current = ai.live.connect({
          model: LIVE_MODEL,
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              setIsSessionActive(true);
              setStatusMessage('Conexão Neural Estabelecida');
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
              cleanUp('Erro de Sincronização');
            },
            onclose: (e: CloseEvent) => {
              if (isSessionActive) cleanUp();
            },
          },
          config: config,
        });
      } catch (error) {
          console.error("Connection failed:", error);
          setStatusMessage('Falha no Uplink.');
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
      
      // Start a fresh session for this lesson
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
          <div className="h-full w-full flex flex-col items-center justify-center glass-module p-8 text-center">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-300">Selecione um Módulo</h3>
              <p className="text-gray-500 mt-2">O link neural aguarda o conteúdo da aula.</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full glass-module relative overflow-hidden border-none">
      
      {/* Header / Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div>
             <h3 className="text-sm font-bold text-sky-400 uppercase tracking-widest drop-shadow-md">Didata Live</h3>
             <p className="text-xs text-gray-400 font-mono">{statusMessage}</p>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
             <button 
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Histórico de Sessões"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>
             {messages.length > 0 && (
                <button 
                    onClick={handleArchiveSession}
                    className="p-2 text-gray-400 hover:text-sky-400 transition-colors"
                    title="Arquivar Sessão Atual"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                </button>
             )}
             <div className={`w-3 h-3 rounded-full ${isSessionActive ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-600'}`}></div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-grow relative bg-[#05080F] flex flex-col">
        <div className="absolute inset-0 z-0">
            <AudioVisualizer 
                state={audioError ? 'error' : isConnecting ? 'connecting' : isSessionActive ? 'connected' : 'idle'}
                isUserSpeaking={isUserSpeaking}
                isAiSpeaking={isAiSpeaking}
                userVolume={userVolume}
                aiVolume={aiVolume}
            />
        </div>
        
        <div className="flex-grow z-10 flex flex-col justify-end pb-28 px-4 pointer-events-none">
            <div className="pointer-events-auto max-h-[60vh] overflow-y-auto space-y-3 pr-2 scrollbar-thin" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%)' }}>
                {messages.length === 0 && (
                    <div className="text-center text-gray-600 text-[10px] uppercase tracking-[0.2em] opacity-50 py-20 font-mono">Inicie a conexão para conversar</div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed backdrop-blur-md border shadow-lg transition-all duration-300 animate-fade-in ${
                            msg.sender === 'user' 
                              ? 'bg-emerald-900/30 border-emerald-500/20 text-emerald-50 rounded-br-sm' 
                              : 'bg-sky-900/30 border-sky-500/20 text-sky-50 rounded-bl-sm'
                        }`}>
                           {msg.text}
                           <div className="text-[9px] opacity-40 mt-1 text-right">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex justify-center items-center bg-gradient-to-t from-black/90 via-black/40 to-transparent">
        <button
            onClick={handleToggleSession}
            disabled={isConnecting}
            className={`
                group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500
                ${isSessionActive 
                    ? 'bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
                    : 'bg-sky-500/20 hover:bg-sky-500/40 border border-sky-500/40 shadow-[0_0_30px_rgba(14,165,233,0.2)]'
                }
                backdrop-blur-sm
            `}
        >
            <div className={`absolute inset-0 rounded-full border border-white/5 transition-transform duration-1000 ${isConnecting ? 'animate-ping' : 'scale-100'}`}></div>
            
            {isConnecting ? (
                 <svg className="animate-spin h-8 w-8 text-white opacity-80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
            ) : isSessionActive ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-100 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-sky-100 drop-shadow-lg group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3-3z" />
                </svg>
            )}
        </button>
      </div>

      {/* Modals */}
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
