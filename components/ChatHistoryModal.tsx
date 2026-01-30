
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { ChatSession } from '../types';

interface ChatHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    lessonId: string;
    onLoadSession: (session: ChatSession) => void;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({ isOpen, onClose, lessonId, onLoadSession }) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);

    useEffect(() => {
        if (isOpen) {
            db.chatSessions
                .where({ lessonId, isArchived: 1 })
                .reverse()
                .sortBy('updatedAt')
                .then(setSessions);
        }
    }, [isOpen, lessonId]);

    if (!isOpen) return null;

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Deseja realmente excluir este registro histórico?")) {
            await db.chatSessions.delete(id);
            setSessions(prev => prev.filter(s => s.id !== id));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="glass-module p-6 w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl border-white/20" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">Logs de Sincronização</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                    {sessions.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 italic">
                            Nenhum arquivo encontrado para esta aula.
                        </div>
                    ) : (
                        sessions.map(session => (
                            <div 
                                key={session.id}
                                onClick={() => onLoadSession(session)}
                                className="group glass-module p-4 cursor-pointer hover:bg-sky-900/20 border-white/10 hover:border-sky-500/50 transition-all flex justify-between items-center"
                            >
                                <div className="space-y-1">
                                    <h3 className="font-bold text-sky-50 group-hover:text-sky-400 transition-colors">{session.title}</h3>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                                        <span className="bg-white/5 px-2 py-0.5 text-sky-400">{session.version}</span>
                                        <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                                        <span>{new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span>{session.messages.length} msgs</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(session.id!, e)}
                                    className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Excluir"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatHistoryModal;
