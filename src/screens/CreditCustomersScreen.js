import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, FAB, Portal, Modal, TextInput, Chip, IconButton, Snackbar, List, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll, fetchOne, insertRecord, updateRecord, executeQuery } from '../database';
import { format } from 'date-fns';

export default function CreditCustomersScreen() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    id_number: '',
    notes: '',
  });

  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const customersData = await fetchAll(
        `SELECT * FROM credit_customers
         WHERE is_active = 1
         ORDER BY balance DESC, customer_name ASC`,
        []
      );
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadTransactions = async (customerId) => {
    try {
      const transactionsData = await fetchAll(
        `SELECT ct.*, u.full_name as created_by_name, o.order_number
         FROM credit_transactions ct
         JOIN users u ON ct.created_by = u.id
         LEFT JOIN orders o ON ct.order_id = o.id
         WHERE ct.customer_id = ?
         ORDER BY ct.created_at DESC`,
        [customerId]
      );
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setFormData({
      customer_name: '',
      phone: '',
      id_number: '',
      notes: '',
    });
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
  };

  const openPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    setPaymentAmount('');
    setPaymentModalVisible(true);
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setSelectedCustomer(null);
  };

  const openHistoryModal = async (customer) => {
    setSelectedCustomer(customer);
    await loadTransactions(customer.id);
    setHistoryModalVisible(true);
  };

  const closeHistoryModal = () => {
    setHistoryModalVisible(false);
    setSelectedCustomer(null);
  };

  const handleAddCustomer = async () => {
    if (!formData.customer_name || !formData.phone) {
      showSnackbar('Please fill in customer name and phone number');
      return;
    }

    try {
      await insertRecord('credit_customers', {
        customer_name: formData.customer_name,
        phone: formData.phone,
        id_number: formData.id_number || null,
        notes: formData.notes || null,
        total_credit: 0,
        total_paid: 0,
        balance: 0,
      });

      showSnackbar('Customer added successfully');
      closeAddModal();
      await loadCustomers();
    } catch (error) {
      console.error('Error adding customer:', error);
      showSnackbar('Failed to add customer');
    }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);

    if (!amount || amount <= 0) {
      showSnackbar('Please enter a valid payment amount');
      return;
    }

    if (amount > selectedCustomer.balance) {
      showSnackbar('Payment amount exceeds customer balance');
      return;
    }

    try {
      const newBalance = selectedCustomer.balance - amount;
      const newTotalPaid = selectedCustomer.total_paid + amount;

      // Update customer balance
      await updateRecord(
        'credit_customers',
        {
          total_paid: newTotalPaid,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        },
        'id = ?',
        [selectedCustomer.id]
      );

      // Record transaction
      await insertRecord('credit_transactions', {
        customer_id: selectedCustomer.id,
        transaction_type: 'payment',
        amount: amount,
        balance_after: newBalance,
        created_by: user.id,
      });

      showSnackbar(`Payment of ${formatCurrency(amount)} recorded successfully`);
      closePaymentModal();
      await loadCustomers();
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

  const getBalanceColor = (balance) => {
    if (balance === 0) return '#4caf50';
    if (balance < 10000) return '#ff9800';
    return '#f44336';
  };

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Credit Customers
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {customers.length} customers • Total debt: {formatCurrency(customers.reduce((sum, c) => sum + c.balance, 0))}
          </Text>
        </View>

        {customers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="account-cash" size={64} color="#ccc" />
              <Text variant="titleLarge" style={styles.emptyTitle}>
                No Credit Customers
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Add customers who order on credit
              </Text>
            </Card.Content>
          </Card>
        ) : (
          customers.map((customer) => (
            <Card key={customer.id} style={styles.customerCard}>
              <Card.Content>
                <View style={styles.customerHeader}>
                  <View style={styles.customerInfo}>
                    <Text variant="titleLarge">{customer.customer_name}</Text>
                    <View style={styles.contactRow}>
                      <MaterialCommunityIcons name="phone" size={16} color="#666" />
                      <Text variant="bodyMedium" style={styles.phone}>
                        {customer.phone}
                      </Text>
                    </View>
                    {customer.id_number && (
                      <View style={styles.contactRow}>
                        <MaterialCommunityIcons name="card-account-details" size={16} color="#666" />
                        <Text variant="bodyMedium" style={styles.idNumber}>
                          {customer.id_number}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text variant="bodySmall" style={styles.statLabel}>
                      Total Credit
                    </Text>
                    <Text variant="titleMedium" style={styles.statValue}>
                      {formatCurrency(customer.total_credit)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="bodySmall" style={styles.statLabel}>
                      Paid
                    </Text>
                    <Text variant="titleMedium" style={[styles.statValue, { color: '#4caf50' }]}>
                      {formatCurrency(customer.total_paid)}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="bodySmall" style={styles.statLabel}>
                      Balance
                    </Text>
                    <Text variant="titleMedium" style={[styles.statValue, { color: getBalanceColor(customer.balance) }]}>
                      {formatCurrency(customer.balance)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Button
                    mode="contained"
                    icon="cash"
                    onPress={() => openPaymentModal(customer)}
                    style={styles.actionButton}
                    disabled={customer.balance === 0}
                  >
                    Record Payment
                  </Button>
                  <Button mode="outlined" icon="history" onPress={() => openHistoryModal(customer)} style={styles.actionButton}>
                    History
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB style={styles.fab} icon="account-plus" label="Add Customer" onPress={openAddModal} />

      {/* Add Customer Modal */}
      <Portal>
        <Modal visible={addModalVisible} onDismiss={closeAddModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Add Credit Customer
          </Text>

          <ScrollView>
            <TextInput
              label="Customer Name *"
              value={formData.customer_name}
              onChangeText={(text) => setFormData({ ...formData, customer_name: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Phone Number *"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
            />

            <TextInput
              label="ID Number (Optional)"
              value={formData.id_number}
              onChangeText={(text) => setFormData({ ...formData, id_number: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Notes (Optional)"
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={closeAddModal} style={styles.modalButton}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleAddCustomer} style={styles.modalButton} icon="check">
                Add Customer
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Payment Modal */}
      <Portal>
        <Modal visible={paymentModalVisible} onDismiss={closePaymentModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Record Payment
          </Text>

          {selectedCustomer && (
            <>
              <Card style={styles.customerSummary}>
                <Card.Content>
                  <Text variant="titleMedium">{selectedCustomer.customer_name}</Text>
                  <Text variant="bodyLarge" style={styles.balanceText}>
                    Current Balance: {formatCurrency(selectedCustomer.balance)}
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

      {/* History Modal */}
      <Portal>
        <Modal visible={historyModalVisible} onDismiss={closeHistoryModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Transaction History
          </Text>

          {selectedCustomer && (
            <>
              <Card style={styles.customerSummary}>
                <Card.Content>
                  <Text variant="titleMedium">{selectedCustomer.customer_name}</Text>
                </Card.Content>
              </Card>

              <ScrollView style={styles.transactionsList}>
                {transactions.length === 0 ? (
                  <Text style={styles.emptyText}>No transactions yet</Text>
                ) : (
                  transactions.map((transaction) => (
                    <List.Item
                      key={transaction.id}
                      title={
                        transaction.transaction_type === 'payment'
                          ? `Payment: ${formatCurrency(transaction.amount)}`
                          : `Credit: ${formatCurrency(transaction.amount)}`
                      }
                      description={`${format(new Date(transaction.created_at), 'PPpp')} • By ${transaction.created_by_name}${
                        transaction.order_number ? ` • Order #${transaction.order_number}` : ''
                      }`}
                      left={(props) => (
                        <MaterialCommunityIcons
                          name={transaction.transaction_type === 'payment' ? 'cash-plus' : 'cart'}
                          size={24}
                          color={transaction.transaction_type === 'payment' ? '#4caf50' : '#f44336'}
                          style={{ marginTop: 12, marginLeft: 12 }}
                        />
                      )}
                      right={() => (
                        <Text style={styles.balanceAfter}>Balance: {formatCurrency(transaction.balance_after)}</Text>
                      )}
                    />
                  ))
                )}
              </ScrollView>

              <Button mode="contained" onPress={closeHistoryModal} style={styles.closeButton}>
                Close
              </Button>
            </>
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
  customerCard: {
    margin: 12,
    marginBottom: 8,
  },
  customerHeader: {
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  phone: {
    color: '#666',
  },
  idNumber: {
    color: '#666',
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
    maxHeight: '90%',
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
  customerSummary: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  balanceText: {
    marginTop: 8,
    fontWeight: 'bold',
    color: '#f44336',
  },
  transactionsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  balanceAfter: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    marginRight: 12,
  },
  closeButton: {
    marginTop: 8,
  },
});
