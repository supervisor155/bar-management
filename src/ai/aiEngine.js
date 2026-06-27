// AI Engine for Bar Management System
// Local algorithms - no external API calls
// Provides predictions, recommendations, and insights

import { fetchAll, fetchOne } from '../database';
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInDays } from 'date-fns';

/**
 * AI Engine Class
 * Provides intelligent recommendations and predictions
 */
export class AIEngine {
  constructor() {
    this.historicalData = null;
    this.productAnalytics = null;
  }

  /**
   * Load and prepare historical data
   */
  async loadHistoricalData() {
    try {
      // Load last 30 days of sales data
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const salesData = await fetchAll(
        `SELECT
          o.id, o.order_number, o.total_amount, o.created_at, o.payment_status,
          oi.product_id, oi.quantity, oi.unit_price, oi.subtotal,
          p.name as product_name, p.category_id, p.cost_price, p.selling_price,
          p.current_stock, p.min_stock_level
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.created_at >= ? AND o.payment_status = 'paid'
        ORDER BY o.created_at ASC`,
        [thirtyDaysAgo]
      );

      this.historicalData = salesData;
      return salesData;
    } catch (error) {
      console.error('Error loading historical data:', error);
      return [];
    }
  }

  /**
   * Predict future demand for a product
   * Uses linear regression and trend analysis
   */
  async predictDemand(productId, daysAhead = 7) {
    await this.loadHistoricalData();

    // Filter data for this product
    const productSales = this.historicalData.filter((item) => item.product_id === productId);

    if (productSales.length < 3) {
      return {
        prediction: 0,
        confidence: 0,
        method: 'insufficient_data',
      };
    }

    // Group by day and sum quantities
    const dailySales = {};
    productSales.forEach((sale) => {
      const day = format(parseISO(sale.created_at), 'yyyy-MM-dd');
      dailySales[day] = (dailySales[day] || 0) + sale.quantity;
    });

    const salesArray = Object.values(dailySales);
    const avgDailySales = salesArray.reduce((a, b) => a + b, 0) / salesArray.length;

    // Calculate trend (are sales increasing or decreasing?)
    const trend = this.calculateTrend(salesArray);

    // Predict based on average + trend
    const prediction = Math.round(avgDailySales * daysAhead * (1 + trend));

    // Confidence based on data consistency
    const confidence = this.calculateConfidence(salesArray);

    return {
      prediction,
      avgDailySales: Math.round(avgDailySales * 10) / 10,
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      trendPercentage: Math.round(trend * 100),
      confidence,
      dataPoints: salesArray.length,
      method: 'linear_regression',
    };
  }

