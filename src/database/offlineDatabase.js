import { query, execute, getOne, transaction } from './sqliteDatabase';
import { syncEngine } from '../services/syncEngine';

/**
 * Offline-First Database Layer
 *
 * This module provides a unified API that:
 * 1. Always reads from local SQLite (fast, works offline)
 * 2. Writes to local SQLite immediately (instant feedback)
 * 3. Queues writes for sync to Supabase (when online)
 * 4. Handles conflict resolution (last write wins)
 */

class OfflineDatabase {
  // FETCH OPERATIONS (Read from local SQLite)

  async fetchAll(sql, params = []) {
    try {
      return await query(sql, params);
    } catch (error) {
      console.error('fetchAll error:', error);
      throw error;
    }
  }

  async fetchOne(sql, params = []) {
    try {
      return await getOne(sql, params);
    } catch (error) {
      console.error('fetchOne error:', error);
      throw error;
    }
  }

  // WRITE OPERATIONS (Write to local + queue for sync)

  async insertRecord(tableName, data) {
    try {
      // Insert into local SQLite
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data)
        .map(() => '?')
        .join(', ');
      const values = Object.values(data);

      const result = await execute(
        `INSERT INTO ${tableName} (${fields}, _local_only, _synced) VALUES (${placeholders}, 1, 0)`,
        values
      );

      const insertedId = result.lastInsertRowId;

      // Queue for sync
      await syncEngine.queueOperation(tableName, 'INSERT', {
        ...data,
        id: insertedId,
      });

      return { id: insertedId, ...data };
    } catch (error) {
      console.error('insertRecord error:', error);
      throw error;
    }
  }

  async updateRecord(tableName, data, whereClause = '', whereParams = []) {
    try {
      const { id, ...updateData } = data;

      // Build UPDATE query
      const fields = Object.keys(updateData)
        .map((key) => `${key} = ?`)
        .join(', ');
      const values = Object.values(updateData);

      // Construct WHERE clause
      let finalWhereClause = whereClause;
      let finalWhereParams = whereParams;

      if (!whereClause && id) {
        finalWhereClause = 'id = ?';
        finalWhereParams = [id];
      }

      if (!finalWhereClause) {
        throw new Error('updateRecord requires WHERE clause or id in data');
      }

      // Update local SQLite
      await execute(
        `UPDATE ${tableName} SET ${fields}, _synced = 0 WHERE ${finalWhereClause}`,
        [...values, ...finalWhereParams]
      );

      // Queue for sync
      await syncEngine.queueOperation(tableName, 'UPDATE', data);

      return data;
    } catch (error) {
      console.error('updateRecord error:', error);
      throw error;
    }
  }

  async deleteRecord(tableName, id) {
    try {
      // Delete from local SQLite
      await execute(`DELETE FROM ${tableName} WHERE id = ?`, [id]);

      // Queue for sync
      await syncEngine.queueOperation(tableName, 'DELETE', { id });

      return { success: true };
    } catch (error) {
      console.error('deleteRecord error:', error);
      throw error;
    }
  }

  // TRANSACTION SUPPORT

  async executeTransaction(callback) {
    try {
      await transaction(callback);
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  // SPECIALIZED QUERIES

  // Get today's stats
  async getTodayStats() {
    const today = new Date().toISOString().split('T')[0];

    const revenue = await this.fetchOne(
      `SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as orders
       FROM orders
       WHERE DATE(created_at) = ? AND payment_status = 'paid'`,
      [today]
    );

    const activeOrders = await this.fetchOne(
      `SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'preparing')`,
      []
    );

    const lowStock = await this.fetchAll(
      `SELECT * FROM products
       WHERE current_stock <= min_stock_level AND is_active = 1
       LIMIT 5`,
      []
    );

    return {
      revenue: revenue?.revenue || 0,
      orders: revenue?.orders || 0,
      activeOrders: activeOrders?.count || 0,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock,
    };
  }

  // Get orders with items (JOIN)
  async getOrderWithItems(orderId) {
    const order = await this.fetchOne('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (!order) return null;

    const items = await this.fetchAll('SELECT * FROM order_items WHERE order_id = ?', [orderId]);

    return {
      ...order,
      items,
    };
  }

  // Get products by category
  async getProductsByCategory(categoryId) {
    return await this.fetchAll(
      'SELECT * FROM products WHERE category_id = ? AND is_active = 1 ORDER BY name ASC',
      [categoryId]
    );
  }

  // Get active tables
  async getActiveTables() {
    return await this.fetchAll(
      "SELECT * FROM tables WHERE status != 'maintenance' ORDER BY table_number ASC",
      []
    );
  }

  // Get user by username
  async getUserByUsername(username) {
    return await this.fetchOne('SELECT * FROM users WHERE username = ? AND is_active = 1', [
      username,
    ]);
  }

  // Get open cash drawer shift for user
  async getOpenCashDrawerShift(userId) {
    return await this.fetchOne(
      "SELECT * FROM cash_drawer_shifts WHERE opened_by = ? AND status = 'open'",
      [userId]
    );
  }

  // Get loyalty customer by phone
  async getLoyaltyCustomerByPhone(phone) {
    return await this.fetchOne('SELECT * FROM loyalty_customers WHERE phone = ? AND is_active = 1', [
      phone,
    ]);
  }

  // Get credit customer balance
  async getCreditCustomerBalance(customerId) {
    const customer = await this.fetchOne(
      'SELECT current_balance, credit_limit FROM credit_customers WHERE id = ?',
      [customerId]
    );

    return customer;
  }

  // BATCH OPERATIONS

  async insertBatch(tableName, records) {
    try {
      await transaction(async () => {
        for (const record of records) {
          await this.insertRecord(tableName, record);
        }
      });

      return { success: true, count: records.length };
    } catch (error) {
      console.error('insertBatch error:', error);
      throw error;
    }
  }

  // UTILITY FUNCTIONS

  // Get sync status
  async getSyncStatus() {
    return await syncEngine.getSyncStatus();
  }

  // Force sync
  async forceSync() {
    return await syncEngine.syncNow();
  }

  // Clear old synced operations
  async clearSyncedOperations() {
    return await syncEngine.clearSyncQueue();
  }
}

// Export singleton instance
export const offlineDb = new OfflineDatabase();

// Export individual functions for backward compatibility
export const fetchAll = (sql, params) => offlineDb.fetchAll(sql, params);
export const fetchOne = (sql, params) => offlineDb.fetchOne(sql, params);
export const insertRecord = (tableName, data) => offlineDb.insertRecord(tableName, data);
export const updateRecord = (tableName, data, whereClause, whereParams) =>
  offlineDb.updateRecord(tableName, data, whereClause, whereParams);
export const deleteRecord = (tableName, id) => offlineDb.deleteRecord(tableName, id);
