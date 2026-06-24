import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, Text, Button, SegmentedButtons, DataTable } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAll, fetchOne } from '../database';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function ReportsScreen() {
  const [period, setPeriod] = useState('today');
  const [salesData, setSalesData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);

  useEffect(() => {
    loadReportData();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'week':
        return { start: format(startOfWeek(now), 'yyyy-MM-dd'), end: format(endOfWeek(now), 'yyyy-MM-dd') };
      case 'month':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      default:
        return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
    }
  };

  const loadReportData = async () => {
    try {
      const { start, end } = getDateRange();

      // Get sales summary
      const sales = await fetchOne(
        `SELECT
          COUNT(*) as total_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as avg_order_value
         FROM orders
         WHERE DATE(created_at) BETWEEN ? AND ? AND payment_status = 'paid'`,
        [start, end]
      );

      // Get top selling products
      const topProducts = await fetchAll(
        `SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.subtotal) as revenue
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.payment_status = 'paid'
         GROUP BY p.id
         ORDER BY total_sold DESC
         LIMIT 10`,
        [start, end]
      );

      // Get hourly sales (for today only)
      if (period === 'today') {
        const hourly = await fetchAll(
          `SELECT
            CAST(strftime('%H', created_at) AS INTEGER) as hour,
            COUNT(*) as orders,
            COALESCE(SUM(total_amount), 0) as revenue
           FROM orders
           WHERE DATE(created_at) = ? AND payment_status = 'paid'
           GROUP BY hour
           ORDER BY hour`,
          [start]
        );
        setHourlyData(hourly);
      }

      setSalesData(sales);
      setTopProducts(topProducts);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const formatCurrency = (amount) => {
    return `${Math.round(amount).toLocaleString()} RWF`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Sales Reports
        </Text>

        <SegmentedButtons
          value={period}
          onValueChange={setPeriod}
          buttons={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Summary Cards */}
      {salesData && (
        <View style={styles.summaryContainer}>
          <Card style={[styles.summaryCard, styles.revenueCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="cash-multiple" size={32} color="#fff" />
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Total Revenue
              </Text>
              <Text variant="headlineSmall" style={styles.summaryValue}>
                {formatCurrency(salesData.total_revenue)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.ordersCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="receipt" size={32} color="#fff" />
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Total Orders
              </Text>
              <Text variant="headlineSmall" style={styles.summaryValue}>
                {salesData.total_orders}
              </Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, styles.avgCard]}>
            <Card.Content>
              <MaterialCommunityIcons name="chart-line" size={32} color="#fff" />
              <Text variant="bodySmall" style={styles.summaryLabel}>
                Avg Order Value
              </Text>
              <Text variant="headlineSmall" style={styles.summaryValue}>
                {formatCurrency(salesData.avg_order_value)}
              </Text>
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Top Products */}
      <Card style={styles.card}>
        <Card.Title
          title="Top Selling Products"
          left={(props) => <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />}
        />
        <Card.Content>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Product</DataTable.Title>
              <DataTable.Title numeric>Qty Sold</DataTable.Title>
              <DataTable.Title numeric>Revenue</DataTable.Title>
            </DataTable.Header>

            {topProducts.map((product, index) => (
              <DataTable.Row key={index}>
                <DataTable.Cell>{product.name}</DataTable.Cell>
                <DataTable.Cell numeric>{product.total_sold}</DataTable.Cell>
                <DataTable.Cell numeric>{formatCurrency(product.revenue)}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>

      {/* Hourly Sales (Today only) */}
      {period === 'today' && hourlyData.length > 0 && (
        <Card style={styles.card}>
          <Card.Title
            title="Sales by Hour"
            left={(props) => <MaterialCommunityIcons name="clock-outline" size={24} color="#1976d2" />}
          />
          <Card.Content>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Hour</DataTable.Title>
                <DataTable.Title numeric>Orders</DataTable.Title>
                <DataTable.Title numeric>Revenue</DataTable.Title>
              </DataTable.Header>

              {hourlyData.map((data, index) => (
                <DataTable.Row key={index}>
                  <DataTable.Cell>{data.hour}:00 - {data.hour + 1}:00</DataTable.Cell>
                  <DataTable.Cell numeric>{data.orders}</DataTable.Cell>
                  <DataTable.Cell numeric>{formatCurrency(data.revenue)}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  summaryContainer: {
    padding: 12,
  },
  summaryCard: {
    marginBottom: 12,
  },
  revenueCard: {
    backgroundColor: '#4caf50',
  },
  ordersCard: {
    backgroundColor: '#2196f3',
  },
  avgCard: {
    backgroundColor: '#ff9800',
  },
  summaryLabel: {
    color: '#fff',
    marginTop: 8,
    opacity: 0.9,
  },
  summaryValue: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  card: {
    margin: 12,
  },
});
