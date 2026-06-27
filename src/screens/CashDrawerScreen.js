import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, FAB, Portal, Modal, TextInput, Button, Chip, Snackbar, List, Divider, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll, insertRecord, updateRecord, fetchOne } from '../database';
import { formatCurrency, ensureNumber } from '../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';

export default function CashDrawerScreen() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState('cash_in'); // cash_in, cash_out
  const [transactionNotes, setTransactionNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Load current shift
      const activeShift = await fetchOne(
        `SELECT * FROM cash_drawer_shifts WHERE status = 'open' AND opened_by = ? LIMIT 1`,
        [user.id]
      );
      setCurrentShift(activeShift);

      // Load shift history
      const shiftsData = await fetchAll(
        `SELECT cds.*, u.full_name as opened_by_name
         FROM cash_drawer_shifts cds
         JOIN users u ON cds.opened_by = u.id
         WHERE cds.opened_by = ?
         ORDER BY cds.created_at DESC
         LIMIT 20`,
        [user.id]
      );
      setShifts(shiftsData);
    } catch (error) {
      console.error('Error loading cash drawer data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenDrawer = async () => {
    if (!openingBalance || parseFloat(openingBalance) < 0) {
      showSnackbar('Please enter a valid opening balance');
      return;
    }

    try {
      await insertRecord('cash_drawer_shifts', {
        opened_by: user.id,
        opening_balance: parseFloat(openingBalance),
        cash_in: 0,
        cash_out: 0,
        expected_balance: parseFloat(openingBalance),
        actual_balance: 0,
        variance: 0,
        status: 'open',
      });

      showSnackbar('Cash drawer opened successfully');
      setOpenModalVisible(false);
      setOpeningBalance('');
      await loadData();
    } catch (error) {
      console.error('Error opening drawer:', error);
      showSnackbar('Failed to open drawer');
    }
  };

  const handleCloseDrawer = async () => {
    if (!closingBalance || parseFloat(closingBalance) < 0) {
      showSnackbar('Please enter the actual closing balance');
      return;
    }

    try {
      const actualBalance = parseFloat(closingBalance);
      const expectedBalance = currentShift.expected_balance;
      const variance = actualBalance - expectedBalance;

      await updateRecord(
        'cash_drawer_shifts',
        {
          actual_balance: actualBalance,
          variance: variance,
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        'id = ?',
        [currentShift.id]
      );

      showSnackbar(variance === 0 ? 'Drawer balanced perfectly!' : `Drawer closed with ${Math.abs(variance)} RWF ${variance > 0 ? 'over' : 'short'}`);
      setCloseModalVisible(false);
      setClosingBalance('');
      await loadData();
    } catch (error) {
      console.error('Error closing drawer:', error);
      showSnackbar('Failed to close drawer');
    }
  };

  const handleAddTransaction = async () => {
    if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
      showSnackbar('Please enter a valid amount');
      return;
    }

    if (!transactionNotes.trim()) {
      showSnackbar('Please add a note for this transaction');
      return;
    }

    try {
      const amount = parseFloat(transactionAmount);

      // Record transaction
      await insertRecord('cash_drawer_transactions', {
        shift_id: currentShift.id,
        transaction_type: transactionType,
        amount: amount,
        notes: transactionNotes,
        created_by: user.id,
      });

      // Update shift totals
      const cashIn = transactionType === 'cash_in' ? currentShift.cash_in + amount : currentShift.cash_in;
      const cashOut = transactionType === 'cash_out' ? currentShift.cash_out + amount : currentShift.cash_out;
      const expectedBalance = currentShift.opening_balance + cashIn - cashOut;

      await updateRecord(
        'cash_drawer_shifts',
        {
          cash_in: cashIn,
          cash_out: cashOut,
          expected_balance: expectedBalance,
          updated_at: new Date().toISOString(),
        },
        'id = ?',
        [currentShift.id]
      );

      showSnackbar('Transaction recorded successfully');
      setTransactionModalVisible(false);
      setTransactionAmount('');
      setTransactionNotes('');
      await loadData();
    } catch (error) {
      console.error('Error recording transaction:', error);
      showSnackbar('Failed to record transaction');
    }
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const getVarianceColor = (variance) => {
    if (variance === 0) return '#4caf50';
    if (Math.abs(variance) <= 1000) return '#ff9800';
    return '#f44336';
  };

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Current Shift Status */}
        {currentShift ? (
          <Card style={[styles.currentShiftCard, { borderColor: '#4caf50' }]}>
            <Card.Content>
              <View style={styles.currentShiftHeader}>
                <MaterialCommunityIcons name="cash-register" size={48} color="#4caf50" />
                <View style={styles.shiftStatus}>
                  <Text variant="headlineSmall" style={{ color: '#4caf50' }}>DRAWER OPEN</Text>
                  <Text variant="bodySmall" style={styles.shiftTime}>
                    Since {format(new Date(currentShift.created_at), 'HH:mm')}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text variant="bodySmall" style={styles.balanceLabel}>Opening</Text>
                  <Text variant="titleLarge" style={styles.balanceValue}>
                    {formatCurrency(currentShift.opening_balance)}
                  </Text>
                </View>
                <MaterialCommunityIcons name="plus" size={20} color="#4caf50" />
                <View style={styles.balanceItem}>
                  <Text variant="bodySmall" style={styles.balanceLabel}>Cash In</Text>
                  <Text variant="titleLarge" style={[styles.balanceValue, { color: '#4caf50' }]}>
                    {formatCurrency(currentShift.cash_in)}
                  </Text>
                </View>
                <MaterialCommunityIcons name="minus" size={20} color="#f44336" />
                <View style={styles.balanceItem}>
                  <Text variant="bodySmall" style={styles.balanceLabel}>Cash Out</Text>
                  <Text variant="titleLarge" style={[styles.balanceValue, { color: '#f44336' }]}>
                    {formatCurrency(currentShift.cash_out)}
                  </Text>
                </View>
              </View>

              <Card style={styles.expectedCard}>
                <Card.Content>
                  <Text variant="bodyMedium" style={styles.expectedLabel}>Expected Balance:</Text>
                  <Text variant="headlineMedium" style={styles.expectedValue}>
                    {formatCurrency(currentShift.expected_balance)}
                  </Text>
                </Card.Content>
              </Card>

              <View style={styles.shiftActions}>
                <Button
                  mode="contained"
                  icon="cash-plus"
                  onPress={() => {
                    setTransactionType('cash_in');
                    setTransactionModalVisible(true);
                  }}
                  style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
                >
                  Cash In
                </Button>
                <Button
                  mode="contained"
                  icon="cash-minus"
                  onPress={() => {
                    setTransactionType('cash_out');
                    setTransactionModalVisible(true);
                  }}
                  style={[styles.actionButton, { backgroundColor: '#ff9800' }]}
                >
                  Cash Out
                </Button>
                <Button
                  mode="contained"
                  icon="close-circle"
                  onPress={() => setCloseModalVisible(true)}
                  style={[styles.actionButton, { backgroundColor: '#f44336' }]}
                >
                  Close Drawer
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.noShiftCard}>
            <Card.Content style={styles.noShiftContent}>
              <MaterialCommunityIcons name="cash-register" size={64} color="#ccc" />
              <Text variant="titleLarge" style={styles.noShiftTitle}>Cash Drawer Closed</Text>
              <Text variant="bodyMedium" style={styles.noShiftText}>
                Open the cash drawer to start tracking cash transactions
              </Text>
              <Button
                mode="contained"
                icon="cash-register"
                onPress={() => setOpenModalVisible(true)}
                style={styles.openButton}
              >
                Open Cash Drawer
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Shift History */}
        <Text variant="titleMedium" style={styles.historyTitle}>Shift History</Text>
        {shifts.map((shift) => {
          const isOpen = shift.status === 'open';
          const variance = ensureNumber(shift.variance, 0);

          return (
            <Card key={shift.id} style={styles.historyCard}>
              <Card.Content>
                <View style={styles.historyHeader}>
                  <View>
                    <Text variant="titleMedium">
                      {format(new Date(shift.created_at), 'MMM dd, yyyy')}
                    </Text>
                    <Text variant="bodySmall" style={styles.historyTime}>
                      {format(new Date(shift.created_at), 'HH:mm')} - {shift.closed_at ? format(new Date(shift.closed_at), 'HH:mm') : 'Open'}
                    </Text>
                  </View>
                  <Chip
                    mode="flat"
                    style={[styles.statusChip, { backgroundColor: isOpen ? '#4caf5020' : variance === 0 ? '#2196f320' : '#ff980020' }]}
                    textStyle={{ color: isOpen ? '#4caf50' : variance === 0 ? '#2196f3' : '#ff9800' }}
                  >
                    {isOpen ? 'OPEN' : variance === 0 ? 'BALANCED' : 'CLOSED'}
                  </Chip>
                </View>

                <View style={styles.historyStats}>
                  <View style={styles.historyStat}>
                    <Text variant="bodySmall" style={styles.historyStatLabel}>Opening</Text>
                    <Text variant="bodyLarge">{formatCurrency(shift.opening_balance)}</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Text variant="bodySmall" style={styles.historyStatLabel}>Expected</Text>
                    <Text variant="bodyLarge">{formatCurrency(shift.expected_balance)}</Text>
                  </View>
                  {!isOpen && (
                    <>
                      <View style={styles.historyStat}>
                        <Text variant="bodySmall" style={styles.historyStatLabel}>Actual</Text>
                        <Text variant="bodyLarge">{formatCurrency(shift.actual_balance)}</Text>
                      </View>
                      <View style={styles.historyStat}>
                        <Text variant="bodySmall" style={styles.historyStatLabel}>Variance</Text>
                        <Text variant="bodyLarge" style={{ color: getVarianceColor(variance) }}>
                          {variance >= 0 ? '+' : ''}{formatCurrency(Math.abs(variance))}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      {/* Open Drawer Modal */}
      <Portal>
        <Modal visible={openModalVisible} onDismiss={() => setOpenModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>Open Cash Drawer</Text>

          <TextInput
            label="Opening Balance *"
            value={openingBalance}
            onChangeText={setOpeningBalance}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            left={<TextInput.Affix text="RWF" />}
            placeholder="Enter starting cash amount"
          />

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setOpenModalVisible(false)} style={styles.modalButton}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleOpenDrawer} style={styles.modalButton} icon="check">
              Open Drawer
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Close Drawer Modal */}
      <Portal>
        <Modal visible={closeModalVisible} onDismiss={() => setCloseModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>Close Cash Drawer</Text>

          {currentShift && (
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text variant="titleMedium">Expected Balance:</Text>
                <Text variant="headlineMedium" style={{ color: '#2196f3', fontWeight: 'bold' }}>
                  {formatCurrency(currentShift.expected_balance)}
                </Text>
              </Card.Content>
            </Card>
          )}

          <TextInput
            label="Actual Closing Balance *"
            value={closingBalance}
            onChangeText={setClosingBalance}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            left={<TextInput.Affix text="RWF" />}
            placeholder="Count actual cash and enter amount"
            helperText="Count all cash in drawer and enter the total"
          />

          {closingBalance && currentShift && (
            <Card style={styles.varianceCard}>
              <Card.Content>
                <Text variant="bodyMedium">Variance:</Text>
                <Text variant="headlineSmall" style={{ color: getVarianceColor(parseFloat(closingBalance) - currentShift.expected_balance) }}>
                  {parseFloat(closingBalance) - currentShift.expected_balance >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(parseFloat(closingBalance) - currentShift.expected_balance))}
                </Text>
              </Card.Content>
            </Card>
          )}

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setCloseModalVisible(false)} style={styles.modalButton}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleCloseDrawer} style={styles.modalButton} icon="check">
              Close Drawer
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Add Transaction Modal */}
      <Portal>
        <Modal visible={transactionModalVisible} onDismiss={() => setTransactionModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {transactionType === 'cash_in' ? 'Add Cash In' : 'Record Cash Out'}
          </Text>

          <TextInput
            label="Amount *"
            value={transactionAmount}
            onChangeText={setTransactionAmount}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            left={<TextInput.Affix text="RWF" />}
          />

          <TextInput
            label="Notes *"
            value={transactionNotes}
            onChangeText={setTransactionNotes}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={3}
            placeholder="e.g., Deposit to bank, Supplier payment, etc."
          />

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setTransactionModalVisible(false)} style={styles.modalButton}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleAddTransaction} style={styles.modalButton} icon="check">
              Record
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
  currentShiftCard: {
    margin: 16,
    borderLeftWidth: 6,
  },
  currentShiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  shiftStatus: {
    marginLeft: 16,
  },
  shiftTime: {
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#666',
    marginBottom: 4,
  },
  balanceValue: {
    fontWeight: 'bold',
  },
  expectedCard: {
    backgroundColor: '#e3f2fd',
    marginBottom: 16,
  },
  expectedLabel: {
    color: '#666',
  },
  expectedValue: {
    fontWeight: 'bold',
    color: '#2196f3',
    marginTop: 4,
  },
  shiftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  noShiftCard: {
    margin: 16,
  },
  noShiftContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noShiftTitle: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  noShiftText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  openButton: {
    marginTop: 24,
  },
  historyTitle: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  historyCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyTime: {
    color: '#666',
    marginTop: 4,
  },
  statusChip: {
    height: 28,
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyStat: {
    alignItems: 'center',
  },
  historyStatLabel: {
    color: '#666',
    marginBottom: 4,
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
  summaryCard: {
    backgroundColor: '#e3f2fd',
    marginBottom: 16,
  },
  varianceCard: {
    backgroundColor: '#fff3e0',
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
