import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Card, Text, SegmentedButtons, Portal, Modal, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAll, fetchOne } from '../database';
import { formatCurrency, ensureNumber } from '../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const CHART_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4', '#ffeb3b', '#795548'];

export default function AnalyticsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7days'); // 7days, 30days, 90days
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    growth: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  useFocusEffect(
    React.useCallback(() => {
      loadAnalytics();
    }, [timeRange])
  );

  const loadAnalytics = async () => {
    try {
      const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      // Revenue trend
      const revenueByDay = await fetchAll(
        `SELECT DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders
         FROM orders
         WHERE payment_status = 'paid' AND DATE(created_at) >= ?
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [startDate]
      );
      setRevenueData(revenueByDay);

      // Top products
      const topProductsData = await fetchAll(
        `SELECT p.name, SUM(oi.quantity) as quantity, SUM(oi.subtotal) as revenue
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.payment_status = 'paid' AND DATE(o.created_at) >= ?
         GROUP BY p.id
         ORDER BY revenue DESC
         LIMIT 5`,
        [startDate]
      );
      setTopProducts(topProductsData);

      // Category breakdown
      const categoryData = await fetchAll(
        `SELECT c.name, c.type, SUM(oi.subtotal) as revenue, COUNT(DISTINCT oi.order_id) as orders
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN categories c ON p.category_id = c.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.payment_status = 'paid' AND DATE(o.created_at) >= ?
         GROUP BY c.id
         ORDER BY revenue DESC`,
        [startDate]
      );
      setCategoryBreakdown(categoryData);

      // Hourly sales (today only)
      const hourlyData = await fetchAll(
        `SELECT strftime('%H', created_at) as hour, COUNT(*) as orders, SUM(total_amount) as revenue
         FROM orders
         WHERE payment_status = 'paid' AND DATE(created_at) = DATE('now')
         GROUP BY strftime('%H', created_at)
         ORDER BY hour ASC`,
        []
      );
      setHourlyData(hourlyData);

      // Payment method breakdown
      const paymentData = await fetchAll(
        `SELECT payment_method, COUNT(*) as count, SUM(total_amount) as revenue
         FROM orders
         WHERE payment_status = 'paid' AND DATE(created_at) >= ?
         GROUP BY payment_method
         ORDER BY revenue DESC`,
        [startDate]
      );
      setPaymentMethodData(paymentData);

      // Calculate stats
      const totalRevenue = revenueByDay.reduce((sum, d) => sum + ensureNumber(d.revenue, 0), 0);
      const totalOrders = revenueByDay.reduce((sum, d) => sum + ensureNumber(d.orders, 0), 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate growth (compare first half vs second half)
      const midPoint = Math.floor(revenueByDay.length / 2);
      const firstHalf = revenueByDay.slice(0, midPoint).reduce((sum, d) => sum + ensureNumber(d.revenue, 0), 0);
      const secondHalf = revenueByDay.slice(midPoint).reduce((sum, d) => sum + ensureNumber(d.revenue, 0), 0);
      const growth = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

      setStats({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        growth,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  // Calculate max values for chart scaling
  const maxRevenue = Math.max(...revenueData.map(d => ensureNumber(d.revenue, 0)), 1);
  const maxCategoryRevenue = Math.max(...categoryBreakdown.map(c => ensureNumber(c.revenue, 0)), 1);
  const maxProductRevenue = Math.max(...topProducts.map(p => ensureNumber(p.revenue, 0)), 1);

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Time Range Selector */}
        <View style={styles.header}>
          <SegmentedButtons
            value={timeRange}
            onValueChange={setTimeRange}
            buttons={[
              { value: '7days', label: '7 Days' },
              { value: '30days', label: '30 Days' },
              { value: '90days', label: '90 Days' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.statLabel}>Total Revenue</Text>
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#4caf50' }]}>
                {formatCurrency(stats.totalRevenue)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.statLabel}>Total Orders</Text>
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#2196f3' }]}>
                {stats.totalOrders}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.statLabel}>Avg Order Value</Text>
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#ff9800' }]}>
                {formatCurrency(stats.avgOrderValue)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.statLabel}>Growth</Text>
              <Text variant="headlineSmall" style={[styles.statValue, { color: stats.growth >= 0 ? '#4caf50' : '#f44336' }]}>
                {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Revenue Trend Chart */}
        <Card style={styles.chartCard}>
          <Card.Title
            title="Revenue Trend"
            left={(props) => <MaterialCommunityIcons name="chart-line" size={24} color="#4caf50" />}
          />
          <Card.Content>
            <View style={styles.chartContainer}>
              {revenueData.length === 0 ? (
                <Text style={styles.noDataText}>No data available</Text>
              ) : (
                <>
                  {revenueData.map((item, index) => {
                    const barHeight = (ensureNumber(item.revenue, 0) / maxRevenue) * 150;
                    return (
                      <View key={index} style={styles.barWrapper}>
                        <View style={styles.barContainer}>
                          <Text style={styles.barValue}>{formatCurrency(item.revenue).replace(' RWF', 'k')}</Text>
                          <View style={[styles.bar, { height: barHeight, backgroundColor: '#4caf50' }]} />
                        </View>
                        <Text style={styles.barLabel}>{format(new Date(item.date), 'MMM dd')}</Text>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Top Products */}
        <Card style={styles.chartCard}>
          <Card.Title
            title="Top Products"
            subtitle="By revenue"
            left={(props) => <MaterialCommunityIcons name="trophy" size={24} color="#ffd700" />}
          />
          <Card.Content>
            {topProducts.length === 0 ? (
              <Text style={styles.noDataText}>No data available</Text>
            ) : (
              topProducts.map((product, index) => {
                const barWidth = (ensureNumber(product.revenue, 0) / maxProductRevenue) * 100;
                return (
                  <View key={index} style={styles.horizontalBarWrapper}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productRank}>#{index + 1}</Text>
                      <View style={styles.productDetails}>
                        <Text variant="bodyLarge" style={styles.productName}>{product.name}</Text>
                        <Text variant="bodySmall" style={styles.productStats}>
                          {product.quantity} sold • {formatCurrency(product.revenue)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.horizontalBarContainer}>
                      <View style={[styles.horizontalBar, { width: `${barWidth}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
                    </View>
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {/* Category Breakdown - Pie Chart */}
        <Card style={styles.chartCard}>
          <Card.Title
            title="Category Breakdown"
            subtitle="Revenue by category"
            left={(props) => <MaterialCommunityIcons name="chart-pie" size={24} color="#2196f3" />}
          />
          <Card.Content>
            {categoryBreakdown.length === 0 ? (
              <Text style={styles.noDataText}>No data available</Text>
            ) : (
              <>
                <View style={styles.pieChart}>
                  {categoryBreakdown.map((category, index) => {
                    const percentage = (ensureNumber(category.revenue, 0) / maxCategoryRevenue) * 100;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.pieSlice,
                          {
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                            height: percentage > 10 ? 60 : 40,
                            flex: percentage / 100,
                          },
                        ]}
                      >
                        <Text style={styles.piePercentage}>{percentage.toFixed(0)}%</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.legend}>
                  {categoryBreakdown.map((category, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
                      <View style={styles.legendText}>
                        <Text variant="bodyMedium" style={styles.legendName}>{category.name}</Text>
                        <Text variant="bodySmall" style={styles.legendValue}>
                          {formatCurrency(category.revenue)} • {category.orders} orders
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Payment Methods */}
        <Card style={styles.chartCard}>
          <Card.Title
            title="Payment Methods"
            subtitle="Distribution by payment type"
            left={(props) => <MaterialCommunityIcons name="credit-card-multiple" size={24} color="#ff9800" />}
          />
          <Card.Content>
            {paymentMethodData.length === 0 ? (
              <Text style={styles.noDataText}>No data available</Text>
            ) : (
              paymentMethodData.map((method, index) => {
                const totalPayments = paymentMethodData.reduce((sum, m) => sum + ensureNumber(m.count, 0), 0);
                const percentage = totalPayments > 0 ? (ensureNumber(method.count, 0) / totalPayments) * 100 : 0;

                const methodIcons = {
                  cash: 'cash',
                  card: 'credit-card',
                  mobile_money: 'cellphone',
                  credit: 'account-clock',
                };

                return (
                  <View key={index} style={styles.paymentMethodItem}>
                    <View style={styles.paymentMethodInfo}>
                      <MaterialCommunityIcons
                        name={methodIcons[method.payment_method] || 'help-circle'}
                        size={32}
                        color={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                      <View style={styles.paymentMethodDetails}>
                        <Text variant="bodyLarge" style={styles.paymentMethodName}>
                          {(method.payment_method || 'Unknown').replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text variant="bodySmall" style={styles.paymentMethodStats}>
                          {method.count} orders • {formatCurrency(method.revenue)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.paymentMethodPercentage}>
                      <Text variant="headlineSmall" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {/* Hourly Sales (Today) */}
        <Card style={styles.chartCard}>
          <Card.Title
            title="Today's Hourly Sales"
            subtitle="Peak hours analysis"
            left={(props) => <MaterialCommunityIcons name="clock-time-four" size={24} color="#9c27b0" />}
          />
          <Card.Content>
            {hourlyData.length === 0 ? (
              <Text style={styles.noDataText}>No data available for today</Text>
            ) : (
              <View style={styles.hourlyChart}>
                {Array.from({ length: 24 }, (_, i) => {
                  const hourData = hourlyData.find(h => parseInt(h.hour) === i);
                  const orders = hourData ? ensureNumber(hourData.orders, 0) : 0;
                  const maxHourlyOrders = Math.max(...hourlyData.map(h => ensureNumber(h.orders, 0)), 1);
                  const barHeight = (orders / maxHourlyOrders) * 100;

                  return (
                    <View key={i} style={styles.hourlyBarWrapper}>
                      <View style={styles.hourlyBarContainer}>
                        {orders > 0 && <Text style={styles.hourlyValue}>{orders}</Text>}
                        <View style={[styles.hourlyBar, { height: `${barHeight}%`, backgroundColor: orders > 0 ? '#9c27b0' : '#e0e0e0' }]} />
                      </View>
                      <Text style={styles.hourlyLabel}>{i.toString().padStart(2, '0')}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
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
  segmentedButtons: {
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    marginBottom: 8,
  },
  statLabel: {
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  chartCard: {
    margin: 12,
    marginBottom: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingVertical: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 5,
  },
  barValue: {
    fontSize: 9,
    color: '#666',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 9,
    color: '#999',
    marginTop: 4,
    transform: [{ rotate: '-45deg' }],
  },
  horizontalBarWrapper: {
    marginBottom: 16,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  productRank: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd700',
    width: 40,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontWeight: '500',
  },
  productStats: {
    color: '#666',
    marginTop: 2,
  },
  horizontalBarContainer: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  horizontalBar: {
    height: '100%',
    borderRadius: 10,
  },
  pieChart: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  pieSlice: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  piePercentage: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  legend: {
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
  },
  legendText: {
    flex: 1,
  },
  legendName: {
    fontWeight: '500',
  },
  legendValue: {
    color: '#666',
    marginTop: 2,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodDetails: {
    marginLeft: 16,
    flex: 1,
  },
  paymentMethodName: {
    fontWeight: '500',
  },
  paymentMethodStats: {
    color: '#666',
    marginTop: 2,
  },
  paymentMethodPercentage: {
    marginLeft: 16,
  },
  hourlyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingVertical: 8,
  },
  hourlyBarWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  hourlyBarContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  hourlyBar: {
    width: '60%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    minHeight: 2,
  },
  hourlyValue: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2,
  },
  hourlyLabel: {
    fontSize: 8,
    color: '#999',
    marginTop: 4,
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 32,
  },
});
