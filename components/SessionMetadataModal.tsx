
import React, { useState, useEffect } from 'react';

interface SessionMetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (metadata: { title: string, version: string }) => void;
    defaultTitle: string;
    lessonTitle: string;
    courseTitle: string;
}

const SessionMetadataModal: React.FC<SessionMetadataModalProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    defaultTitle,
    lessonTitle,
    courseTitle
}) => {
    const [title, setTitle] = useState(defaultTitle);
    const [version, setVersion] = useState('1.0');

    useEffect(() => {
        if (isOpen) {
            setTitle(`${courseTitle} - ${lessonTitle}`);
        }
    }, [isOpen, courseTitle, lessonTitle]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ title, version });
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="glass-module p-8 w-full max-w-md shadow-2xl border-white/20" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-2">Arquivar Conversa</h2>
                <p className="text-gray-400 text-sm mb-6">Defina um título e versão para organizar este registro em seu histórico neural.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">Título da Sessão</label>
                        <input 
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 p-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                            placeholder="Ex: Aula 01 - Discussão Profunda"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">Versão / Tag</label>
                        <input 
                            type="text"
                            value={version}
                            onChange={e => setVersion(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 p-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                            placeholder="v1.0"
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 text-gray-400 hover:text-white border border-white/10 transition-colors font-bold uppercase text-xs tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white transition-all font-bold uppercase text-xs tracking-widest shadow-lg shadow-sky-900/40"
                        >
                            Confirmar Arquivo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SessionMetadataModal;
