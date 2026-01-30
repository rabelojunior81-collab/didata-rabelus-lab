
import { useLiveQuery } from "dexie-react-hooks";
import { db, AppStateEntry } from "../services/db";
import { Course, ChatSession } from "../types";

export const useCourseStore = () => {
  const savedCourses = useLiveQuery(
    () => db.courses.orderBy('lastAccess').reverse().toArray(),
    []
  );

  const addCourse = async (course: Course) => {
    try {
      const newCourse = {
        ...course,
        createdAt: course.createdAt || Date.now(),
        lastAccess: Date.now()
      };
      await db.courses.put(newCourse);
      return newCourse.id;
    } catch (error) {
      console.error("Error adding course:", error);
      throw error;
    }
  };

  const getCourse = async (id: string): Promise<Course | undefined> => {
    try {
      const course = await db.courses.get(id);
      if (course) {
        await db.courses.update(id, { lastAccess: Date.now() });
      }
      return course;
    } catch (error) {
      console.error("Error getting course:", error);
      return undefined;
    }
  };

  const updateCourse = async (course: Course) => {
    try {
      const updatedCourse = { ...course, lastAccess: Date.now() };
      await db.courses.put(updatedCourse);
    } catch (error) {
      console.error("Error updating course:", error);
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await (db as any).transaction('rw', db.courses, db.chatSessions, async () => {
        await db.courses.delete(id);
        await db.chatSessions.where('courseId').equals(id).delete();
      });
    } catch (error) {
      console.error("Error deleting course:", error);
    }
  };

  const exportCourse = async (id: string) => {
    try {
      const course = await db.courses.get(id);
      if (course) {
        const courseString = JSON.stringify(course, null, 2);
        const blob = new Blob([courseString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${course.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting course:", error);
    }
  };

  const saveLastSession = async (courseId: string, lessonId: string | null) => {
    try {
      await db.appState.put({ key: 'lastSession', value: { courseId, lessonId } });
    } catch (error) {
      console.error("Error saving last session:", error);
    }
  };

  const getLastSession = async (): Promise<{ courseId: string; lessonId: string | null } | null> => {
    try {
      const entry = await db.appState.get('lastSession');
      return entry ? entry.value : null;
    } catch (error) {
      console.error("Error getting last session:", error);
      return null;
    }
  };

  return {
    savedCourses: savedCourses ?? [],
    addCourse,
    getCourse,
    updateCourse,
    deleteCourse,
    exportCourse,
    saveLastSession,
    getLastSession
  };
};
