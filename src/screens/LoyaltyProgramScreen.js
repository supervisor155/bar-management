import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, FAB, Portal, Modal, TextInput, Button, Chip, Snackbar, List, Divider, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll, fetchOne, insertRecord, updateRecord } from '../database';
import { formatCurrency, ensureNumber } from '../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';

export default function LoyaltyProgramScreen() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

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
      const customersData = await fetchAll(
        `SELECT * FROM credit_customers WHERE is_active = 1 ORDER BY loyalty_points DESC, customer_name ASC`,
        []
      );
      setCustomers(customersData);

      const tiersData = await fetchAll(`SELECT * FROM loyalty_tiers ORDER BY min_points ASC`, []);
      setTiers(tiersData);

      const rewardsData = await fetchAll(`SELECT * FROM loyalty_rewards WHERE is_active = 1 ORDER BY points_required ASC`, []);
      setRewards(rewardsData);
    } catch (error) {
      console.error('Error loading loyalty data:', error);
    }
  };

  const loadTransactions = async (customerId) => {
    try {
      const transactionsData = await fetchAll(
        `SELECT * FROM loyalty_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20`,
        [customerId]
      );
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openDetailsModal = async (customer) => {
    setSelectedCustomer(customer);
    await loadTransactions(customer.id);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedCustomer(null);
    setTransactions([]);
  };

  const openRedeemModal = (customer, reward) => {
    setSelectedCustomer(customer);
    setSelectedReward(reward);
    setRedeemModalVisible(true);
  };

  const closeRedeemModal = () => {
    setRedeemModalVisible(false);
    setSelectedCustomer(null);
    setSelectedReward(null);
  };

  const handleRedeemReward = async () => {
    if (!selectedCustomer || !selectedReward) return;

    if (selectedCustomer.loyalty_points < selectedReward.points_required) {
      showSnackbar('Insufficient points');
      return;
    }

    try {
      const newPoints = selectedCustomer.loyalty_points - selectedReward.points_required;

      // Update customer points
      await updateRecord(
        'credit_customers',
        { loyalty_points: newPoints, updated_at: new Date().toISOString() },
        'id = ?',
        [selectedCustomer.id]
      );

      // Record transaction
      await insertRecord('loyalty_transactions', {
        customer_id: selectedCustomer.id,
        transaction_type: 'redeemed',
        points: -selectedReward.points_required,
        balance_after: newPoints,
        reward_id: selectedReward.id,
      });

      showSnackbar(`Redeemed: ${selectedReward.reward_name}!`);
      closeRedeemModal();
      closeDetailsModal();
      await loadData();
    } catch (error) {
      console.error('Error redeeming reward:', error);
      showSnackbar('Failed to redeem reward');
    }
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const getCustomerTier = (points) => {
    let currentTier = tiers[0];
    for (const tier of tiers) {
      if (points >= tier.min_points) {
        currentTier = tier;
      }
    }
    return currentTier;
  };

  const getNextTier = (points) => {
    for (const tier of tiers) {
      if (points < tier.min_points) {
        return tier;
      }
    }
    return null;
  };

  const calculateProgress = (points) => {
    const currentTier = getCustomerTier(points);
    const nextTier = getNextTier(points);

    if (!nextTier) return 1; // Max tier reached

    const tierRange = nextTier.min_points - currentTier.min_points;
    const customerProgress = points - currentTier.min_points;
    return customerProgress / tierRange;
  };

  const stats = {
    totalCustomers: customers.length,
    activeMembers: customers.filter(c => c.loyalty_points > 0).length,
    totalPoints: customers.reduce((sum, c) => sum + ensureNumber(c.loyalty_points, 0), 0),
  };

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.totalCustomers}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Total Members</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.activeMembers}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Active</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.totalPoints.toLocaleString()}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Total Points</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Tiers Info */}
      <Card style={styles.tiersCard}>
        <Card.Title
          title="Loyalty Tiers"
          left={(props) => <MaterialCommunityIcons name="medal" size={24} color="#ffd700" />}
        />
        <Card.Content>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tiers.map((tier) => (
              <Card key={tier.id} style={[styles.tierCard, { borderColor: tier.color }]}>
                <Card.Content>
                  <MaterialCommunityIcons name="medal" size={32} color={tier.color} />
                  <Text variant="titleMedium" style={[styles.tierName, { color: tier.color }]}>
                    {tier.tier_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.tierPoints}>{tier.min_points}+ points</Text>
                  {tier.discount_percentage > 0 && (
                    <Chip style={styles.discountChip} textStyle={{ fontSize: 10 }}>
                      {tier.discount_percentage}% OFF
                    </Chip>
                  )}
                  <Text variant="bodySmall" style={styles.tierBenefits}>{tier.benefits}</Text>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>

      {/* Customers List */}
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {customers.map((customer) => {
          const tier = getCustomerTier(customer.loyalty_points);
          const nextTier = getNextTier(customer.loyalty_points);
          const progress = calculateProgress(customer.loyalty_points);

          return (
            <Card key={customer.id} style={styles.customerCard} onPress={() => openDetailsModal(customer)}>
              <Card.Content>
                <View style={styles.customerHeader}>
                  <View style={styles.customerInfo}>
                    <Text variant="titleLarge">{customer.customer_name}</Text>
                    <Text variant="bodyMedium" style={styles.phone}>{customer.phone}</Text>
                  </View>
                  <View style={styles.tierBadge}>
                    <MaterialCommunityIcons name="medal" size={24} color={tier.color} />
                    <Text variant="bodySmall" style={[styles.tierLabel, { color: tier.color }]}>
                      {tier.tier_name}
                    </Text>
                  </View>
                </View>

                <View style={styles.pointsRow}>
                  <View style={styles.pointsInfo}>
                    <MaterialCommunityIcons name="star" size={20} color="#ffd700" />
                    <Text variant="headlineSmall" style={styles.points}>
                      {customer.loyalty_points || 0} points
                    </Text>
                  </View>
                  {tier.discount_percentage > 0 && (
                    <Chip style={styles.discountBadge} textStyle={{ color: '#4caf50' }}>
                      {tier.discount_percentage}% Discount
                    </Chip>
                  )}
                </View>

                {nextTier && (
                  <View style={styles.progressContainer}>
                    <Text variant="bodySmall" style={styles.progressText}>
                      {nextTier.min_points - customer.loyalty_points} points to {nextTier.tier_name}
                    </Text>
                    <ProgressBar progress={progress} color={nextTier.color} style={styles.progressBar} />
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      {/* Customer Details Modal */}
      <Portal>
        <Modal visible={detailsModalVisible} onDismiss={closeDetailsModal} contentContainerStyle={styles.modal}>
          {selectedCustomer && (
            <>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="account-star" size={48} color="#ffd700" />
                <Text variant="headlineMedium" style={styles.modalTitle}>{selectedCustomer.customer_name}</Text>
                {(() => {
                  const tier = getCustomerTier(selectedCustomer.loyalty_points);
                  return (
                    <Chip icon="medal" style={[styles.modalTierChip, { backgroundColor: tier.color + '20' }]}>
                      {tier.tier_name}
                    </Chip>
                  );
                })()}
              </View>

              <View style={styles.pointsDisplay}>
                <MaterialCommunityIcons name="star" size={32} color="#ffd700" />
                <Text variant="headlineLarge" style={styles.pointsLarge}>
                  {selectedCustomer.loyalty_points || 0}
                </Text>
                <Text variant="bodyMedium" style={styles.pointsLabel}>LOYALTY POINTS</Text>
              </View>

              <Divider style={styles.divider} />

              <Text variant="titleMedium" style={styles.sectionTitle}>Available Rewards:</Text>
              <ScrollView style={styles.rewardsList}>
                {rewards.map((reward) => {
                  const canRedeem = selectedCustomer.loyalty_points >= reward.points_required;
                  return (
                    <List.Item
                      key={reward.id}
                      title={reward.reward_name}
                      description={`${reward.points_required} points`}
                      left={(props) => (
                        <MaterialCommunityIcons
                          name={reward.reward_type === 'discount' ? 'tag' : 'gift'}
                          size={24}
                          color={canRedeem ? '#4caf50' : '#ccc'}
                          style={{ marginTop: 8, marginLeft: 12 }}
                        />
                      )}
                      right={() =>
                        canRedeem ? (
                          <Button
                            mode="contained"
                            onPress={() => {
                              closeDetailsModal();
                              openRedeemModal(selectedCustomer, reward);
                            }}
                            compact
                          >
                            Redeem
                          </Button>
                        ) : (
                          <Chip disabled style={styles.lockedChip}>
                            Locked
                          </Chip>
                        )
                      }
                      style={[styles.rewardItem, !canRedeem && styles.lockedReward]}
                    />
                  );
                })}
              </ScrollView>

              <Divider style={styles.divider} />

              <Text variant="titleMedium" style={styles.sectionTitle}>Recent Activity:</Text>
              <ScrollView style={styles.transactionsList}>
                {transactions.length === 0 ? (
                  <Text style={styles.emptyText}>No transactions yet</Text>
                ) : (
                  transactions.map((transaction) => (
                    <List.Item
                      key={transaction.id}
                      title={
                        transaction.transaction_type === 'earned'
                          ? `Earned ${transaction.points} points`
                          : `Redeemed ${Math.abs(transaction.points)} points`
                      }
                      description={new Date(transaction.created_at).toLocaleString()}
                      left={(props) => (
                        <MaterialCommunityIcons
                          name={transaction.transaction_type === 'earned' ? 'plus-circle' : 'gift'}
                          size={24}
                          color={transaction.transaction_type === 'earned' ? '#4caf50' : '#ff9800'}
                          style={{ marginTop: 12, marginLeft: 12 }}
                        />
                      )}
                      right={() => (
                        <Text style={styles.transactionBalance}>
                          Balance: {transaction.balance_after}
                        </Text>
                      )}
                    />
                  ))
                )}
              </ScrollView>

              <Button mode="contained" onPress={closeDetailsModal} style={styles.closeButton}>
                Close
              </Button>
            </>
          )}
        </Modal>
      </Portal>

      {/* Redeem Reward Modal */}
      <Portal>
        <Modal visible={redeemModalVisible} onDismiss={closeRedeemModal} contentContainerStyle={styles.modal}>
          {selectedCustomer && selectedReward && (
            <>
              <Text variant="headlineSmall" style={styles.modalTitle}>Redeem Reward</Text>

              <Card style={styles.rewardSummary}>
                <Card.Content>
                  <MaterialCommunityIcons
                    name={selectedReward.reward_type === 'discount' ? 'tag' : 'gift'}
                    size={48}
                    color="#4caf50"
                    style={styles.rewardIcon}
                  />
                  <Text variant="headlineMedium" style={styles.rewardTitle}>
                    {selectedReward.reward_name}
                  </Text>
                  <Text variant="bodyMedium" style={styles.rewardPoints}>
                    {selectedReward.points_required} points
                  </Text>
                </Card.Content>
              </Card>

              <Card style={styles.customerSummary}>
                <Card.Content>
                  <Text variant="titleMedium">{selectedCustomer.customer_name}</Text>
                  <Text variant="bodyLarge" style={styles.currentPoints}>
                    Current Points: {selectedCustomer.loyalty_points}
                  </Text>
                  <Text variant="bodyLarge" style={styles.afterPoints}>
                    After Redemption: {selectedCustomer.loyalty_points - selectedReward.points_required}
                  </Text>
                </Card.Content>
              </Card>

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={closeRedeemModal} style={styles.modalButton}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleRedeemReward} style={styles.modalButton} icon="check">
                  Confirm Redeem
                </Button>
              </View>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    marginTop: 4,
    color: '#666',
  },
  tiersCard: {
    margin: 12,
    marginBottom: 8,
  },
  tierCard: {
    width: 150,
    marginRight: 12,
    borderWidth: 2,
  },
  tierName: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  tierPoints: {
    color: '#666',
    marginTop: 4,
  },
  discountChip: {
    marginTop: 8,
    backgroundColor: '#4caf5020',
    alignSelf: 'flex-start',
  },
  tierBenefits: {
    marginTop: 8,
    color: '#999',
    fontSize: 10,
  },
  customerCard: {
    margin: 12,
    marginBottom: 8,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  phone: {
    color: '#666',
    marginTop: 2,
  },
  tierBadge: {
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: 'bold',
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  points: {
    fontWeight: 'bold',
    color: '#ffd700',
  },
  discountBadge: {
    backgroundColor: '#4caf5020',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  modalTierChip: {
    marginTop: 8,
  },
  pointsDisplay: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff8dc',
    borderRadius: 12,
    marginBottom: 16,
  },
  pointsLarge: {
    fontWeight: 'bold',
    color: '#ffd700',
    marginTop: 8,
  },
  pointsLabel: {
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  rewardsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  rewardItem: {
    paddingVertical: 4,
  },
  lockedReward: {
    opacity: 0.5,
  },
  lockedChip: {
    marginTop: 8,
  },
  transactionsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  transactionBalance: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    marginRight: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  closeButton: {
    marginTop: 8,
  },
  rewardSummary: {
    marginBottom: 16,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
  },
  rewardIcon: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  rewardTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  rewardPoints: {
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
  },
  customerSummary: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  currentPoints: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  afterPoints: {
    marginTop: 4,
    color: '#666',
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
