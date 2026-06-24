import * as SQLite from 'expo-sqlite';
import { createTables, seedData } from './schema';

let db = null;

export const initDatabase = async () => {
  try {
    // Open database (creates if doesn't exist)
    db = await SQLite.openDatabaseAsync('bar_management.db');

    console.log('Database opened successfully');

    // Create tables
    await createTables(db);
    console.log('Tables created successfully');

    // Seed initial data
    await seedData(db);
    console.log('Database seeded successfully');

    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Database helper functions
export const executeQuery = async (query, params = []) => {
  try {
    const database = getDatabase();
    const result = await database.execAsync(query, params);
    return result;
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
};

export const fetchAll = async (query, params = []) => {
  try {
    const database = getDatabase();
    const result = await database.getAllAsync(query, params);
    return result;
  } catch (error) {
    console.error('Fetch all error:', error);
    throw error;
  }
};

export const fetchOne = async (query, params = []) => {
  try {
    const database = getDatabase();
    const result = await database.getFirstAsync(query, params);
    return result;
  } catch (error) {
    console.error('Fetch one error:', error);
    throw error;
  }
};

export const insertRecord = async (table, data) => {
  try {
    const database = getDatabase();
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = await database.runAsync(query, values);

    return result.lastInsertRowId;
  } catch (error) {
    console.error('Insert error:', error);
    throw error;
  }
};

export const updateRecord = async (table, data, whereClause, whereParams = []) => {
  try {
    const database = getDatabase();
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];

    const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await database.runAsync(query, values);

    return result.changes;
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
};

export const deleteRecord = async (table, whereClause, whereParams = []) => {
  try {
    const database = getDatabase();
    const query = `DELETE FROM ${table} WHERE ${whereClause}`;
    const result = await database.runAsync(query, whereParams);

    return result.changes;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};
