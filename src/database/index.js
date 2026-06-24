import { Platform } from 'react-native';
import * as webDb from './webDatabase';
import * as nativeDb from './database';

// Export the appropriate database implementation based on platform
const db = Platform.OS === 'web' ? webDb : nativeDb;

export const initDatabase = db.initDatabase;
export const getDatabase = db.getDatabase;
export const fetchAll = db.fetchAll;
export const fetchOne = db.fetchOne;
export const insertRecord = db.insertRecord;
export const updateRecord = db.updateRecord;
export const deleteRecord = db.deleteRecord;
export const executeQuery = db.executeQuery;
