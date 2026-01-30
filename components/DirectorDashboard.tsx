import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Course } from '../types';
import { generateCourseFromText } from '../services/geminiService';
import Loader from './common/Loader';

interface DirectorDashboardProps {
  onCourseGenerated: (course: Course, sourceText: string) => void;
  savedCourses: Course[];
  onLoadCourse: (courseId: string) => void;
  onDeleteCourse: (courseId: string) => void;
  onExportCourse: (courseId: string) => void;
}

const typingTopics = [
  "Física Quântica para iniciantes...",
  "A história da Rota da Seda...",
  "Desenvolvimento de APIs com Nest.js...",
  "Princípios de Culinária Molecular...",
  "Teoria das Cordas e a busca pela Teoria de Tudo...",
  "Marketing Digital para Startups de Tecnologia...",
  "Introdução à Filosofia Existencialista...",
  "Biologia Sintética e o futuro da medicina...",
  "Análise da obra 'Dom Quixote' de Cervantes...",
  "Como compor música para trilhas sonoras de filmes..."
];


const DirectorDashboard: React.FC<DirectorDashboardProps> = ({ onCourseGenerated, savedCourses, onLoadCourse, onDeleteCourse, onExportCourse }) => {
  const [sourceText, setSourceText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const [placeholder, setPlaceholder] = useState('');
  const topicIndex = useRef(0);
  const charIndex = useRef(0);
  const isDeleting = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const type = () => {
      const currentTopic = typingTopics[topicIndex.current];
      let newPlaceholder = '';
      let timeoutDuration = 120;

      if (isDeleting.current) {
        // Deleting
        newPlaceholder = currentTopic.substring(0, charIndex.current - 1);
        charIndex.current--;
        timeoutDuration = 50;

        if (charIndex.current === 0) {
          isDeleting.current = false;
          topicIndex.current = (topicIndex.current + 1) % typingTopics.length;
        }
      } else {
        // Typing
        newPlaceholder = currentTopic.substring(0, charIndex.current + 1);
        charIndex.current++;

        if (charIndex.current === currentTopic.length) {
          timeoutDuration = 2000; // Pause at the end
          isDeleting.current = true;
        }
      }
      setPlaceholder(newPlaceholder);
      typingTimeoutRef.current = window.setTimeout(type, timeoutDuration);
    };

    typingTimeoutRef.current = window.setTimeout(type, 100);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setSourceText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleGenerateCourse = useCallback(async () => {
    if (!sourceText.trim()) {
      setError('Por favor, carregue um arquivo de texto ou cole o conteúdo.');
      return;
    }
    setIsLoading(true);
    setError('');
    const course = await generateCourseFromText(sourceText);
    setIsLoading(false);
    if (course) {
      onCourseGenerated(course, sourceText);
    } else {
      setError('Falha ao gerar o curso. Verifique o console para mais detalhes.');
    }
  }, [sourceText, onCourseGenerated]);

  const SavedCourseItem: React.FC<{course: Course}> = ({ course }) => (
    <div className="glass-module p-4 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-4">
      <div className="flex-grow">
        <h3 className="font-bold text-lg text-white group-hover:text-blue-200">{course.title}</h3>
        <p className="text-gray-300 my-1 text-sm">{course.description}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0 self-end md:self-center w-full md:w-auto">
        <button onClick={() => onLoadCourse(course.id)} className="flex-1 md:flex-none text-sm bg-[#007BFF] hover:scale-105 shadow-[0_4px_15px_rgba(0,123,255,0.3)] text-white font-semibold py-2 px-4 rounded-none transition-all">Carregar</button>
        <button onClick={() => onExportCourse(course.id)} className="flex-1 md:flex-none text-sm bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-none transition-colors">Exportar</button>
        <button onClick={() => onDeleteCourse(course.id)} className="flex-1 md:flex-none text-sm bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-none transition-colors">Excluir</button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 text-gray-200">
      
      <section className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white" dangerouslySetInnerHTML={{ __html: 'SUA JORNADA DE APRENDIZAGEM<br/>ACELERA AGORA.' }} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 glass-module p-6 rounded-none flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-white/10 pb-2">Gerador de Missão</h2>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="w-full h-72 p-4 bg-gray-900/50 border border-gray-600 rounded-none text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-[#FF8C00] focus:outline-none focus:border-transparent transition-colors"
              placeholder={placeholder + '▌'}
            />
            <div className="mt-2 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <label htmlFor="file-upload" className="cursor-pointer text-sm font-medium text-blue-400 hover:underline">
                  Ou carregue um arquivo de texto (.txt)
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <button
                onClick={handleGenerateCourse}
                disabled={isLoading || !sourceText.trim()}
                className="w-full sm:w-auto bg-[#FF8C00] hover:scale-105 shadow-[0_4px_15px_rgba(255,140,0,0.3)] text-black font-bold py-3 px-8 rounded-none transition-all duration-300 text-lg flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:text-white disabled:hover:scale-100 disabled:shadow-none"
              >
                {isLoading && <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                {isLoading ? 'Analisando...' : 'INICIAR NOVA MISSÃO'}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        </div>

        {isLoading && <div className="lg:col-span-3"><Loader text="Analisando o conteúdo e estruturando a missão..." /></div>}

        {!isLoading && savedCourses.length > 0 && (
          <div className="lg:col-span-3 glass-module p-6 rounded-none flex flex-col gap-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider border-b border-white/10 pb-2">Minhas Missões Salvas</h2>
              <div className="space-y-4">
                  {savedCourses.map(course => <SavedCourseItem key={course.id} course={course} />)}
              </div>
          </div>
        )}

        {!isLoading && savedCourses.length === 0 && (
            <div className="lg:col-span-3 glass-module text-center text-gray-400 py-16 rounded-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                <h3 className="mt-2 text-lg font-medium">Nenhuma missão salva</h3>
                <p className="mt-1 text-sm">Crie uma nova missão para começar!</p>
            </div>
        )}
      </div>

    </div>
  );
};

export default DirectorDashboard;