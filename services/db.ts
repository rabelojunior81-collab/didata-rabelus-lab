
import { Dexie, type Table } from 'dexie';
import { Course, ChatSession } from '../types';

export interface AppStateEntry {
  key: string;
  value: any;
}

export interface IDidataDB extends Dexie {
  courses: Table<Course>;
  chatSessions: Table<ChatSession>;
  appState: Table<AppStateEntry>;
}

const dbInstance = new Dexie('DidataDB');

dbInstance.version(3).stores({
  courses: 'id, topic, createdAt, lastAccess',
  chatSessions: '++id, lessonId, courseId, title, updatedAt, isArchived',
  appState: 'key'
});

const db = dbInstance as IDidataDB;

export { db };
