
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Course, Lesson, Settings } from '../types';
import { generateLessonContent } from '../services/geminiService';
import AITutorChat from './AITutorChat';
import Loader from './common/Loader';
import MarkdownRenderer from './MarkdownRenderer';

interface CourseViewProps {
  course: Course;
  isSaved: boolean;
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string | null) => void;
  onCourseUpdate: (course: Course) => void;
  settings: Settings;
}

const CourseView: React.FC<CourseViewProps> = ({ course, isSaved, selectedLessonId, onSelectLesson, onCourseUpdate, settings }) => {
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [courseData, setCourseData] = useState<Course>(course);
  
  const [activeTab, setActiveTab] = useState<'outline' | 'lesson' | 'tutor'>('outline');
  const prevCourseIdRef = useRef<string | null>(null);

  const selectedLesson = useMemo(() => {
    if (!selectedLessonId) return null;
    for (const module of courseData.modules) {
        const lesson = module.lessons.find(l => l.id === selectedLessonId);
        if (lesson) return lesson;
    }
    return null;
  }, [selectedLessonId, courseData]);

  useEffect(() => {
    setCourseData(course);
    if (prevCourseIdRef.current !== course.id) {
        onSelectLesson(null);
        setActiveTab('outline');
        prevCourseIdRef.current = course.id;
    }
  }, [course, onSelectLesson]);

  const handleSelectLesson = useCallback(async (lesson: Lesson, moduleId: string) => {
    onSelectLesson(lesson.id);
    setActiveTab('lesson');

    if (lesson.content.startsWith('Conteúdo para')) {
      setIsLoadingLesson(true);
      const content = await generateLessonContent(lesson.title);
      
      const updatedLesson = { ...lesson, content };
      const newModules = courseData.modules.map(m => 
        m.id === moduleId 
          ? { ...m, lessons: m.lessons.map(l => l.id === lesson.id ? updatedLesson : l) }
          : m
      );
      
      const newCourseData = { ...courseData, modules: newModules };
      setCourseData(newCourseData);
      setIsLoadingLesson(false);
      onCourseUpdate(newCourseData);
    }
  }, [courseData, onCourseUpdate, onSelectLesson]);
  
  const handleRegenerateContent = useCallback(async () => {
    if (!selectedLessonId) return;

    let lessonToRegenerate: Lesson | null = null;
    let moduleId: string | null = null;

    for (const module of courseData.modules) {
        const foundLesson = module.lessons.find(l => l.id === selectedLessonId);
        if (foundLesson) {
            lessonToRegenerate = foundLesson;
            moduleId = module.id;
            break;
        }
    }
    
    if (!lessonToRegenerate || !moduleId) return;

    setIsLoadingLesson(true);
    const content = await generateLessonContent(lessonToRegenerate.title);
    
    const updatedLesson = { ...lessonToRegenerate, content };
    const newModules = courseData.modules.map(m => 
      m.id === moduleId 
        ? { ...m, lessons: m.lessons.map(l => l.id === lessonToRegenerate!.id ? updatedLesson : l) }
        : m
    );
    
    const newCourseData = { ...courseData, modules: newModules };
    setCourseData(newCourseData);
    onCourseUpdate(newCourseData);
    setIsLoadingLesson(false);

  }, [selectedLessonId, courseData, onCourseUpdate]);

  const Tabs = () => (
    <div className="flex-shrink-0 border-b border-white/10 px-6 bg-transparent">
        <nav className="flex -mb-px space-x-8">
            <button 
                onClick={() => setActiveTab('outline')} 
                className={`py-4 text-base transition-colors border-b-[3px] ${activeTab === 'outline' ? 'border-sky-400 text-white font-semibold' : 'border-transparent text-gray-300 hover:text-white font-medium'}`}
            >
                Módulos
            </button>
            <button 
                onClick={() => setActiveTab('lesson')} 
                className={`py-4 text-base transition-colors border-b-[3px] ${activeTab === 'lesson' ? 'border-sky-400 text-white font-semibold' : 'border-transparent text-gray-300 hover:text-white font-medium'}`}
            >
                Aula
            </button>
            <button 
                onClick={() => setActiveTab('tutor')} 
                className={`py-4 text-base transition-colors border-b-[3px] ${activeTab === 'tutor' ? 'border-sky-400 text-white font-semibold' : 'border-transparent text-gray-300 hover:text-white font-medium'}`}
            >
                Professor
            </button>
        </nav>
    </div>
  );

  const renderOutlineView = () => (
     <div className="p-4 sm:p-6">
        <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white">{courseData.title}</h1>
            <p className="mt-2 text-gray-300">{courseData.description}</p>
        </div>
        <div className="space-y-6">
            {courseData.modules.map((module, index) => (
              <div key={module.id} className="glass-module p-6">
                <h3 className="font-semibold text-lg text-white mb-3">
                    <span className="text-sky-400">Módulo {index + 1}:</span> {module.title}
                </h3>
                <ul className="space-y-1">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <button
                        onClick={() => handleSelectLesson(lesson, module.id)}
                        className={`w-full text-left p-3 text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${selectedLessonId === lesson.id ? 'bg-sky-600/30 text-white' : 'hover:bg-white/10 text-gray-300'}`}
                      >
                        <span className={`w-2 h-2 flex-shrink-0 ${selectedLessonId === lesson.id ? 'bg-sky-400' : 'bg-gray-500'}`}></span>
                        {lesson.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
    </div>
  );
  
  const renderLessonContent = () => (
    <div className="p-6 lg:p-10 h-full overflow-y-auto">
        {selectedLesson ? (
            <article className="max-w-4xl mx-auto pb-20">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h1 className="text-4xl md:text-5xl font-extrabold text-white flex-1">{selectedLesson.title}</h1>
                  {selectedLesson.content && !selectedLesson.content.startsWith('Conteúdo para') && !isLoadingLesson && (
                      <button
                          onClick={handleRegenerateContent}
                          className="flex-shrink-0 bg-[#007BFF] hover:scale-105 shadow-[0_4px_15px_rgba(0,123,255,0.3)] text-white font-semibold p-2.5 md:py-2 md:px-4 transition-all flex items-center gap-2"
                          title="Gerar novamente o conteúdo desta aula usando a IA"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                          <span className="hidden md:inline">Regenerar Aula</span>
                      </button>
                  )}
                </div>
                
                {isLoadingLesson ? (
                  <Loader text="Gerando conteúdo da aula..." /> 
                ) : (
                  <MarkdownRenderer content={selectedLesson.content} />
                )}
            </article>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-gray-400 p-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <h3 className="text-2xl font-semibold mt-4 mb-2">Bem-vindo ao seu curso!</h3>
              <p className="max-w-md mx-auto">Selecione uma aula no painel de módulos para começar a aprender.</p>
            </div>
          </div>
        )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full">
      <aside className="hidden md:flex flex-col w-full md:w-1/4 max-w-sm glass-module overflow-y-auto border-r border-white/10">
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl font-bold mt-2 text-white">{course.title}</h2>
          <p className="text-sm text-gray-300 mt-1">{course.description}</p>
        </div>
        <div className="p-4 space-y-6">
            {courseData.modules.map((module, index) => (
              <div key={module.id}>
                <h3 className="font-semibold text-lg text-white mb-3 px-3">
                   <span className="text-sky-400">Módulo {index + 1}:</span> {module.title}
                </h3>
                <ul className="space-y-1">
                  {module.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <button
                        onClick={() => handleSelectLesson(lesson, module.id)}
                        className={`w-full text-left px-3 py-2.5 text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${selectedLessonId === lesson.id ? 'bg-sky-600 text-white' : 'hover:bg-gray-700/50 text-gray-300'}`}
                      >
                        <span className={`w-2 h-2 ${selectedLessonId === lesson.id ? 'bg-white' : 'bg-gray-500'}`}></span>
                        {lesson.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </aside>
      
      <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
        <div className="md:hidden flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
              <Tabs />
              {activeTab === 'outline' && renderOutlineView()}
              {activeTab === 'lesson' && renderLessonContent()}
              {activeTab === 'tutor' && <div className="h-full"><AITutorChat lesson={selectedLesson} course={course} settings={settings} /></div>}
            </div>
        </div>
        <main className="hidden md:block w-full h-full overflow-y-auto">
            {renderLessonContent()}
        </main>
      </div>

      <aside className="hidden md:flex flex-col w-full md:w-1/4 max-w-md border-l border-white/10">
          <AITutorChat lesson={selectedLesson} course={course} settings={settings} />
      </aside>
    </div>
  );
};

export default CourseView;
