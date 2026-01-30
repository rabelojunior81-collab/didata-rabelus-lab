import React from 'react';
import { Settings, GeminiVoiceName } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const GEMINI_VOICES: { name: GeminiVoiceName; desc: string; gender: string }[] = [
    { name: 'Puck', desc: 'Suave e envolvente', gender: 'Masculino' },
    { name: 'Charon', desc: 'Profundo e autoritário', gender: 'Masculino' },
    { name: 'Kore', desc: 'Calma e tranquilizadora', gender: 'Feminino' },
    { name: 'Fenrir', desc: 'Rápido e energético', gender: 'Masculino' },
    { name: 'Aoede', desc: 'Expressiva e clara', gender: 'Feminino' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, setSettings }) => {
    if (!isOpen) return null;

    const handleVoiceChange = (voiceName: GeminiVoiceName) => {
        setSettings(prev => ({ ...prev, voiceName }));
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
            <div className="glass-module rounded-none border border-white/10 shadow-2xl p-6 w-full max-w-md text-gray-100" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 id="settings-modal-title" className="text-2xl font-bold text-white">Configurações do Tutor</h2>
                    <button onClick={onClose} className="p-1 rounded-none hover:bg-white/10 transition-colors" aria-label="Fechar modal">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Voz do Gemini Live</h3>
                        <p className="text-xs text-gray-400 mb-4">Escolha a personalidade da voz do seu professor de IA. A mudança terá efeito na próxima conexão.</p>
                        <div className="grid gap-3">
                            {GEMINI_VOICES.map((voice) => (
                                <button
                                    key={voice.name}
                                    onClick={() => handleVoiceChange(voice.name)}
                                    className={`flex items-center justify-between p-3 rounded-none border transition-all ${
                                        settings.voiceName === voice.name 
                                            ? 'bg-blue-600/20 border-blue-500 text-white' 
                                            : 'bg-gray-800/30 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
                                    }`}
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">{voice.name}</span>
                                        <span className="text-xs opacity-70">{voice.desc}</span>
                                    </div>
                                    <span className="text-xs px-2 py-1 bg-white/5 rounded uppercase tracking-wide">{voice.gender}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
                    <button onClick={onClose} className="bg-[#007BFF] hover:scale-105 shadow-[0_4px_15px_rgba(0,123,255,0.3)] text-white font-semibold py-2 px-6 rounded-none transition-all">
                        Concluído
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;