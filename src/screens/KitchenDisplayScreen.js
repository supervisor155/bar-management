import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, IconButton, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAll, updateRecord, executeQuery } from '../database';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

export default function KitchenDisplayScreen() {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, food, beverage
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null);

  useEffect(() => {
    loadOrders();
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadOrders();
    }, 10000);
    setAutoRefreshInterval(interval);

    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    try {
      // Get all active orders (pending, preparing)
      const ordersData = await fetchAll(
        `SELECT o.*, u.full_name as waiter_name
         FROM orders o
         JOIN users u ON o.created_by = u.id
         WHERE o.status IN ('pending', 'preparing')
         ORDER BY o.created_at ASC`,
        []
      );

      // Load items for each order
      const ordersWithItems = await Promise.all(
        ordersData.map(async (order) => {
          const items = await fetchAll(
            `SELECT oi.*, p.name as product_name, p.unit, c.name as category_name, c.type as category_type
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             JOIN categories c ON p.category_id = c.id
             WHERE oi.order_id = ?
             ORDER BY oi.id ASC`,
            [order.id]
          );
          return { ...order, items };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleMarkItemReady = async (orderId, itemId) => {
    try {
      await updateRecord(
        'order_items',
        { kitchen_status: 'ready', updated_at: new Date().toISOString() },
        'id = ?',
        [itemId]
      );
      await loadOrders();
    } catch (error) {
      console.error('Error marking item ready:', error);
    }
  };

  const handleMarkItemPreparing = async (orderId, itemId) => {
    try {
      await updateRecord(
        'order_items',
        { kitchen_status: 'preparing', updated_at: new Date().toISOString() },
        'id = ?',
        [itemId]
      );
      await loadOrders();
    } catch (error) {
      console.error('Error marking item preparing:', error);
    }
  };

  const handleMarkOrderReady = async (orderId) => {
    try {
      // Mark all items as ready
      const order = orders.find(o => o.id === orderId);
      for (const item of order.items) {
        if (item.kitchen_status !== 'ready') {
          await updateRecord(
            'order_items',
            { kitchen_status: 'ready', updated_at: new Date().toISOString() },
            'id = ?',
            [item.id]
          );
        }
      }

      // Update order status to ready
      await updateRecord(
        'orders',
        { status: 'ready', updated_at: new Date().toISOString() },
        'id = ?',
        [orderId]
      );

      await loadOrders();
    } catch (error) {
      console.error('Error marking order ready:', error);
    }
  };

  const getKitchenStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'preparing':
        return '#2196f3';
      case 'ready':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  const getKitchenStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'clock-alert';
      case 'preparing':
        return 'chef-hat';
      case 'ready':
        return 'check-circle';
      default:
        return 'help-circle';
    }
  };

  const getOrderPriority = (order) => {
    const createdTime = new Date(order.created_at);
    const now = new Date();
    const minutesAgo = Math.floor((now - createdTime) / 1000 / 60);

    if (minutesAgo > 15) return { level: 'urgent', color: '#f44336', text: `${minutesAgo} min ago` };
    if (minutesAgo > 10) return { level: 'warning', color: '#ff9800', text: `${minutesAgo} min ago` };
    return { level: 'normal', color: '#4caf50', text: `${minutesAgo} min ago` };
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(order =>
        order.items.some(item => item.category_type === filter)
      );

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
  };

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.total}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Active Orders</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={[styles.statValue, { color: '#ff9800' }]}>{stats.pending}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={[styles.statValue, { color: '#2196f3' }]}>{stats.preparing}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Preparing</Text>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Chip selected={filter === 'all'} onPress={() => setFilter('all')} style={styles.filterChip}>
            All Orders
          </Chip>
          <Chip selected={filter === 'food'} onPress={() => setFilter('food')} style={styles.filterChip}>
            Food
          </Chip>
          <Chip selected={filter === 'beverage'} onPress={() => setFilter('beverage')} style={styles.filterChip}>
            Drinks
          </Chip>
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chef-hat" size={64} color="#ccc" />
            <Text variant="titleLarge" style={styles.emptyText}>No Active Orders</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>New orders will appear here</Text>
          </View>
        ) : (
          <View style={styles.ordersGrid}>
            {filteredOrders.map((order) => {
              const priority = getOrderPriority(order);
              const allReady = order.items.every(item => item.kitchen_status === 'ready');
              const anyPreparing = order.items.some(item => item.kitchen_status === 'preparing');

              return (
                <Card key={order.id} style={[styles.orderCard, { borderLeftColor: priority.color, borderLeftWidth: 6 }]}>
                  <Card.Content>
                    {/* Order Header */}
                    <View style={styles.orderHeader}>
                      <View style={styles.orderInfo}>
                        <Text variant="headlineSmall" style={styles.orderNumber}>
                          {order.order_number}
                        </Text>
                        <Text variant="bodyMedium" style={styles.tableNumber}>
                          Table: {order.table_number || 'Takeaway'}
                        </Text>
                      </View>
                      <View style={styles.priorityBadge}>
                        <MaterialCommunityIcons name="clock-fast" size={20} color={priority.color} />
                        <Text variant="bodySmall" style={[styles.priorityText, { color: priority.color }]}>
                          {priority.text}
                        </Text>
                      </View>
                    </View>

                    <Text variant="bodySmall" style={styles.waiter}>Waiter: {order.waiter_name}</Text>

                    <Divider style={styles.divider} />

                    {/* Order Items */}
                    {order.items
                      .filter(item => filter === 'all' || item.category_type === filter)
                      .map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                          <View style={styles.itemInfo}>
                            <View style={styles.quantityBadge}>
                              <Text style={styles.quantityText}>{item.quantity}x</Text>
                            </View>
                            <View>
                              <Text variant="bodyLarge" style={styles.itemName}>
                                {item.product_name}
                              </Text>
                              <Chip
                                mode="flat"
                                style={[styles.categoryChip, { backgroundColor: item.category_type === 'food' ? '#ff980020' : '#2196f320' }]}
                                textStyle={{ fontSize: 10 }}
                              >
                                {item.category_name}
                              </Chip>
                            </View>
                          </View>
                          <View style={styles.itemActions}>
                            {item.kitchen_status === 'pending' && (
                              <IconButton
                                icon="play"
                                size={20}
                                iconColor="#2196f3"
                                onPress={() => handleMarkItemPreparing(order.id, item.id)}
                                style={styles.itemButton}
                              />
                            )}
                            {item.kitchen_status === 'preparing' && (
                              <IconButton
                                icon="check"
                                size={20}
                                iconColor="#4caf50"
                                onPress={() => handleMarkItemReady(order.id, item.id)}
                                style={styles.itemButton}
                              />
                            )}
                            <Chip
                              mode="flat"
                              style={[styles.statusChip, { backgroundColor: getKitchenStatusColor(item.kitchen_status) + '20' }]}
                              textStyle={{ color: getKitchenStatusColor(item.kitchen_status), fontSize: 10 }}
                              icon={getKitchenStatusIcon(item.kitchen_status)}
                            >
                              {item.kitchen_status.toUpperCase()}
                            </Chip>
                          </View>
                        </View>
                      ))}

                    <Divider style={styles.divider} />

                    {/* Order Actions */}
                    <View style={styles.orderActions}>
                      {allReady ? (
                        <Chip icon="check-all" style={styles.readyChip} textStyle={{ color: '#4caf50' }}>
                          All Items Ready
                        </Chip>
                      ) : (
                        <Button
                          mode="contained"
                          icon="check-all"
                          onPress={() => handleMarkOrderReady(order.id)}
                          style={styles.readyButton}
                          buttonColor="#4caf50"
                        >
                          Mark All Ready
                        </Button>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Auto-refresh indicator */}
      <View style={styles.autoRefreshIndicator}>
        <MaterialCommunityIcons name="refresh" size={16} color="#666" />
        <Text variant="bodySmall" style={styles.autoRefreshText}>Auto-refresh: 10s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  filterScroll: {
    marginTop: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  scrollContent: {
    padding: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#999',
  },
  ordersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  orderCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 400,
    borderRadius: 12,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontWeight: 'bold',
  },
  tableNumber: {
    color: '#666',
    marginTop: 2,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityText: {
    fontWeight: 'bold',
  },
  waiter: {
    color: '#999',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  quantityBadge: {
    backgroundColor: '#1976d2',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemName: {
    fontWeight: '500',
  },
  categoryChip: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemButton: {
    margin: 0,
  },
  statusChip: {
    height: 28,
  },
  orderActions: {
    marginTop: 8,
  },
  readyButton: {
    borderRadius: 8,
  },
  readyChip: {
    alignSelf: 'center',
    backgroundColor: '#4caf5020',
  },
  autoRefreshIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    elevation: 2,
    gap: 4,
  },
  autoRefreshText: {
    color: '#666',
  },
});
