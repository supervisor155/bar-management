import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, List, Divider, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { aiEngine } from '../ai/aiEngine';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export default function AIInsightsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [stockRecommendations, setStockRecommendations] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [trends, setTrends] = useState(null);
  const [activeTab, setActiveTab] = useState('insights');

  useEffect(() => {
    loadAIData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAIData();
    }, [])
  );

  const loadAIData = async () => {
    try {
      setLoading(true);

      const [insightsData, stockRecs, performanceData, trendsData] = await Promise.all([
        aiEngine.getBusinessInsights(),
        aiEngine.getStockRecommendations(),
        aiEngine.getProductPerformance(),
        aiEngine.analyzeTrends(),
      ]);

      setInsights(insightsData);
      setStockRecommendations(stockRecs);
      setPerformance(performanceData);
      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAIData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return `${Math.round(amount).toLocaleString()} RWF`;
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical':
        return '#f44336';
      case 'high':
        return '#ff9800';
      case 'medium':
        return '#2196f3';
      default:
        return '#4caf50';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'urgent_restock':
        return 'alert-circle';
      case 'restock_soon':
        return 'clock-alert';
      case 'monitor':
        return 'eye';
      case 'overstocked':
        return 'package-down';
      default:
        return 'check-circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text variant="titleMedium" style={styles.loadingText}>
          AI is analyzing your data...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'insights', label: 'Insights', icon: 'lightbulb' },
            { value: 'stock', label: 'Stock', icon: 'package-variant' },
            { value: 'performance', label: 'Performance', icon: 'chart-bar' },
            { value: 'trends', label: 'Trends', icon: 'trending-up' },
          ]}
        />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <View style={styles.tabContent}>
            <Card style={styles.headerCard}>
              <Card.Content>
                <View style={styles.headerRow}>
                  <MaterialCommunityIcons name="robot" size={48} color="#1976d2" />
                  <View style={styles.headerText}>
                    <Text variant="headlineSmall">AI Insights</Text>
                    <Text variant="bodyMedium" style={styles.subtitle}>
                      Powered by intelligent algorithms
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {insights.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="check-all" size={64} color="#4caf50" />
                  <Text variant="titleLarge" style={styles.emptyTitle}>
                    All Good! 🎉
                  </Text>
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    No critical insights right now. Your business is running smoothly!
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              insights.map((insight, index) => (
                <Card key={index} style={[styles.insightCard, { borderLeftColor: insight.color }]}>
                  <Card.Content>
                    <View style={styles.insightHeader}>
                      <MaterialCommunityIcons name={insight.icon} size={32} color={insight.color} />
                      <View style={styles.insightTextContainer}>
                        <Text variant="titleMedium" style={styles.insightTitle}>
                          {insight.title}
                        </Text>
                        <Chip
                          mode="flat"
                          style={[styles.insightChip, { backgroundColor: insight.color + '20' }]}
                          textStyle={{ color: insight.color, fontSize: 10 }}
                        >
                          {insight.type.toUpperCase()}
                        </Chip>
                      </View>
                    </View>
                    <Text variant="bodyMedium" style={styles.insightMessage}>
                      {insight.message}
                    </Text>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {/* STOCK TAB */}
        {activeTab === 'stock' && (
          <View style={styles.tabContent}>
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text variant="titleMedium">Stock Analysis Summary</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text variant="bodySmall" style={styles.summaryLabel}>
                      Critical
                    </Text>
                    <Text variant="headlineSmall" style={[styles.summaryValue, { color: '#f44336' }]}>
                      {stockRecommendations.filter((r) => r.urgency === 'critical').length}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text variant="bodySmall" style={styles.summaryLabel}>
                      High Priority
                    </Text>
                    <Text variant="headlineSmall" style={[styles.summaryValue, { color: '#ff9800' }]}>
                      {stockRecommendations.filter((r) => r.urgency === 'high').length}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text variant="bodySmall" style={styles.summaryLabel}>
                      Optimal
                    </Text>
                    <Text variant="headlineSmall" style={[styles.summaryValue, { color: '#4caf50' }]}>
                      {stockRecommendations.filter((r) => r.action === 'optimal').length}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {stockRecommendations
              .sort((a, b) => {
                const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
              })
              .map((rec, index) => (
                <Card key={index} style={styles.stockCard}>
                  <Card.Content>
                    <View style={styles.stockHeader}>
                      <View style={styles.stockInfo}>
                        <Text variant="titleMedium">{rec.product.name}</Text>
                        <View style={styles.stockMetrics}>
                          <Chip
                            icon={getActionIcon(rec.action)}
                            mode="flat"
                            style={[styles.urgencyChip, { backgroundColor: getUrgencyColor(rec.urgency) + '20' }]}
                            textStyle={{ color: getUrgencyColor(rec.urgency), fontSize: 10 }}
                          >
                            {rec.urgency.toUpperCase()}
                          </Chip>
                          <Text variant="bodySmall" style={styles.stockDays}>
                            {rec.daysUntilStockout < 999
                              ? `${rec.daysUntilStockout} days left`
                              : 'No sales data'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Divider style={styles.divider} />

                    <View style={styles.stockDetails}>
                      <View style={styles.detailRow}>
                        <Text variant="bodySmall" style={styles.detailLabel}>
                          Current Stock:
                        </Text>
                        <Text variant="bodyMedium" style={styles.detailValue}>
                          {rec.currentStock} {rec.product.unit}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text variant="bodySmall" style={styles.detailLabel}>
                          Avg Daily Sales:
                        </Text>
                        <Text variant="bodyMedium" style={styles.detailValue}>
                          {rec.prediction.avgDailySales} {rec.product.unit}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text variant="bodySmall" style={styles.detailLabel}>
                          7-Day Forecast:
                        </Text>
                        <Text variant="bodyMedium" style={styles.detailValue}>
                          {rec.prediction.prediction} {rec.product.unit}
                        </Text>
                      </View>
                      {rec.suggestedQuantity > 0 && (
                        <>
                          <Divider style={styles.divider} />
                          <View style={styles.recommendationBox}>
                            <Text variant="titleSmall" style={styles.recommendationTitle}>
                              AI Recommendation:
                            </Text>
                            <Text variant="bodyLarge" style={styles.recommendationText}>
                              Order {rec.suggestedQuantity} {rec.product.unit}
                            </Text>
                            <Text variant="bodySmall" style={styles.recommendationCost}>
                              Estimated Cost: {formatCurrency(rec.suggestedQuantity * rec.product.cost_price)}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    <Text variant="bodyMedium" style={styles.stockMessage}>
                      💡 {rec.message}
                    </Text>

                    {rec.prediction.confidence > 0 && (
                      <View style={styles.confidenceBar}>
                        <Text variant="bodySmall" style={styles.confidenceLabel}>
                          Prediction Confidence: {rec.prediction.confidence}%
                        </Text>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${rec.prediction.confidence}%`,
                                backgroundColor:
                                  rec.prediction.confidence > 70
                                    ? '#4caf50'
                                    : rec.prediction.confidence > 40
                                    ? '#ff9800'
                                    : '#f44336',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))}
          </View>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === 'performance' && performance && (
          <View style={styles.tabContent}>
            <Card style={styles.performanceCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  🏆 Top Revenue Generators
                </Text>
                {performance.topByRevenue.map((product, index) => (
                  <List.Item
                    key={index}
                    title={product.product_name}
                    description={`${product.totalQuantity} units • ${product.orderCount} orders`}
                    left={() => (
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                    )}
                    right={() => (
                      <View style={styles.performanceValue}>
                        <Text variant="titleMedium" style={styles.revenueText}>
                          {formatCurrency(product.totalRevenue)}
                        </Text>
                        <Text variant="bodySmall" style={styles.profitText}>
                          +{formatCurrency(product.totalProfit)} profit
                        </Text>
                      </View>
                    )}
                  />
                ))}
              </Card.Content>
            </Card>

            <Card style={styles.performanceCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  📦 Most Popular Items
                </Text>
                {performance.topByQuantity.map((product, index) => (
                  <List.Item
                    key={index}
                    title={product.product_name}
                    description={`${formatCurrency(product.totalRevenue)} revenue`}
                    left={() => (
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                    )}
                    right={() => (
                      <Text variant="titleMedium" style={styles.quantityText}>
                        {product.totalQuantity} units
                      </Text>
                    )}
                  />
                ))}
              </Card.Content>
            </Card>

            <Card style={styles.performanceCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  💰 Highest Profit Makers
                </Text>
                {performance.topByProfit.map((product, index) => (
                  <List.Item
                    key={index}
                    title={product.product_name}
                    description={`Margin: ${Math.round(
                      ((product.avgPrice - product.costPrice) / product.avgPrice) * 100
                    )}%`}
                    left={() => (
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      </View>
                    )}
                    right={() => (
                      <Text variant="titleMedium" style={styles.profitHighlight}>
                        {formatCurrency(product.totalProfit)}
                      </Text>
                    )}
                  />
                ))}
              </Card.Content>
            </Card>

            {performance.slowMoving.length > 0 && (
              <Card style={[styles.performanceCard, { borderLeftWidth: 4, borderLeftColor: '#ff9800' }]}>
                <Card.Content>
                  <Text variant="titleLarge" style={styles.sectionTitle}>
                    ⚠️ Slow-Moving Items
                  </Text>
                  <Text variant="bodyMedium" style={styles.slowMovingNote}>
                    These items need attention: Consider promotion, price adjustment, or removal.
                  </Text>
                  {performance.slowMoving.map((product, index) => (
                    <List.Item
                      key={index}
                      title={product.product_name}
                      description={`Only ${product.orderCount} orders in 30 days`}
                      left={() => <MaterialCommunityIcons name="alert" size={24} color="#ff9800" />}
                      right={() => (
                        <Text variant="bodyMedium" style={styles.slowQuantity}>
                          {product.totalQuantity} units
                        </Text>
                      )}
                    />
                  ))}
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {/* TRENDS TAB */}
        {activeTab === 'trends' && trends && (
          <View style={styles.tabContent}>
            <Card style={styles.trendCard}>
              <Card.Content>
                <View style={styles.trendHeader}>
                  <MaterialCommunityIcons
                    name={trends.overallTrend === 'growing' ? 'trending-up' : 'trending-down'}
                    size={48}
                    color={trends.overallTrend === 'growing' ? '#4caf50' : '#f44336'}
                  />
                  <View style={styles.trendInfo}>
                    <Text variant="headlineSmall">Overall Trend</Text>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: trends.overallTrend === 'growing' ? '#4caf50' : '#f44336',
                        fontWeight: 'bold',
                      }}
                    >
                      {trends.overallTrend === 'growing' ? '📈 Growing' : '📉 Declining'}{' '}
                      {Math.abs(trends.trendPercentage)}%
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.trendCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  📅 Best & Worst Days
                </Text>
                <View style={styles.bestWorstContainer}>
                  <View style={styles.bestDay}>
                    <Text variant="titleMedium" style={{ color: '#4caf50' }}>
                      🏆 Best Day
                    </Text>
                    <Text variant="headlineSmall">{trends.bestDay.dayOfWeek}</Text>
                    <Text variant="bodyLarge">{formatCurrency(trends.bestDay.revenue)}</Text>
                    <Text variant="bodySmall">{trends.bestDay.day}</Text>
                  </View>
                  <View style={styles.worstDay}>
                    <Text variant="titleMedium" style={{ color: '#ff9800' }}>
                      📊 Lowest Day
                    </Text>
                    <Text variant="headlineSmall">{trends.worstDay.dayOfWeek}</Text>
                    <Text variant="bodyLarge">{formatCurrency(trends.worstDay.revenue)}</Text>
                    <Text variant="bodySmall">{trends.worstDay.day}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.trendCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  📊 Average Revenue by Day of Week
                </Text>
                {trends.weekdayPerformance.map((day, index) => (
                  <View key={index} style={styles.weekdayRow}>
                    <Text variant="bodyLarge" style={styles.weekdayName}>
                      {day.day}
                    </Text>
                    <View style={styles.weekdayBar}>
                      <View
                        style={[
                          styles.weekdayFill,
                          {
                            width: `${(day.avgRevenue / trends.weekdayPerformance[0].avgRevenue) * 100}%`,
                            backgroundColor: index === 0 ? '#4caf50' : '#2196f3',
                          },
                        ]}
                      />
                    </View>
                    <Text variant="bodyMedium" style={styles.weekdayValue}>
                      {formatCurrency(day.avgRevenue)}
                    </Text>
                  </View>
                ))}
              </Card.Content>
            </Card>

            <Card style={styles.trendCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  💡 AI Recommendations
                </Text>
                <Text variant="bodyMedium" style={styles.recommendationPoint}>
                  • <Text style={{ fontWeight: 'bold' }}>Peak Day:</Text> Staff up on{' '}
                  {trends.weekdayPerformance[0].day}s for maximum efficiency
                </Text>
                <Text variant="bodyMedium" style={styles.recommendationPoint}>
                  • <Text style={{ fontWeight: 'bold' }}>Slow Day:</Text> Consider promotions on{' '}
                  {trends.weekdayPerformance[trends.weekdayPerformance.length - 1].day}s
                </Text>
                {trends.overallTrend === 'growing' && (
                  <Text variant="bodyMedium" style={styles.recommendationPoint}>
                    • <Text style={{ fontWeight: 'bold' }}>Growth:</Text> Consider expanding inventory to meet
                    increasing demand
                  </Text>
                )}
                {trends.overallTrend === 'declining' && (
                  <Text variant="bodyMedium" style={styles.recommendationPoint}>
                    • <Text style={{ fontWeight: 'bold' }}>Action Needed:</Text> Review pricing, quality, or
                    marketing strategy
                  </Text>
                )}
              </Card.Content>
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  tabContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabContent: {
    padding: 12,
  },
  headerCard: {
    marginBottom: 12,
    backgroundColor: '#e3f2fd',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
    color: '#666',
  },
  emptyCard: {
    margin: 16,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    color: '#4caf50',
  },
  emptyText: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
  insightCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  insightTextContainer: {
    flex: 1,
  },
  insightTitle: {
    marginBottom: 8,
  },
  insightChip: {
    alignSelf: 'flex-start',
  },
  insightMessage: {
    color: '#666',
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  stockCard: {
    marginBottom: 12,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stockInfo: {
    flex: 1,
  },
  stockMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  urgencyChip: {
    height: 24,
  },
  stockDays: {
    color: '#666',
  },
  divider: {
    marginVertical: 12,
  },
  stockDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#666',
  },
  detailValue: {
    fontWeight: 'bold',
  },
  recommendationBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  recommendationTitle: {
    color: '#1976d2',
    marginBottom: 4,
  },
  recommendationText: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  recommendationCost: {
    color: '#666',
    marginTop: 4,
  },
  stockMessage: {
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  confidenceBar: {
    marginTop: 12,
  },
  confidenceLabel: {
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  performanceCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  performanceValue: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  revenueText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  profitText: {
    color: '#4caf50',
    fontSize: 12,
  },
  quantityText: {
    color: '#1976d2',
    fontWeight: 'bold',
    marginTop: 12,
  },
  profitHighlight: {
    color: '#4caf50',
    fontWeight: 'bold',
    marginTop: 12,
  },
  slowMovingNote: {
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  slowQuantity: {
    color: '#ff9800',
    marginTop: 12,
  },
  trendCard: {
    marginBottom: 16,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trendInfo: {
    flex: 1,
  },
  bestWorstContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  bestDay: {
    flex: 1,
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  worstDay: {
    flex: 1,
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  weekdayName: {
    width: 100,
    fontWeight: 'bold',
  },
  weekdayBar: {
    flex: 1,
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weekdayFill: {
    height: '100%',
  },
  weekdayValue: {
    width: 100,
    textAlign: 'right',
  },
  recommendationPoint: {
    marginBottom: 12,
    lineHeight: 20,
  },
});
