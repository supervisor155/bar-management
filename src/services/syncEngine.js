import { supabase, checkConnection } from '../config/supabase';
import { query, execute, getOne, transaction } from '../database/sqliteDatabase';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.listeners = [];
  }

  // Start sync engine
  async start() {
    console.log('🔄 Starting sync engine...');

    // Listen for network changes
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('📶 Internet connected, triggering sync...');
        this.syncNow();
      }
    });

    // Periodic sync every 30 seconds if online
    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, 30000);

    // Initial sync
    await this.syncNow();
  }

  // Stop sync engine
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Manual sync trigger
  async syncNow() {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    try {
      this.isSyncing = true;

      const isOnline = await checkConnection();
      if (!isOnline) {
        console.log('📵 Offline - sync skipped');
        return;
      }

      console.log('🔄 Starting sync...');

      // Step 1: Push local changes to Supabase
      await this.pushLocalChanges();

      // Step 2: Pull remote changes from Supabase
      await this.pullRemoteChanges();

      console.log('✅ Sync completed successfully');

      // Notify listeners
      this.notifyListeners('sync_completed');
    } catch (error) {
      console.error('❌ Sync error:', error);
      this.notifyListeners('sync_error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Push local changes to Supabase
  async pushLocalChanges() {
    try {
      // Get all unsynced operations from queue
      const unsyncedOps = await query(
        'SELECT * FROM sync_queue WHERE synced = 0 ORDER BY local_timestamp ASC LIMIT 50'
      );

      if (unsyncedOps.length === 0) {
        console.log('📤 No local changes to push');
        return;
      }

      console.log(`📤 Pushing ${unsyncedOps.length} local changes...`);

      for (const op of unsyncedOps) {
        try {
          const data = JSON.parse(op.data);

          switch (op.operation) {
            case 'INSERT':
              await this.pushInsert(op.table_name, data);
              break;
            case 'UPDATE':
              await this.pushUpdate(op.table_name, data);
              break;
            case 'DELETE':
              await this.pushDelete(op.table_name, data.id);
              break;
          }

          // Mark as synced
          await execute('UPDATE sync_queue SET synced = 1 WHERE id = ?', [op.id]);
          console.log(`✅ Synced operation #${op.id} (${op.operation} on ${op.table_name})`);
        } catch (error) {
          console.error(`❌ Error syncing operation #${op.id}:`, error);

          // Update retry count
          await execute(
            'UPDATE sync_queue SET retry_count = retry_count + 1, error = ? WHERE id = ?',
            [error.message, op.id]
          );

          // If retry count > 5, mark as failed (but keep in queue for manual review)
          if (op.retry_count >= 5) {
            console.error(`⚠️ Operation #${op.id} failed after 5 retries, marking for review`);
          }
        }
      }
    } catch (error) {
      console.error('Error pushing local changes:', error);
      throw error;
    }
  }

  // Push insert operation
  async pushInsert(tableName, data) {
    const { error } = await supabase.from(tableName).insert(data);
    if (error) throw error;
  }

  // Push update operation
  async pushUpdate(tableName, data) {
    const { id, ...updateData } = data;
    const { error } = await supabase.from(tableName).update(updateData).eq('id', id);
    if (error) throw error;
  }

  // Push delete operation
  async pushDelete(tableName, id) {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
  }

  // Pull remote changes from Supabase
  async pullRemoteChanges() {
    try {
      console.log('📥 Pulling remote changes...');

      // Get last sync timestamp
      const lastSync = await AsyncStorage.getItem('last_sync_timestamp');
      const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

      const tables = [
        'users',
        'categories',
        'products',
        'orders',
        'order_items',
        'payments',
        'inventory_transactions',
        'suppliers',
        'purchase_orders',
        'purchase_order_items',
        'credit_customers',
        'credit_payments',
        'loyalty_customers',
        'loyalty_transactions',
        'tables',
        'cash_drawer_shifts',
        'cash_drawer_transactions',
      ];

      for (const tableName of tables) {
        try {
          // Get records updated after last sync
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .gte('updated_at', lastSyncDate.toISOString())
            .order('updated_at', { ascending: true });

          if (error) throw error;

          if (data && data.length > 0) {
            console.log(`📥 Pulling ${data.length} records from ${tableName}`);

            // Use transaction for atomicity
            await transaction(async () => {
              for (const record of data) {
                await this.upsertLocalRecord(tableName, record);
              }
            });
          }
        } catch (error) {
          console.error(`Error pulling from ${tableName}:`, error);
        }
      }

      // Update last sync timestamp
      await AsyncStorage.setItem('last_sync_timestamp', new Date().toISOString());
    } catch (error) {
      console.error('Error pulling remote changes:', error);
      throw error;
    }
  }

  // Upsert record into local SQLite
  async upsertLocalRecord(tableName, record) {
    try {
      // Check if record exists
      const existing = await getOne(`SELECT id FROM ${tableName} WHERE id = ?`, [record.id]);

      // Convert boolean fields to integers (SQLite doesn't have boolean)
      const processedRecord = { ...record };
      Object.keys(processedRecord).forEach((key) => {
        if (typeof processedRecord[key] === 'boolean') {
          processedRecord[key] = processedRecord[key] ? 1 : 0;
        }
      });

      if (existing) {
        // Update existing record
        const fields = Object.keys(processedRecord)
          .filter((key) => key !== 'id')
          .map((key) => `${key} = ?`)
          .join(', ');
        const values = Object.keys(processedRecord)
          .filter((key) => key !== 'id')
          .map((key) => processedRecord[key]);

        await execute(`UPDATE ${tableName} SET ${fields}, _synced = 1 WHERE id = ?`, [
          ...values,
          record.id,
        ]);
      } else {
        // Insert new record
        const fields = Object.keys(processedRecord).join(', ');
        const placeholders = Object.keys(processedRecord)
          .map(() => '?')
          .join(', ');
        const values = Object.values(processedRecord);

        await execute(`INSERT OR REPLACE INTO ${tableName} (${fields}, _synced) VALUES (${placeholders}, 1)`, [
          ...values,
        ]);
      }
    } catch (error) {
      console.error(`Error upserting record in ${tableName}:`, error);
      throw error;
    }
  }

  // Queue operation for sync
  async queueOperation(tableName, operation, data) {
    try {
      await execute(
        'INSERT INTO sync_queue (table_name, operation, data, local_timestamp) VALUES (?, ?, ?, ?)',
        [tableName, operation, JSON.stringify(data), Date.now()]
      );

      console.log(`📝 Queued ${operation} on ${tableName}`);

      // Try immediate sync if online
      const isOnline = await checkConnection();
      if (isOnline) {
        this.syncNow();
      }
    } catch (error) {
      console.error('Error queueing operation:', error);
      throw error;
    }
  }

  // Add sync listener
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove sync listener
  removeListener(callback) {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach((callback) => callback(event, data));
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const result = await getOne('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0');
      return {
        pendingOperations: result?.count || 0,
        isSyncing: this.isSyncing,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { pendingOperations: 0, isSyncing: false };
    }
  }

  // Clear sync queue (use with caution!)
  async clearSyncQueue() {
    try {
      await execute('DELETE FROM sync_queue WHERE synced = 1');
      console.log('🗑️ Cleared synced operations from queue');
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  }

  // Force full sync (for debugging or manual refresh)
  async forceFullSync() {
    try {
      console.log('🔄 Force full sync - clearing last sync timestamp');
      await AsyncStorage.removeItem('last_sync_timestamp');
      await this.syncNow();
    } catch (error) {
      console.error('Error forcing full sync:', error);
      throw error;
    }
  }
}

export const syncEngine = new SyncEngine();