  /**
   * Calculate trend coefficient
   * Positive = increasing, Negative = decreasing
   */
  calculateTrend(data) {
    if (data.length < 2) return 0;

    // Simple linear regression
    const n = data.length;
    const indices = data.map((_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * data[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;

    return avgY > 0 ? slope / avgY : 0; // Normalize by average
  }

  /**
   * Calculate confidence score (0-100)
   * Based on data consistency and variance
   */
  calculateConfidence(data) {
    if (data.length < 2) return 0;

    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher confidence
    const coefficientOfVariation = avg > 0 ? stdDev / avg : 1;
    const confidence = Math.max(0, Math.min(100, 100 - coefficientOfVariation * 100));

    return Math.round(confidence);
  }

  /**
   * Get stock recommendations for all products
   */
  async getStockRecommendations() {
    await this.loadHistoricalData();

    const products = await fetchAll(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY name',
      []
    );

    const recommendations = [];

    for (const product of products) {
      const prediction = await this.predictDemand(product.id, 7);
      const currentStock = product.current_stock;
      const minStock = product.min_stock_level;

      // Calculate days until stockout
      const daysUntilStockout =
        prediction.avgDailySales > 0
          ? Math.floor(currentStock / prediction.avgDailySales)
          : 999;

      // Recommendation logic
      let action = 'none';
      let urgency = 'low';
      let message = '';
      let suggestedQuantity = 0;

      if (currentStock <= minStock) {
        action = 'urgent_restock';
        urgency = 'critical';
        message = `Critical: Stock below minimum level!`;
        suggestedQuantity = Math.ceil(prediction.prediction * 2); // 2 weeks supply
      } else if (daysUntilStockout <= 3) {
        action = 'restock_soon';
        urgency = 'high';
        message = `Will run out in ${daysUntilStockout} days`;
        suggestedQuantity = Math.ceil(prediction.prediction * 1.5);
      } else if (daysUntilStockout <= 7) {
        action = 'monitor';
        urgency = 'medium';
        message = `Stock looks good for next week`;
        suggestedQuantity = Math.ceil(prediction.prediction);
      } else if (currentStock > prediction.prediction * 4 && prediction.avgDailySales > 0) {
        action = 'overstocked';
        urgency = 'low';
        message = `Possible overstock - slow sales`;
        suggestedQuantity = 0;
      } else {
        action = 'optimal';
        urgency = 'low';
        message = `Stock levels are optimal`;
        suggestedQuantity = 0;
      }

      recommendations.push({
        product,
        prediction,
        currentStock,
        minStock,
        daysUntilStockout,
        action,
        urgency,
        message,
        suggestedQuantity,
      });
    }

    return recommendations;
  }

  /**
   * Identify best and worst performing products
   */
  async getProductPerformance() {
    await this.loadHistoricalData();

    // Group by product
    const productStats = {};

    this.historicalData.forEach((item) => {
      if (!productStats[item.product_id]) {
        productStats[item.product_id] = {
          product_id: item.product_id,
          product_name: item.product_name,
          totalQuantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
          orderCount: 0,
          avgPrice: item.unit_price,
          costPrice: item.cost_price,
        };
      }

      productStats[item.product_id].totalQuantity += item.quantity;
      productStats[item.product_id].totalRevenue += item.subtotal;
      productStats[item.product_id].totalProfit += (item.unit_price - item.cost_price) * item.quantity;
      productStats[item.product_id].orderCount += 1;
    });

    const products = Object.values(productStats);

    // Sort by revenue
    const topByRevenue = [...products].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
    const topByQuantity = [...products].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5);
    const topByProfit = [...products].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 5);
    const slowMoving = [...products].sort((a, b) => a.totalQuantity - b.totalQuantity).slice(0, 5);

    return {
      topByRevenue,
      topByQuantity,
      topByProfit,
      slowMoving,
      allProducts: products,
    };
  }

  /**
   * Analyze sales trends and patterns
   */
  async analyzeTrends() {
    await this.loadHistoricalData();

    // Group by day
    const dailyData = {};
    this.historicalData.forEach((item) => {
      const day = format(parseISO(item.created_at), 'yyyy-MM-dd');
      if (!dailyData[day]) {
        dailyData[day] = { revenue: 0, orders: 0, items: 0 };
      }
      dailyData[day].revenue += item.subtotal;
      dailyData[day].items += item.quantity;
    });

    const days = Object.keys(dailyData).sort();
    const revenues = days.map((d) => dailyData[d].revenue);

    // Calculate overall trend
    const overallTrend = this.calculateTrend(revenues);

    // Find best and worst days
    const revenueByDay = days.map((day, index) => ({
      day,
      revenue: dailyData[day].revenue,
      dayOfWeek: format(parseISO(day), 'EEEE'),
    }));

    const bestDay = revenueByDay.reduce((max, day) => (day.revenue > max.revenue ? day : max));
    const worstDay = revenueByDay.reduce((min, day) => (day.revenue < min.revenue ? day : min));

    // Average by day of week
    const byDayOfWeek = {};
    revenueByDay.forEach((item) => {
      if (!byDayOfWeek[item.dayOfWeek]) {
        byDayOfWeek[item.dayOfWeek] = { total: 0, count: 0 };
      }
      byDayOfWeek[item.dayOfWeek].total += item.revenue;
      byDayOfWeek[item.dayOfWeek].count += 1;
    });

    const weekdayPerformance = Object.keys(byDayOfWeek).map((day) => ({
      day,
      avgRevenue: Math.round(byDayOfWeek[day].total / byDayOfWeek[day].count),
    }));

    return {
      overallTrend: overallTrend > 0 ? 'growing' : overallTrend < 0 ? 'declining' : 'stable',
      trendPercentage: Math.round(overallTrend * 100),
      bestDay,
      worstDay,
      weekdayPerformance: weekdayPerformance.sort((a, b) => b.avgRevenue - a.avgRevenue),
      totalDataPoints: days.length,
    };
  }

  /**
   * Get AI-powered business insights and recommendations
   */
  async getBusinessInsights() {
    const [stockRecs, performance, trends] = await Promise.all([
      this.getStockRecommendations(),
      this.getProductPerformance(),
      this.analyzeTrends(),
    ]);

    const insights = [];

    // Stock insights
    const urgentRestock = stockRecs.filter((r) => r.urgency === 'critical');
    if (urgentRestock.length > 0) {
      insights.push({
        type: 'critical',
        category: 'stock',
        title: `${urgentRestock.length} Products Need Urgent Restocking`,
        message: `Stock is critically low for: ${urgentRestock
          .map((r) => r.product.name)
          .slice(0, 3)
          .join(', ')}${urgentRestock.length > 3 ? '...' : ''}`,
        action: 'restock',
        icon: 'alert-circle',
        color: '#f44336',
      });
    }

    // Overstock insights
    const overstocked = stockRecs.filter((r) => r.action === 'overstocked');
    if (overstocked.length > 0) {
      insights.push({
        type: 'warning',
        category: 'stock',
        title: `${overstocked.length} Products May Be Overstocked`,
        message: `Consider reducing orders for slow-moving items to free up capital.`,
        action: 'review',
        icon: 'package-down',
        color: '#ff9800',
      });
    }

    // Performance insights
    if (performance.topByProfit.length > 0) {
      const topProduct = performance.topByProfit[0];
      insights.push({
        type: 'success',
        category: 'performance',
        title: `Top Profit Maker: ${topProduct.product_name}`,
        message: `Generated ${Math.round(topProduct.totalProfit).toLocaleString()} RWF profit. Consider increasing stock.`,
        action: 'boost',
        icon: 'trending-up',
        color: '#4caf50',
      });
    }

    // Slow moving items
    if (performance.slowMoving.length > 0 && performance.slowMoving[0].totalQuantity < 5) {
      const slowProduct = performance.slowMoving[0];
      insights.push({
        type: 'info',
        category: 'performance',
        title: `Slow Mover: ${slowProduct.product_name}`,
        message: `Only ${slowProduct.totalQuantity} units sold in 30 days. Consider promotion or removal.`,
        action: 'promote',
        icon: 'trending-down',
        color: '#2196f3',
      });
    }

    // Trend insights
    if (trends.overallTrend === 'growing') {
      insights.push({
        type: 'success',
        category: 'trend',
        title: `Business Is Growing! 📈`,
        message: `Sales trending up by ${Math.abs(trends.trendPercentage)}%. Keep up the momentum!`,
        action: 'celebrate',
        icon: 'chart-line-variant',
        color: '#4caf50',
      });
    } else if (trends.overallTrend === 'declining') {
      insights.push({
        type: 'warning',
        category: 'trend',
        title: `Sales Declining`,
        message: `Revenue down ${Math.abs(trends.trendPercentage)}%. Time to analyze and adjust strategy.`,
        action: 'analyze',
        icon: 'chart-line-variant',
        color: '#f44336',
      });
    }

    // Best day insight
    if (trends.weekdayPerformance.length > 0) {
      const bestDay = trends.weekdayPerformance[0];
      insights.push({
        type: 'info',
        category: 'pattern',
        title: `Best Day: ${bestDay.day}`,
        message: `Average ${bestDay.avgRevenue.toLocaleString()} RWF on ${bestDay.day}s. Ensure optimal staffing.`,
        action: 'optimize',
        icon: 'calendar-star',
        color: '#2196f3',
      });
    }

    return insights;
  }

  /**
   * Get AI recommendation for specific product
   */
  async getProductRecommendation(productId) {
    const prediction = await this.predictDemand(productId, 7);
    const product = await fetchOne('SELECT * FROM products WHERE id = ?', [productId]);

    if (!product) return null;

    const daysUntilStockout =
      prediction.avgDailySales > 0
        ? Math.floor(product.current_stock / prediction.avgDailySales)
        : 999;

    let recommendation = '';
    let suggestedOrder = 0;

    if (product.current_stock <= product.min_stock_level) {
      recommendation = `🚨 URGENT: Order immediately! Stock is below minimum level.`;
      suggestedOrder = Math.ceil(prediction.prediction * 2); // 2 weeks supply
    } else if (daysUntilStockout <= 3) {
      recommendation = `⚠️ Order soon: Will run out in ${daysUntilStockout} days at current sales rate.`;
      suggestedOrder = Math.ceil(prediction.prediction * 1.5);
    } else if (daysUntilStockout <= 7) {
      recommendation = `✅ Stock OK: Should last ${daysUntilStockout} days. Monitor closely.`;
      suggestedOrder = Math.ceil(prediction.prediction);
    } else if (prediction.avgDailySales === 0) {
      recommendation = `⚡ No recent sales: Consider promotion or check if product is active.`;
      suggestedOrder = 0;
    } else {
      recommendation = `✨ Stock levels are optimal for next week.`;
      suggestedOrder = 0;
    }

    return {
      product,
      prediction,
      daysUntilStockout,
      recommendation,
      suggestedOrder,
      estimatedCost: suggestedOrder * product.cost_price,
    };
  }
}

// Export singleton instance
export const aiEngine = new AIEngine();
