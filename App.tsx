import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DirectorDashboard from './components/DirectorDashboard';
import CourseView from './components/CourseView';
import Header from './components/common/Header';
import SearchResultModal from './components/SearchResultModal';
import SettingsModal from './components/SettingsModal';
import { Course, Settings } from './types';
import { searchInLessonContent } from './services/geminiService';
import { useCourseStore } from './hooks/useCourseStore';

const App: React.FC = () => {
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [currentSourceText, setCurrentSourceText] = useState('');
  
  const { savedCourses, addCourse, getCourse, updateCourse, deleteCourse, exportCourse } = useCourseStore();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    lang: 'pt-BR',
    voiceName: 'Charon',
  });

  // Load settings from localStorage (small data, fine to keep)
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('intellicourse-settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('intellicourse-settings', JSON.stringify(settings));
  }, [settings]);

  const handleCourseGenerated = (generatedCourse: Course, sourceText: string) => {
    setCurrentCourse(generatedCourse);
    setCurrentSourceText(sourceText);
    setSelectedLessonId(null);
  };

  const handleBackToDashboard = () => {
    setCurrentCourse(null);
    setSelectedLessonId(null);
  };
  
  const handleSaveCourse = useCallback(async () => {
    if (!currentCourse) return;
    await addCourse(currentCourse);
  }, [currentCourse, addCourse]);

  const handleCourseUpdate = useCallback(async (updatedCourse: Course) => {
    // Update local state immediate for UI responsiveness
    setCurrentCourse(updatedCourse);
    
    // Update DB if it exists there
    const exists = savedCourses.some(c => c.id === updatedCourse.id);
    if (exists) {
        await updateCourse(updatedCourse);
    }
  }, [savedCourses, updateCourse]);

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta missão?")) return;
    await deleteCourse(courseId);
    if (currentCourse?.id === courseId) {
      setCurrentCourse(null);
    }
  };

  const handleLoadCourse = async (courseId: string) => {
    const course = await getCourse(courseId);
    if (course) {
        setCurrentCourse(course);
        setSelectedLessonId(null);
    }
  };

  const handleExportCourse = async (courseId: string) => {
    await exportCourse(courseId);
  };

  const handleSearch = async (query: string) => {
      if (!currentCourse || !selectedLessonId) {
          alert("Por favor, selecione uma aula antes de pesquisar.");
          return;
      }

      const lesson = currentCourse.modules
          .flatMap(m => m.lessons)
          .find(l => l.id === selectedLessonId);
      
      if (!lesson || !lesson.content) {
          alert("O conteúdo da aula não está disponível para pesquisa.");
          return;
      }
      
      setSearchQuery(query);
      setIsSearchOpen(true);
      setIsSearching(true);
      
      const results = await searchInLessonContent(query, lesson.content);
      setSearchResults(results);
      setIsSearching(false);
  };

  const isCurrentCourseSaved = useMemo(() => {
    return savedCourses.some(c => c.id === currentCourse?.id);
  }, [savedCourses, currentCourse]);

  return (
    <div className="min-h-screen bg-transparent text-gray-100 font-sans">
      <Header 
        course={currentCourse}
        isCourseSaved={isCurrentCourseSaved}
        onBack={handleBackToDashboard}
        onSave={handleSaveCourse}
        onSearch={handleSearch}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <SearchResultModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        query={searchQuery}
        results={searchResults}
        isSearching={isSearching}
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />

      <main className="h-screen pt-16">
        {currentCourse ? (
          <CourseView 
            course={currentCourse}
            isSaved={isCurrentCourseSaved}
            selectedLessonId={selectedLessonId}
            onSelectLesson={setSelectedLessonId}
            onCourseUpdate={handleCourseUpdate}
            settings={settings}
          />
        ) : (
          <DirectorDashboard 
            onCourseGenerated={handleCourseGenerated}
            savedCourses={savedCourses}
            onLoadCourse={handleLoadCourse}
            onDeleteCourse={handleDeleteCourse}
            onExportCourse={handleExportCourse}
          />
        )}
      </main>
    </div>
  );
};

export default App;