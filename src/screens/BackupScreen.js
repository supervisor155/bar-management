import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, Button, List, Divider, Portal, Modal, TextInput, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll } from '../database';
import {
  exportCompleteBackup,
  exportSalesReport,
  exportInventoryReport,
  exportProductSalesReport,
} from '../utils/exportData';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

export default function BackupScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [dateRangeModal, setDateRangeModal] = useState({ visible: false, type: null });
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const handleCompleteBackup = async () => {
    setLoading(true);
    try {
      await exportCompleteBackup(fetchAll);
      showSnackbar('Complete backup exported successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      showSnackbar('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleInventoryExport = async () => {
    setLoading(true);
    try {
      await exportInventoryReport(fetchAll);
      showSnackbar('Inventory report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showSnackbar('Failed to export inventory');
    } finally {
      setLoading(false);
    }
  };

  const openDateRangeModal = (type) => {
    // Set default date ranges based on type
    const today = new Date();
    if (type === 'week') {
      setStartDate(format(startOfWeek(today), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else if (type === 'month') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    } else {
      setStartDate(format(today, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }

    setDateRangeModal({ visible: true, type });
  };

  const closeDateRangeModal = () => {
    setDateRangeModal({ visible: false, type: null });
  };

  const handleDateRangeExport = async () => {
    if (!startDate || !endDate) {
      showSnackbar('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showSnackbar('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      if (dateRangeModal.type === 'sales') {
        await exportSalesReport(fetchAll, startDate, endDate);
        showSnackbar('Sales report exported successfully!');
      } else if (dateRangeModal.type === 'product_sales') {
        await exportProductSalesReport(fetchAll, startDate, endDate);
        showSnackbar('Product sales report exported successfully!');
      }
      closeDateRangeModal();
    } catch (error) {
      console.error('Export error:', error);
      showSnackbar('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const quickExportSales = async (days) => {
    setLoading(true);
    try {
      const end = format(new Date(), 'yyyy-MM-dd');
      const start = format(subDays(new Date(), days), 'yyyy-MM-dd');
      await exportSalesReport(fetchAll, start, end);
      showSnackbar(`Last ${days} days sales exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      showSnackbar('Failed to export sales');
    } finally {
      setLoading(false);
    }
  };

  // Only owners and managers can access backup
  if (user?.role !== 'owner' && user?.role !== 'manager') {
    return (
      <View style={styles.unauthorizedContainer}>
        <MaterialCommunityIcons name="lock" size={64} color="#ccc" />
        <Text variant="titleLarge" style={styles.unauthorizedText}>
          Access Denied
        </Text>
        <Text variant="bodyMedium" style={styles.unauthorizedSubtext}>
          Only owners and managers can export data
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Complete Backup */}
        <Card style={styles.card}>
          <Card.Title
            title="Complete Backup"
            subtitle="Export all database tables"
            left={(props) => <MaterialCommunityIcons name="database-export" size={32} color="#1976d2" />}
          />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.description}>
              Creates a complete backup of all data including users, products, orders, and inventory. This backup can be
              used to restore data if needed.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={handleCompleteBackup} loading={loading} icon="database-export">
              Export Complete Backup
            </Button>
          </Card.Actions>
        </Card>

        <Divider style={styles.divider} />

        {/* Sales Reports */}
        <Card style={styles.card}>
          <Card.Title
            title="Sales Reports"
            subtitle="Export sales data by date range"
            left={(props) => <MaterialCommunityIcons name="chart-line" size={32} color="#4caf50" />}
          />
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Quick Exports
            </Text>
            <View style={styles.quickButtons}>
              <Button mode="outlined" onPress={() => quickExportSales(7)} loading={loading} style={styles.quickButton}>
                Last 7 Days
              </Button>
              <Button mode="outlined" onPress={() => quickExportSales(30)} loading={loading} style={styles.quickButton}>
                Last 30 Days
              </Button>
            </View>

            <Text variant="titleSmall" style={styles.sectionTitle}>
              Custom Date Range
            </Text>
            <Button
              mode="contained"
              onPress={() => openDateRangeModal('sales')}
              loading={loading}
              icon="calendar-range"
              style={styles.customButton}
            >
              Export Sales by Date Range
            </Button>
          </Card.Content>
        </Card>

        {/* Inventory Report */}
        <Card style={styles.card}>
          <Card.Title
            title="Inventory Report"
            subtitle="Export current stock levels"
            left={(props) => <MaterialCommunityIcons name="package-variant" size={32} color="#ff9800" />}
          />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.description}>
              Exports current inventory with stock levels, prices, and categories. Useful for stock-taking and inventory
              audits.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={handleInventoryExport} loading={loading} icon="file-table">
              Export Inventory
            </Button>
          </Card.Actions>
        </Card>

        {/* Product Sales Analysis */}
        <Card style={styles.card}>
          <Card.Title
            title="Product Sales Analysis"
            subtitle="Export product performance data"
            left={(props) => <MaterialCommunityIcons name="chart-box" size={32} color="#9c27b0" />}
          />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.description}>
              Detailed analysis of product sales including quantities sold, revenue, and order frequency. Perfect for
              identifying best sellers.
            </Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => openDateRangeModal('product_sales')}
              loading={loading}
              icon="chart-bar"
            >
              Export Product Sales
            </Button>
          </Card.Actions>
        </Card>

        {/* Export Format Info */}
        <Card style={styles.card}>
          <Card.Content>
            <List.Subheader>Export Information</List.Subheader>
            <List.Item
              title="CSV Format"
              description="Sales and inventory reports as spreadsheet files"
              left={(props) => <List.Icon {...props} icon="file-delimited" />}
            />
            <List.Item
              title="JSON Format"
              description="Complete backups in JSON for data restoration"
              left={(props) => <List.Icon {...props} icon="code-json" />}
            />
            <List.Item
              title="Share Options"
              description="Save to device or share via email/cloud"
              left={(props) => <List.Icon {...props} icon="share-variant" />}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Date Range Modal */}
      <Portal>
        <Modal visible={dateRangeModal.visible} onDismiss={closeDateRangeModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Select Date Range
          </Text>

          <TextInput
            label="Start Date"
            value={startDate}
            onChangeText={setStartDate}
            mode="outlined"
            style={styles.input}
            placeholder="YYYY-MM-DD"
          />

          <TextInput
            label="End Date"
            value={endDate}
            onChangeText={setEndDate}
            mode="outlined"
            style={styles.input}
            placeholder="YYYY-MM-DD"
          />

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={closeDateRangeModal} style={styles.modalButton}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleDateRangeExport}
              style={styles.modalButton}
              loading={loading}
              icon="check"
            >
              Export
            </Button>
          </View>
        </Modal>
      </Portal>

      <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ ...snackbar, visible: false })} duration={3000}>
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  unauthorizedText: {
    marginTop: 16,
    color: '#666',
  },
  unauthorizedSubtext: {
    marginTop: 8,
    color: '#999',
  },
  card: {
    margin: 12,
  },
  description: {
    marginBottom: 16,
    color: '#666',
  },
  divider: {
    marginVertical: 8,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
  },
  customButton: {
    marginBottom: 8,
  },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
