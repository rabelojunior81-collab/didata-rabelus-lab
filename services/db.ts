
import { Dexie, type Table } from 'dexie';
import { Course, ChatSession } from '../types';

// Define the database structure to ensure proper typing across the app
export interface IDidataDB extends Dexie {
  courses: Table<Course>;
  chatSessions: Table<ChatSession>;
}

/**
 * Initialize Dexie database instance.
 * Using functional instantiation avoids potential property resolution issues 
 * seen with class-based inheritance in certain TypeScript configurations.
 */
// Create a plain Dexie instance first to configure it without type conflicts on the specialized interface
const dbInstance = new Dexie('DidataDB');

// Configure database schema using the base Dexie instance which definitely has 'version'
// Fix for Error in file services/db.ts on line 19
dbInstance.version(2).stores({
  courses: 'id, topic, createdAt, lastAccess',
  chatSessions: '++id, lessonId, courseId, title, updatedAt, isArchived'
});

// Export the instance cast to our specialized interface for use in the rest of the app
const db = dbInstance as IDidataDB;

export { db };
