import { Platform } from 'react-native';
import * as webDb from './webDatabase';
// Use offline-first database for native platforms
import * as offlineDb from './offlineDatabase';

// Export the appropriate database implementation based on platform
// Web: Use existing localStorage-based implementation
// Native: Use new offline-first SQLite + Supabase implementation
const db = Platform.OS === 'web' ? webDb : offlineDb;

export const initDatabase = db.initDatabase || webDb.initDatabase;
export const getDatabase = db.getDatabase || webDb.getDatabase;
export const fetchAll = db.fetchAll;
export const fetchOne = db.fetchOne;
export const insertRecord = db.insertRecord;
export const updateRecord = db.updateRecord;
export const deleteRecord = db.deleteRecord;
export const executeQuery = db.executeQuery || webDb.executeQuery;
