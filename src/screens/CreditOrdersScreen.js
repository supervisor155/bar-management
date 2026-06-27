import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import {
  Card,
  Text,
  Button,
  FAB,
  Portal,
  Modal,
  TextInput,
  Chip,
  IconButton,
  Snackbar,
  List,
  Divider,
  Searchbar,
  RadioButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll, fetchOne, insertRecord, updateRecord, executeQuery } from '../database';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

export default function CreditOrdersScreen() {
  const { user } = useAuth();
  const [creditOrders, setCreditOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Create order state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [tableNumber, setTableNumber] = useState('');

  // Add product state
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadCreditOrders();
    }, [])
  );

  useEffect(() => {
    loadCustomers();
    loadProducts();
    loadCategories();
  }, []);

  const loadCreditOrders = async () => {
    try {
      const orders = await fetchAll(
        `SELECT o.*, cc.customer_name, cc.phone,
         (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
         FROM orders o
         JOIN credit_customers cc ON o.customer_id = cc.id
         WHERE o.payment_method = 'credit'
         ORDER BY o.created_at DESC`,
        []
      );
      setCreditOrders(orders);
    } catch (error) {
      console.error('Error loading credit orders:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const customersData = await fetchAll(
        `SELECT * FROM credit_customers WHERE is_active = 1 ORDER BY customer_name ASC`,
        []
      );
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const productsData = await fetchAll(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1
         ORDER BY c.name, p.name`,
        []
      );
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await fetchAll(`SELECT * FROM categories ORDER BY name`, []);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadOrderItems = async (orderId) => {
    try {
      const items = await fetchAll(
        `SELECT oi.*, p.name as product_name, p.unit
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );
      setOrderItems(items);
    } catch (error) {
      console.error('Error loading order items:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCreditOrders();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setSelectedCustomer(null);
    setTableNumber('');
    setCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setCreateModalVisible(false);
  };

  const openDetailsModal = async (order) => {
    setSelectedOrder(order);
    await loadOrderItems(order.id);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedOrder(null);
    setOrderItems([]);
  };

  const openPaymentModal = (order) => {
    setSelectedOrder(order);
    setPaymentAmount('');
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setSelectedOrder(null);
  };

  const openAddProductModal = (order) => {
    setSelectedOrder(order);
    setSearchQuery('');
    setSelectedCategory('all');
    setAddProductModalVisible(true);
  };

  const closeAddProductModal = () => {
    setAddProductModalVisible(false);
    setSelectedOrder(null);
  };

  const handleCreateCreditOrder = async () => {
    if (!selectedCustomer) {
      showSnackbar('Please select a customer');
      return;
    }

    try {
      // Generate order number
      const orderNumber = `ORD${Date.now().toString().slice(-8)}`;

      // Create order
      const orderId = await insertRecord('orders', {
        order_number: orderNumber,
        customer_id: selectedCustomer.id,
        table_number: tableNumber || null,
        total_amount: 0,
        status: 'preparing',
        payment_status: 'pending',
        payment_method: 'credit',
        created_by: user.id,
      });

      showSnackbar('Credit order created successfully');
      closeCreateModal();
      await loadCreditOrders();

      // Open add product modal
      const newOrder = await fetchOne(`SELECT * FROM orders WHERE id = ?`, [orderId]);
      openAddProductModal({ ...newOrder, customer_name: selectedCustomer.customer_name });
    } catch (error) {
      console.error('Error creating credit order:', error);
      showSnackbar('Failed to create credit order');
    }
  };

  const handleAddProduct = async (product) => {
    try {
      // Check if product already in order
      const existingItem = await fetchOne(
        `SELECT * FROM order_items WHERE order_id = ? AND product_id = ?`,
        [selectedOrder.id, product.id]
      );

      if (existingItem) {
        // Update quantity
        await updateRecord(
          'order_items',
          {
            quantity: existingItem.quantity + 1,
            subtotal: (existingItem.quantity + 1) * product.selling_price,
          },
          'id = ?',
          [existingItem.id]
        );
      } else {
        // Add new item
        await insertRecord('order_items', {
          order_id: selectedOrder.id,
          product_id: product.id,
          quantity: 1,
          unit_price: product.selling_price,
          subtotal: product.selling_price,
        });
      }

      // Update order total
      const items = await fetchAll(
        `SELECT SUM(subtotal) as total FROM order_items WHERE order_id = ?`,
        [selectedOrder.id]
      );
      const newTotal = items[0]?.total || 0;

      await updateRecord('orders', { total_amount: newTotal }, 'id = ?', [selectedOrder.id]);

      // Deduct stock
      await executeQuery(`UPDATE products SET current_stock = current_stock - 1 WHERE id = ?`, [product.id]);

      // Record stock movement
      await insertRecord('stock_movements', {
        product_id: product.id,
        movement_type: 'out',
        quantity: 1,
        reference_type: 'order',
        reference_id: selectedOrder.id,
        performed_by: user.id,
      });

      showSnackbar(`${product.name} added to order`);
      await loadOrderItems(selectedOrder.id);

      // Update selected order total
      setSelectedOrder({ ...selectedOrder, total_amount: newTotal });
    } catch (error) {
      console.error('Error adding product:', error);
      showSnackbar('Failed to add product');
    }
  };

  const handleRemoveProduct = async (item) => {
    try {
      if (item.quantity > 1) {
        // Decrease quantity
        const newQuantity = item.quantity - 1;
        const newSubtotal = newQuantity * item.unit_price;

        await updateRecord(
          'order_items',
          { quantity: newQuantity, subtotal: newSubtotal },
          'id = ?',
          [item.id]
        );
      } else {
        // Remove item completely
        await executeQuery(`DELETE FROM order_items WHERE id = ?`, [item.id]);
      }

      // Update order total
      const items = await fetchAll(
        `SELECT SUM(subtotal) as total FROM order_items WHERE order_id = ?`,
        [selectedOrder.id]
      );
      const newTotal = items[0]?.total || 0;

      await updateRecord('orders', { total_amount: newTotal }, 'id = ?', [selectedOrder.id]);

      // Add back to stock
      await executeQuery(`UPDATE products SET current_stock = current_stock + 1 WHERE id = ?`, [item.product_id]);

      // Record stock movement
      await insertRecord('stock_movements', {
        product_id: item.product_id,
        movement_type: 'in',
        quantity: 1,
        reference_type: 'order_adjustment',
        reference_id: selectedOrder.id,
        performed_by: user.id,
      });

      showSnackbar('Item removed from order');
      await loadOrderItems(selectedOrder.id);

      // Update selected order total
      setSelectedOrder({ ...selectedOrder, total_amount: newTotal });
    } catch (error) {
      console.error('Error removing product:', error);
      showSnackbar('Failed to remove product');
    }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);

    if (!amount || amount <= 0) {
      showSnackbar('Please enter a valid payment amount');
      return;
    }

    const remainingBalance = selectedOrder.total_amount - (selectedOrder.amount_paid || 0);

    if (amount > remainingBalance) {
      showSnackbar('Payment amount exceeds remaining balance');
      return;
    }

    try {
      const newAmountPaid = (selectedOrder.amount_paid || 0) + amount;
      const isFullyPaid = newAmountPaid >= selectedOrder.total_amount;

      // Update order
      await updateRecord(
        'orders',
        {
          amount_paid: newAmountPaid,
          payment_status: isFullyPaid ? 'paid' : 'partial',
          status: isFullyPaid ? 'served' : selectedOrder.status,
          completed_at: isFullyPaid ? new Date().toISOString() : null,
        },
        'id = ?',
        [selectedOrder.id]
      );

      // Update customer balance
      const customer = await fetchOne(`SELECT * FROM credit_customers WHERE id = ?`, [selectedOrder.customer_id]);
      const currentBalance = customer.balance || 0;
      const orderBalance = selectedOrder.total_amount - (selectedOrder.amount_paid || 0);

      // If this is first payment, add to customer's total credit
      if (!selectedOrder.amount_paid || selectedOrder.amount_paid === 0) {
        await updateRecord(
          'credit_customers',
          {
            total_credit: customer.total_credit + selectedOrder.total_amount,
            balance: customer.balance + orderBalance,
          },
          'id = ?',
          [selectedOrder.customer_id]
        );
      }

      // Record payment transaction
      const newBalance = currentBalance + orderBalance - amount;
      await updateRecord(
        'credit_customers',
        {
          total_paid: customer.total_paid + amount,
          balance: newBalance,
        },
        'id = ?',
        [selectedOrder.customer_id]
      );

      await insertRecord('credit_transactions', {
        customer_id: selectedOrder.customer_id,
        transaction_type: 'payment',
        amount: amount,
        balance_after: newBalance,
        order_id: selectedOrder.id,
        created_by: user.id,
      });

      showSnackbar(`Payment of ${formatCurrency(amount)} recorded successfully`);
      closePaymentModal();
      await loadCreditOrders();

      if (detailsModalVisible) {
        const updatedOrder = await fetchOne(
          `SELECT o.*, cc.customer_name, cc.phone FROM orders o
           JOIN credit_customers cc ON o.customer_id = cc.id WHERE o.id = ?`,
          [selectedOrder.id]
        );
        setSelectedOrder(updatedOrder);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      showSnackbar('Failed to record payment');
    }
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
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
      default:
        return '#757575';
    }
  };

  const getPaymentStatusColor = (paymentStatus) => {
    switch (paymentStatus) {
      case 'pending':
        return '#f44336';
      case 'partial':
        return '#ff9800';
      case 'paid':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Credit Orders
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {creditOrders.length} orders • Total pending: {formatCurrency(creditOrders.reduce((sum, o) => sum + (o.total_amount - (o.amount_paid || 0)), 0))}
          </Text>
        </View>

        {creditOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="cart-off" size={64} color="#ccc" />
              <Text variant="titleLarge" style={styles.emptyTitle}>
                No Credit Orders
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Create orders for customers who will pay on credit
              </Text>
            </Card.Content>
          </Card>
        ) : (
          creditOrders.map((order) => (
            <Card key={order.id} style={styles.orderCard}>
              <Card.Content>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text variant="titleLarge">Order #{order.order_number}</Text>
                    <View style={styles.customerRow}>
                      <MaterialCommunityIcons name="account" size={16} color="#666" />
                      <Text variant="bodyMedium" style={styles.customerName}>
                        {order.customer_name}
                      </Text>
                    </View>
                    {order.table_number && (
                      <View style={styles.customerRow}>
                        <MaterialCommunityIcons name="table-furniture" size={16} color="#666" />
                        <Text variant="bodyMedium" style={styles.tableNumber}>
                          Table {order.table_number}
                        </Text>
                      </View>
                    )}
                    <Text variant="bodySmall" style={styles.date}>
                      {format(new Date(order.created_at), 'PPp')}
                    </Text>
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text variant="bodySmall" style={styles.statLabel}>
                      Total Amount
                    </Text>
                    <Text variant="titleMedium" style={styles.statValue}>
                      {formatCurrency(order.total_amount)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="bodySmall" style={styles.statLabel}>
                      Paid
                    </Text>
                    <Text variant="titleMedium" style={[styles.statValue, { color: '#4caf50' }]}>
                      {formatCurrency(order.amount_paid || 0)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="bodySmall" style={styles.statLabel}>
                      Balance
                    </Text>
                    <Text variant="titleMedium" style={[styles.statValue, { color: '#f44336' }]}>
                      {formatCurrency(order.total_amount - (order.amount_paid || 0))}
                    </Text>
                  </View>
                </View>

                <View style={styles.chipRow}>
                  <Chip icon="circle" style={{ backgroundColor: getStatusColor(order.status) }} textStyle={{ color: '#fff' }}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Chip>
                  <Chip
                    icon="cash"
                    style={{ backgroundColor: getPaymentStatusColor(order.payment_status) }}
                    textStyle={{ color: '#fff' }}
                  >
                    {order.payment_status === 'partial' ? 'Partial Payment' : order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </Chip>
                </View>

                <View style={styles.actions}>
                  <Button mode="outlined" icon="eye" onPress={() => openDetailsModal(order)} style={styles.actionButton}>
                    View Details
                  </Button>
                  {order.payment_status !== 'paid' && (
                    <Button mode="contained" icon="cash-plus" onPress={() => openPaymentModal(order)} style={styles.actionButton}>
                      Add Payment
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB style={styles.fab} icon="cart-plus" label="New Credit Order" onPress={openCreateModal} />

      {/* Create Order Modal */}
      <Portal>
        <Modal visible={createModalVisible} onDismiss={closeCreateModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Create Credit Order
          </Text>

          <ScrollView>
            <Text variant="bodyMedium" style={styles.sectionLabel}>
              Select Customer *
            </Text>
            <RadioButton.Group onValueChange={(value) => setSelectedCustomer(customers.find((c) => c.id === parseInt(value)))} value={selectedCustomer?.id?.toString()}>
              {customers.map((customer) => (
                <RadioButton.Item
                  key={customer.id}
                  label={`${customer.customer_name} - ${customer.phone}`}
                  value={customer.id.toString()}
                  status={selectedCustomer?.id === customer.id ? 'checked' : 'unchecked'}
                />
              ))}
            </RadioButton.Group>

            <TextInput
              label="Table Number (Optional)"
              value={tableNumber}
              onChangeText={setTableNumber}
              mode="outlined"
              style={styles.input}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={closeCreateModal} style={styles.modalButton}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleCreateCreditOrder} style={styles.modalButton} icon="check">
                Create Order
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Order Details Modal */}
      <Portal>
        <Modal visible={detailsModalVisible} onDismiss={closeDetailsModal} contentContainerStyle={styles.largeModal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Order Details
          </Text>

          {selectedOrder && (
            <>
              <Card style={styles.orderSummary}>
                <Card.Content>
                  <Text variant="titleLarge">Order #{selectedOrder.order_number}</Text>
                  <Text variant="bodyLarge" style={{ marginTop: 4 }}>
                    Customer: {selectedOrder.customer_name}
                  </Text>
                  <Text variant="bodyMedium" style={{ marginTop: 4, color: '#666' }}>
                    {format(new Date(selectedOrder.created_at), 'PPp')}
                  </Text>
                </Card.Content>
              </Card>

              <View style={styles.itemsHeader}>
                <Text variant="titleMedium">Order Items ({orderItems.length})</Text>
                <IconButton icon="plus-circle" size={24} onPress={() => openAddProductModal(selectedOrder)} />
              </View>

              <ScrollView style={styles.itemsList}>
                {orderItems.length === 0 ? (
                  <Text style={styles.emptyText}>No items in order</Text>
                ) : (
                  orderItems.map((item) => (
                    <List.Item
                      key={item.id}
                      title={item.product_name}
                      description={`${formatCurrency(item.unit_price)} × ${item.quantity} = ${formatCurrency(item.subtotal)}`}
                      left={(props) => <MaterialCommunityIcons name="package-variant" size={24} color="#1976d2" style={{ marginTop: 8, marginLeft: 12 }} />}
                      right={() => (
                        <View style={styles.itemActions}>
                          <IconButton icon="minus-circle" size={20} onPress={() => handleRemoveProduct(item)} />
                          <Text style={styles.quantityText}>{item.quantity}</Text>
                          <IconButton icon="plus-circle" size={20} onPress={() => handleAddProduct({ id: item.product_id, selling_price: item.unit_price })} />
                        </View>
                      )}
                    />
                  ))
                )}
              </ScrollView>

              <Divider style={styles.divider} />

              <View style={styles.totalsSection}>
                <View style={styles.totalRow}>
                  <Text variant="titleMedium">Total Amount:</Text>
                  <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                    {formatCurrency(selectedOrder.total_amount)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text variant="bodyLarge">Amount Paid:</Text>
                  <Text variant="titleMedium" style={{ color: '#4caf50' }}>
                    {formatCurrency(selectedOrder.amount_paid || 0)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text variant="bodyLarge">Balance:</Text>
                  <Text variant="titleMedium" style={{ color: '#f44336' }}>
                    {formatCurrency(selectedOrder.total_amount - (selectedOrder.amount_paid || 0))}
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={closeDetailsModal} style={styles.modalButton}>
                  Close
                </Button>
                {selectedOrder.payment_status !== 'paid' && (
                  <Button
                    mode="contained"
                    icon="cash-plus"
                    onPress={() => {
                      closeDetailsModal();
                      openPaymentModal(selectedOrder);
                    }}
                    style={styles.modalButton}
                  >
                    Add Payment
                  </Button>
                )}
              </View>
            </>
          )}
        </Modal>
      </Portal>

      {/* Payment Modal */}
      <Portal>
        <Modal visible={paymentModalVisible} onDismiss={closePaymentModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Record Payment
          </Text>

          {selectedOrder && (
            <>
              <Card style={styles.orderSummary}>
                <Card.Content>
                  <Text variant="titleMedium">Order #{selectedOrder.order_number}</Text>
                  <Text variant="bodyLarge" style={styles.balanceText}>
                    Remaining Balance: {formatCurrency(selectedOrder.total_amount - (selectedOrder.amount_paid || 0))}
                  </Text>
                </Card.Content>
              </Card>

              <TextInput
                label="Payment Amount *"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                left={<TextInput.Affix text="RWF" />}
              />

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={closePaymentModal} style={styles.modalButton}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleRecordPayment} style={styles.modalButton} icon="check">
                  Record Payment
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>

      {/* Add Product Modal */}
      <Portal>
        <Modal visible={addProductModalVisible} onDismiss={closeAddProductModal} contentContainerStyle={styles.largeModal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Add Products
          </Text>

          <Searchbar
            placeholder="Search products..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <Chip
              selected={selectedCategory === 'all'}
              onPress={() => setSelectedCategory('all')}
              style={styles.categoryChip}
            >
              All
            </Chip>
            {categories.map((category) => (
              <Chip
                key={category.id}
                selected={selectedCategory === category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={styles.categoryChip}
              >
                {category.name}
              </Chip>
            ))}
          </ScrollView>

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id.toString()}
            style={styles.productList}
            renderItem={({ item }) => (
              <List.Item
                title={item.name}
                description={`${formatCurrency(item.selling_price)} • Stock: ${item.current_stock} ${item.unit}`}
                left={(props) => <MaterialCommunityIcons name="package-variant" size={24} color="#1976d2" style={{ marginTop: 8, marginLeft: 12 }} />}
                right={() => (
                  <IconButton
                    icon="plus-circle"
                    size={24}
                    iconColor="#4caf50"
                    onPress={() => handleAddProduct(item)}
                    disabled={item.current_stock === 0}
                  />
                )}
                disabled={item.current_stock === 0}
              />
            )}
          />

          <Button mode="contained" onPress={closeAddProductModal} style={styles.closeButton}>
            Done
          </Button>
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
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontWeight: 'bold',
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
    color: '#666',
  },
  emptyText: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
  orderCard: {
    margin: 12,
    marginBottom: 8,
  },
  orderHeader: {
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  customerName: {
    color: '#666',
    fontWeight: 'bold',
  },
  tableNumber: {
    color: '#666',
  },
  date: {
    color: '#999',
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: 'bold',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1976d2',
  },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 8,
    maxHeight: '80%',
  },
  largeModal: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  sectionLabel: {
    marginBottom: 8,
    color: '#666',
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
  orderSummary: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  balanceText: {
    marginTop: 8,
    fontWeight: 'bold',
    color: '#f44336',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemsList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  totalsSection: {
    paddingVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  searchbar: {
    marginBottom: 12,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryChip: {
    marginRight: 8,
  },
  productList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  closeButton: {
    marginTop: 8,
  },
});
