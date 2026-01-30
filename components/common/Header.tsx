import React, { useState } from 'react';
import { Course } from '../../types';

interface HeaderProps {
  course: Course | null;
  isCourseSaved: boolean;
  onSearch: (query: string) => void;
  onBack: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ course, isCourseSaved, onSearch, onBack, onSave, onOpenSettings }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setIsSearchInputOpen(false);
      setSearchQuery('');
    }
  };
  
  const handleCancelSearch = () => {
    setIsSearchInputOpen(false);
    setSearchQuery('');
  };

  const Logo = () => (
    <div className="flex items-center gap-3 flex-shrink-0">
        <svg className="w-8 h-8 text-[#FF8C00]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M2 7L12 12L22 7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M20 16L15 13.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M4 16L9 13.5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
        <div className="flex flex-col -space-y-1">
            <span className="text-xl font-bold text-white">didata.ai</span>
            <span className="text-[10px] font-light text-gray-400">by Rabelus.com.br</span>
        </div>
    </div>
  );
  
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#131823] border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center gap-4">
        
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button onClick={onBack} aria-label="Voltar ao painel">
            <Logo />
          </button>
        </div>

        {/* Right Section */}
        <div className="flex justify-end items-center gap-2 sm:gap-3">
          <button 
            onClick={onOpenSettings}
            className="p-2 text-gray-200 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            aria-label="Configurações"
            title="Configurações"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
          </button>

          {course ? (
            <>
              <div className="h-6 w-px bg-gray-700 mx-1"></div>
              <button 
                onClick={onSave} 
                disabled={isCourseSaved} 
                className="p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 rounded-md transition-colors" 
                aria-label={isCourseSaved ? "Curso salvo" : "Salvar curso"}
                title={isCourseSaved ? "Curso salvo" : "Salvar curso"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isCourseSaved ? 'text-sky-400' : 'text-gray-200'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v-4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 21h14a2 2 0 002-2V7l-4-4H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4h8" />
                </svg>
              </button>
              <button onClick={() => setIsSearchInputOpen(true)} className="p-2 hover:bg-white/10 rounded-md transition-colors" aria-label="Abrir busca">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </>
          ) : (
            <div className="text-sm font-medium text-gray-400 border-l border-gray-700 pl-4 ml-2">Painel de Criação</div>
          )}
        </div>

        {/* Search Input Overlay */}
        {isSearchInputOpen && (
            <div className="absolute top-0 left-0 w-full h-16 bg-[#131823] flex items-center px-4 gap-2 border-b border-white/10 z-50">
                <form onSubmit={handleSearchSubmit} className="flex-grow flex items-center">
                    <button type="submit" className="pl-2 pr-4 text-gray-400" aria-label="Submit Search">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </button>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar na aula atual..."
                        autoFocus
                        className="w-full h-full bg-transparent text-lg focus:outline-none text-white placeholder-gray-500"
                    />
                </form>
                <button onClick={handleCancelSearch} className="text-sm text-gray-300 hover:text-white flex-shrink-0 px-2">
                    Cancelar
                </button>
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;