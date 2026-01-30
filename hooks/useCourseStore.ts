
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import { Course, ChatSession } from "../types";

export const useCourseStore = () => {
  // useLiveQuery makes the component reactive to DB changes
  const savedCourses = useLiveQuery(
    () => db.courses.orderBy('lastAccess').reverse().toArray(),
    []
  );

  const addCourse = async (course: Course) => {
    try {
      // Ensure timestamps are set
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
        // Update lastAccess silently when loading
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
      // Access transaction via any-cast to resolve "Property 'transaction' does not exist on type 'IDidataDB'"
      // This ensures the Dexie transaction method is called regardless of interface inheritance resolution issues.
      // Fix for Error in file hooks/useCourseStore.ts on line 55
      await (db as any).transaction('rw', db.courses, db.chatSessions, async () => {
        // Delete the course
        await db.courses.delete(id);
        // Delete all chat sessions associated with this course
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

  return {
    savedCourses: savedCourses ?? [], // Always return array
    addCourse,
    getCourse,
    updateCourse,
    deleteCourse,
    exportCourse
  };
};
