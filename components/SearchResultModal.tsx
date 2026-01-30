import React from 'react';
import Loader from './common/Loader';
import MarkdownRenderer from './MarkdownRenderer';

interface SearchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  results: string;
  isSearching: boolean;
}

const SearchResultModal: React.FC<SearchResultModalProps> = ({ isOpen, onClose, query, results, isSearching }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="search-modal-title">
      <div className="glass-module rounded-none shadow-2xl p-6 w-full max-w-3xl text-gray-100 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10 flex-shrink-0">
           <h2 id="search-modal-title" className="text-xl font-bold text-gray-200">
             Resultados para: <span className="text-sky-400">"{query}"</span>
           </h2>
           <button onClick={onClose} className="p-1 rounded-none hover:bg-white/10 transition-colors" aria-label="Fechar modal">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
        <div className="overflow-y-auto pr-2 -mr-2">
          {isSearching ? (
            <Loader text="Analisando aula..." />
          ) : (
             // Render without the top-margin class that creates huge gaps in modal view
            <MarkdownRenderer content={results} className="text-sm md:text-base" />
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultModal;