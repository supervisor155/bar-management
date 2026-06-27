import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Surface, IconButton, List, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchOne, fetchAll } from '../database';
import { format } from 'date-fns';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { aiEngine } from '../ai/aiEngine';
import { formatCurrency, ensureNumber } from '../utils/formatters';

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    lowStockItems: 0,
    activeOrders: 0,
    paidOrders: 0,
    unpaidOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [aiInsight, setAiInsight] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      // Get today's date
      const today = format(new Date(), 'yyyy-MM-dd');

      // Get today's revenue
      const revenueResult = await fetchOne(
        `SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as orders
         FROM orders
         WHERE DATE(created_at) = ? AND payment_status = 'paid'`,
        [today]
      );

      // Get active orders
      const activeOrdersResult = await fetchOne(
        `SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'preparing')`,
        []
      );

      // Get paid and unpaid orders count for today
      const paidOrdersResult = await fetchOne(
        `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ? AND payment_status = 'paid'`,
        [today]
      );

      const unpaidOrdersResult = await fetchOne(
        `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ? AND payment_status IN ('pending', 'partial')`,
        [today]
      );

      // Get low stock products
      const lowStockResult = await fetchAll(
        `SELECT name, current_stock, min_stock_level, unit
         FROM products
         WHERE current_stock <= min_stock_level AND is_active = 1
         ORDER BY current_stock ASC
         LIMIT 5`,
        []
      );

      // Get recent orders
      const recentOrdersResult = await fetchAll(
        `SELECT id, order_number, table_number, total_amount, status, created_at
         FROM orders
         ORDER BY created_at DESC
         LIMIT 10`,
        []
      );

      setStats({
        todayRevenue: ensureNumber(revenueResult?.revenue, 0),
        todayOrders: ensureNumber(revenueResult?.orders, 0),
        lowStockItems: lowStockResult.length || 0,
        activeOrders: ensureNumber(activeOrdersResult?.count, 0),
        paidOrders: ensureNumber(paidOrdersResult?.count, 0),
        unpaidOrders: ensureNumber(unpaidOrdersResult?.count, 0),
      });

      setLowStockProducts(lowStockResult);
      setRecentOrders(recentOrdersResult);

      // Load AI insight (for managers and owners)
      if (user?.role === 'owner' || user?.role === 'manager') {
        try {
          const insights = await aiEngine.getBusinessInsights();
          if (insights.length > 0) {
            setAiInsight(insights[0]); // Show the top priority insight
          }
        } catch (error) {
          console.error('Error loading AI insight:', error);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'preparing':
        return '#2196f3';
      case 'ready':
        return '#4caf50';
      case 'served':
        return '#9e9e9e';
      case 'cancelled':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.greeting}>
          Welcome, {user?.fullName}!
        </Text>
        <Text variant="bodyMedium" style={styles.role}>
          {user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={[styles.statCard, styles.revenueCard]}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="cash-multiple" size={32} color="#fff" />
            <Text variant="bodySmall" style={styles.statLabel}>
              Today's Revenue
            </Text>
            <Text variant="headlineSmall" style={styles.statValue}>
              {formatCurrency(stats.todayRevenue)}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, styles.ordersCard]}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="receipt" size={32} color="#fff" />
            <Text variant="bodySmall" style={styles.statLabel}>
              Today's Orders
            </Text>
            <Text variant="headlineSmall" style={styles.statValue}>
              {stats.todayOrders}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, styles.activeCard]}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="timer-sand" size={32} color="#fff" />
            <Text variant="bodySmall" style={styles.statLabel}>
              Active Orders
            </Text>
            <Text variant="headlineSmall" style={styles.statValue}>
              {stats.activeOrders}
            </Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, styles.stockCard]}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="alert-circle" size={32} color="#fff" />
            <Text variant="bodySmall" style={styles.statLabel}>
              Low Stock Alerts
            </Text>
            <Text variant="headlineSmall" style={styles.statValue}>
              {stats.lowStockItems}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Paid/Unpaid Orders Section - For Managers */}
      {(user?.role === 'owner' || user?.role === 'manager') && (
        <Card style={styles.ordersManagementCard}>
          <Card.Title
            title="Today's Order Status"
            left={(props) => <MaterialCommunityIcons name="cash-check" size={24} color="#1976d2" />}
          />
          <Card.Content>
            <View style={styles.orderStatusRow}>
              <Button
                mode="contained"
                icon="check-circle"
                style={[styles.orderStatusButton, { backgroundColor: '#4caf50' }]}
                labelStyle={{ color: '#fff' }}
                onPress={() => navigation.navigate('Orders', { filter: 'paid' })}
              >
                Paid: {stats.paidOrders}
              </Button>
              <Button
                mode="contained"
                icon="clock-alert"
                style={[styles.orderStatusButton, { backgroundColor: '#ff9800' }]}
                labelStyle={{ color: '#fff' }}
                onPress={() => navigation.navigate('Orders', { filter: 'unpaid' })}
              >
                Unpaid: {stats.unpaidOrders}
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Quick Actions Shortcuts */}
      <Card style={styles.card}>
        <Card.Title
          title="Quick Actions"
          left={(props) => <MaterialCommunityIcons name="lightning-bolt" size={24} color="#ff9800" />}
        />
        <Card.Content>
          <View style={styles.quickActionsGrid}>
            <Button
              mode="contained-tonal"
              icon="cart-plus"
              onPress={() => navigation.navigate('POS')}
              style={styles.quickActionButton}
              contentStyle={styles.quickActionContent}
            >
              New Order
            </Button>
            <Button
              mode="contained-tonal"
              icon="table-chair"
              onPress={() => navigation.navigate('TableManagement')}
              style={styles.quickActionButton}
              contentStyle={styles.quickActionContent}
            >
              Tables
            </Button>
            <Button
              mode="contained-tonal"
              icon="chef-hat"
              onPress={() => navigation.navigate('KitchenDisplay')}
              style={styles.quickActionButton}
              contentStyle={styles.quickActionContent}
            >
              Kitchen
            </Button>
            {(user?.role === 'owner' || user?.role === 'manager') && (
              <>
                <Button
                  mode="contained-tonal"
                  icon="chart-line"
                  onPress={() => navigation.navigate('Analytics')}
                  style={styles.quickActionButton}
                  contentStyle={styles.quickActionContent}
                >
                  Analytics
                </Button>
                <Button
                  mode="contained-tonal"
                  icon="cash-register"
                  onPress={() => navigation.navigate('CashDrawer')}
                  style={styles.quickActionButton}
                  contentStyle={styles.quickActionContent}
                >
                  Cash Drawer
                </Button>
                <Button
                  mode="contained-tonal"
                  icon="medal"
                  onPress={() => navigation.navigate('LoyaltyProgram')}
                  style={styles.quickActionButton}
                  contentStyle={styles.quickActionContent}
                >
                  Loyalty
                </Button>
              </>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* AI Insight Widget */}
      {aiInsight && (user?.role === 'owner' || user?.role === 'manager') && (
        <Card style={[styles.card, { borderLeftWidth: 4, borderLeftColor: aiInsight.color }]}>
          <Card.Title
            title="🤖 AI Insight"
            subtitle="Smart recommendation for you"
            left={(props) => <MaterialCommunityIcons name={aiInsight.icon} size={24} color={aiInsight.color} />}
            right={(props) => (
              <Button onPress={() => navigation.navigate('AIInsights')}>View All</Button>
            )}
          />
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              {aiInsight.title}
            </Text>
            <Text variant="bodyMedium" style={{ color: '#666' }}>
              {aiInsight.message}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card style={styles.card}>
          <Card.Title
            title="Low Stock Alerts"
            left={(props) => <MaterialCommunityIcons name="alert" size={24} color="#f44336" />}
          />
          <Card.Content>
            {lowStockProducts.map((product, index) => (
              <List.Item
                key={index}
                title={product.name}
                description={`${product.current_stock} ${product.unit} remaining`}
                left={(props) => <List.Icon {...props} icon="package-variant" />}
                titleStyle={{ color: '#f44336' }}
              />
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Recent Orders */}
      <Card style={styles.card}>
        <Card.Title
          title="Recent Orders"
          left={(props) => <MaterialCommunityIcons name="clipboard-list" size={24} color="#1976d2" />}
        />
        <Card.Content>
          {recentOrders.length === 0 ? (
            <Text style={styles.emptyText}>No orders yet today</Text>
          ) : (
            recentOrders.map((order) => (
              <List.Item
                key={order.id}
                title={`Order #${order.order_number}`}
                description={`Table: ${order.table_number || 'N/A'} • ${formatCurrency(order.total_amount)}`}
                left={(props) => (
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
                )}
                right={(props) => (
                  <Text style={styles.statusText}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Text>
                )}
              />
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#1976d2',
  },
  greeting: {
    color: '#fff',
    fontWeight: 'bold',
  },
  role: {
    color: '#e3f2fd',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    marginBottom: 10,
  },
  revenueCard: {
    backgroundColor: '#4caf50',
  },
  ordersCard: {
    backgroundColor: '#2196f3',
  },
  activeCard: {
    backgroundColor: '#ff9800',
  },
  stockCard: {
    backgroundColor: '#f44336',
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  statLabel: {
    color: '#fff',
    marginTop: 8,
    opacity: 0.9,
  },
  statValue: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  card: {
    margin: 12,
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 20,
    marginLeft: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
  },
  ordersManagementCard: {
    margin: 12,
    marginBottom: 10,
  },
  orderStatusRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  orderStatusButton: {
    flex: 1,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickActionButton: {
    flexBasis: '48%',
    flexGrow: 0,
  },
  quickActionContent: {
    paddingVertical: 8,
  },
});
