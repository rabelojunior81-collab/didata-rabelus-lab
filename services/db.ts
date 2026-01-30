
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
const db = new Dexie('DidataDB') as IDidataDB;

// Configure database schema
db.version(2).stores({
  courses: 'id, topic, createdAt, lastAccess',
  chatSessions: '++id, lessonId, courseId, title, updatedAt, isArchived'
});

export { db };
