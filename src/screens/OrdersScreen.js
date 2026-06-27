import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, Chip, List, Searchbar, Portal, Modal, RadioButton, Divider, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAll, updateRecord } from '../database';
import { format } from 'date-fns';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { generateReceiptHTML, printReceipt, getBusinessInfo } from '../utils/receiptGenerator';

export default function OrdersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentModal, setPaymentModal] = useState({ visible: false, order: null });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    loadOrders();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [])
  );

  // Handle filter from route params
  useEffect(() => {
    if (route.params?.filter) {
      if (route.params.filter === 'paid') {
        setFilterPayment('paid');
      } else if (route.params.filter === 'unpaid') {
        setFilterPayment('unpaid');
      }
    }
  }, [route.params]);

  useEffect(() => {
    filterOrders();
  }, [filterStatus, filterPayment, searchQuery, orders]);

  const loadOrders = async () => {
    try {
      const ordersData = await fetchAll(
        `SELECT o.*, u.full_name as waiter_name,
         (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
         FROM orders o
         JOIN users u ON o.created_by = u.id
         ORDER BY o.created_at DESC`,
        []
      );
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((o) => o.status === filterStatus);
    }

    // Payment filter
    if (filterPayment === 'paid') {
      filtered = filtered.filter((o) => o.payment_status === 'paid');
    } else if (filterPayment === 'unpaid') {
      filtered = filtered.filter((o) => o.payment_status === 'pending' || o.payment_status === 'partial');
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.table_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateRecord('orders', { status: newStatus, updated_at: new Date().toISOString() }, 'id = ?', [orderId]);
      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const openPaymentModal = (order) => {
    setPaymentModal({ visible: true, order });
    setPaymentMethod('cash');
  };

  const closePaymentModal = () => {
    setPaymentModal({ visible: false, order: null });
  };

  const processPayment = async () => {
    try {
      await updateRecord(
        'orders',
        {
          payment_status: 'paid',
          payment_method: paymentMethod,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        'id = ?',
        [paymentModal.order.id]
      );

      closePaymentModal();
      await loadOrders();

      // Print receipt automatically
      await handlePrintReceipt(paymentModal.order.id);
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  const handlePrintReceipt = async (orderId) => {
    try {
      // Load order details
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Load order items
      const orderItems = await fetchAll(
        `SELECT oi.*, p.name as product_name, p.unit
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );

      // Get business info
      const businessInfo = getBusinessInfo();

      // Generate and print receipt
      const receiptHTML = generateReceiptHTML(order, orderItems, businessInfo);
      printReceipt(receiptHTML);

      setSnackbar({ visible: true, message: 'Receipt sent to printer' });
    } catch (error) {
      console.error('Error printing receipt:', error);
      setSnackbar({ visible: true, message: 'Failed to print receipt' });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return `${amount.toLocaleString()} RWF`;
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

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'served',
    };
    return statusFlow[currentStatus];
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <Searchbar
          placeholder="Search orders..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
          <Text variant="bodySmall" style={styles.filterLabel}>Status:</Text>
          <Chip selected={filterStatus === 'all'} onPress={() => setFilterStatus('all')} style={styles.statusChip}>
            All
          </Chip>
          <Chip
            selected={filterStatus === 'pending'}
            onPress={() => setFilterStatus('pending')}
            style={styles.statusChip}
            textStyle={{ color: getStatusColor('pending') }}
          >
            Pending
          </Chip>
          <Chip
            selected={filterStatus === 'preparing'}
            onPress={() => setFilterStatus('preparing')}
            style={styles.statusChip}
            textStyle={{ color: getStatusColor('preparing') }}
          >
            Preparing
          </Chip>
          <Chip
            selected={filterStatus === 'ready'}
            onPress={() => setFilterStatus('ready')}
            style={styles.statusChip}
            textStyle={{ color: getStatusColor('ready') }}
          >
            Ready
          </Chip>
          <Chip
            selected={filterStatus === 'served'}
            onPress={() => setFilterStatus('served')}
            style={styles.statusChip}
            textStyle={{ color: getStatusColor('served') }}
          >
            Served
          </Chip>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
          <Text variant="bodySmall" style={styles.filterLabel}>Payment:</Text>
          <Chip selected={filterPayment === 'all'} onPress={() => setFilterPayment('all')} style={styles.statusChip}>
            All
          </Chip>
          <Chip
            selected={filterPayment === 'paid'}
            onPress={() => setFilterPayment('paid')}
            style={styles.statusChip}
            textStyle={{ color: '#4caf50' }}
          >
            Paid
          </Chip>
          <Chip
            selected={filterPayment === 'unpaid'}
            onPress={() => setFilterPayment('unpaid')}
            style={styles.statusChip}
            textStyle={{ color: '#ff9800' }}
          >
            Unpaid
          </Chip>
        </ScrollView>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-off" size={64} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>
              No orders found
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} style={styles.orderCard}>
              <Card.Title
                title={`Order #${order.order_number}`}
                subtitle={`Table: ${order.table_number || 'N/A'} • ${order.item_count} items`}
                left={(props) => (
                  <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(order.status) }]}>
                    <MaterialCommunityIcons name="receipt" size={24} color="#fff" />
                  </View>
                )}
              />
              <Card.Content>
                <View style={styles.orderInfo}>
                  <Text variant="bodyMedium">
                    Amount: <Text style={styles.amount}>{formatCurrency(order.total_amount)}</Text>
                  </Text>
                  <Text variant="bodySmall" style={styles.metadata}>
                    Waiter: {order.waiter_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.metadata}>
                    Time: {format(new Date(order.created_at), 'HH:mm')}
                  </Text>
                </View>

                <View style={styles.statusChipContainer}>
                  <Chip
                    icon="circle"
                    textStyle={{ color: getStatusColor(order.status) }}
                    style={[styles.currentStatusChip, { borderColor: getStatusColor(order.status) }]}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Chip>
                </View>
              </Card.Content>

              {order.status !== 'served' && order.status !== 'cancelled' && (
                <Card.Actions>
                  {order.status !== 'cancelled' && (
                    <Button
                      mode="outlined"
                      onPress={() => updateOrderStatus(order.id, 'cancelled')}
                      textColor="#f44336"
                    >
                      Cancel
                    </Button>
                  )}
                  {order.payment_status === 'unpaid' && order.status === 'served' && (
                    <Button
                      mode="contained"
                      onPress={() => openPaymentModal(order)}
                      icon="cash-register"
                      buttonColor="#4caf50"
                    >
                      Process Payment
                    </Button>
                  )}
                  {getNextStatus(order.status) && (
                    <Button mode="contained" onPress={() => updateOrderStatus(order.id, getNextStatus(order.status))}>
                      Mark as {getNextStatus(order.status)}
                    </Button>
                  )}
                </Card.Actions>
              )}
              {order.payment_status === 'paid' && (
                <>
                  <Card.Content>
                    <Chip
                      icon="check-circle"
                      textStyle={{ color: '#4caf50' }}
                      style={styles.paidChip}
                    >
                      Paid via {order.payment_method || 'Cash'}
                    </Chip>
                  </Card.Content>
                  <Card.Actions>
                    <Button
                      mode="outlined"
                      icon="printer"
                      onPress={() => handlePrintReceipt(order.id)}
                    >
                      Print Receipt
                    </Button>
                  </Card.Content>
                  <Card.Actions>
                    <Button
                      mode="outlined"
                      onPress={() => navigation.navigate('Receipt', { orderId: order.id })}
                      icon="receipt"
                    >
                      View Receipt
                    </Button>
                  </Card.Actions>
                </>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Portal>
        <Modal
          visible={paymentModal.visible}
          onDismiss={closePaymentModal}
          contentContainerStyle={styles.paymentModal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Process Payment
          </Text>

          {paymentModal.order && (
            <View>
              <Text variant="titleMedium" style={styles.orderDetails}>
                Order: {paymentModal.order.order_number}
              </Text>
              <Text variant="headlineMedium" style={styles.totalAmount}>
                {formatCurrency(paymentModal.order.total_amount)}
              </Text>

              <Divider style={styles.divider} />

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Select Payment Method:
              </Text>

              <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
                <View style={styles.radioOption}>
                  <RadioButton value="cash" />
                  <MaterialCommunityIcons name="cash" size={24} color="#4caf50" style={styles.radioIcon} />
                  <Text variant="bodyLarge">Cash</Text>
                </View>

                <View style={styles.radioOption}>
                  <RadioButton value="card" />
                  <MaterialCommunityIcons name="credit-card" size={24} color="#2196f3" style={styles.radioIcon} />
                  <Text variant="bodyLarge">Card (Visa/Mastercard)</Text>
                </View>

                <View style={styles.radioOption}>
                  <RadioButton value="mobile_money" />
                  <MaterialCommunityIcons name="cellphone" size={24} color="#ff9800" style={styles.radioIcon} />
                  <Text variant="bodyLarge">Mobile Money (MTN/Airtel)</Text>
                </View>

                <View style={styles.radioOption}>
                  <RadioButton value="credit" />
                  <MaterialCommunityIcons name="account-clock" size={24} color="#f44336" style={styles.radioIcon} />
                  <Text variant="bodyLarge">Credit (Pay Later)</Text>
                </View>
              </RadioButton.Group>

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={closePaymentModal} style={styles.modalButton}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={processPayment} style={styles.modalButton} icon="check">
                  Confirm Payment
                </Button>
              </View>
            </View>
          )}
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
  filterContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    marginBottom: 12,
  },
  statusScroll: {
    flexDirection: 'row',
    marginTop: 8,
  },
  filterLabel: {
    alignSelf: 'center',
    marginRight: 8,
    fontWeight: 'bold',
    color: '#666',
  },
  statusChip: {
    marginRight: 8,
  },
  orderCard: {
    margin: 12,
    marginBottom: 8,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  orderInfo: {
    marginVertical: 8,
  },
  amount: {
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 16,
  },
  metadata: {
    color: '#666',
    marginTop: 4,
  },
  statusChipContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  currentStatusChip: {
    borderWidth: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
  },
  paidChip: {
    marginTop: 8,
    borderColor: '#4caf50',
    borderWidth: 1,
  },
  paymentModal: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  orderDetails: {
    marginBottom: 8,
    color: '#666',
  },
  totalAmount: {
    color: '#1976d2',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioIcon: {
    marginLeft: 8,
    marginRight: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
