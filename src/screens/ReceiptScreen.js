import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Card, Text, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchOne, fetchAll } from '../database';
import { format } from 'date-fns';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export default function ReceiptScreen({ route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      const orderData = await fetchOne(
        `SELECT o.*, u.full_name as waiter_name
         FROM orders o
         JOIN users u ON o.created_by = u.id
         WHERE o.id = ?`,
        [orderId]
      );

      const itemsData = await fetchAll(
        `SELECT oi.*, p.name as product_name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );

      setOrder(orderData);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `${Math.round(amount).toLocaleString()} RWF`;
  };

  const generateReceiptHTML = () => {
    const itemsHTML = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(
          item.unit_price
        )}</td>
        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(
          item.subtotal
        )}</td>
      </tr>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              color: #1976d2;
            }
            .info-section {
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background-color: #1976d2;
              color: white;
              padding: 12px;
              text-align: left;
            }
            .total-row {
              font-weight: bold;
              font-size: 18px;
              margin-top: 20px;
              text-align: right;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bar Management System</h1>
            <p>Receipt / Invoice</p>
          </div>

          <div class="info-section">
            <div class="info-row">
              <strong>Order Number:</strong>
              <span>${order?.order_number}</span>
            </div>
            <div class="info-row">
              <strong>Date:</strong>
              <span>${format(new Date(order?.created_at), 'PPpp')}</span>
            </div>
            <div class="info-row">
              <strong>Table:</strong>
              <span>${order?.table_number || 'N/A'}</span>
            </div>
            <div class="info-row">
              <strong>Served by:</strong>
              <span>${order?.waiter_name}</span>
            </div>
            <div class="info-row">
              <strong>Payment Method:</strong>
              <span>${order?.payment_method ? order.payment_method.replace('_', ' ').toUpperCase() : 'CASH'}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="total-row">
            <div style="border-top: 2px solid #1976d2; padding-top: 10px;">
              <span>TOTAL: ${formatCurrency(order?.total_amount)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>© 2026 Bar Management System</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      const html = generateReceiptHTML();

      if (Platform.OS === 'web') {
        // For web, open in new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      } else {
        // For mobile, use expo-print
        await Print.printAsync({ html });
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
    }
  };

  const handleShare = async () => {
    try {
      const html = generateReceiptHTML();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text>Order not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Receipt Header */}
        <Card style={styles.card}>
          <Card.Content style={styles.header}>
            <MaterialCommunityIcons name="receipt" size={48} color="#1976d2" />
            <Text variant="headlineMedium" style={styles.title}>
              Receipt
            </Text>
          </Card.Content>
        </Card>

        {/* Order Info */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.label}>
                Order Number:
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {order.order_number}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.label}>
                Date:
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {format(new Date(order.created_at), 'PPpp')}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.label}>
                Table:
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {order.table_number || 'N/A'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.label}>
                Served by:
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {order.waiter_name}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.label}>
                Payment:
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {order.payment_method ? order.payment_method.replace('_', ' ').toUpperCase() : 'CASH'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Order Items */}
        <Card style={styles.card}>
          <Card.Title title="Items" />
          <Card.Content>
            {items.map((item, index) => (
              <View key={index}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text variant="titleMedium">{item.product_name}</Text>
                    <Text variant="bodyMedium" style={styles.itemDetails}>
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={styles.itemTotal}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
                {index < items.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Total */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.totalRow}>
              <Text variant="headlineSmall" style={styles.totalLabel}>
                TOTAL:
              </Text>
              <Text variant="headlineMedium" style={styles.totalValue}>
                {formatCurrency(order.total_amount)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button mode="contained" onPress={handlePrint} icon="printer" style={styles.button}>
            Print Receipt
          </Button>
          {Platform.OS !== 'web' && (
            <Button mode="outlined" onPress={handleShare} icon="share-variant" style={styles.button}>
              Share Receipt
            </Button>
          )}
        </View>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={styles.footerText}>
            Thank you for your business!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 12,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    marginTop: 8,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  label: {
    color: '#666',
  },
  value: {
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemDetails: {
    color: '#666',
    marginTop: 4,
  },
  itemTotal: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  divider: {
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: '#1976d2',
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalValue: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  actions: {
    padding: 12,
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    color: '#666',
  },
});
