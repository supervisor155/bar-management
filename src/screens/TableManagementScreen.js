import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Card, Text, FAB, Portal, Modal, TextInput, Button, Chip, Snackbar, List, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll, fetchOne, insertRecord, updateRecord } from '../database';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function TableManagementScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [tables, setTables] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    table_number: '',
    capacity: '',
    location: 'Main Floor',
  });

  useEffect(() => {
    loadTables();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadTables();
    }, [])
  );

  const loadTables = async () => {
    try {
      const tablesData = await fetchAll(
        `SELECT * FROM tables WHERE is_active = 1 ORDER BY table_number ASC`,
        []
      );
      setTables(tablesData);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTables();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setFormData({
      table_number: '',
      capacity: '',
      location: 'Main Floor',
    });
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
  };

  const openDetailsModal = (table) => {
    setSelectedTable(table);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedTable(null);
  };

  const handleAddTable = async () => {
    if (!formData.table_number || !formData.capacity) {
      showSnackbar('Please fill in table number and capacity');
      return;
    }

    try {
      await insertRecord('tables', {
        table_number: formData.table_number,
        capacity: parseInt(formData.capacity),
        location: formData.location,
        status: 'available',
        current_order_id: null,
        is_active: 1,
      });

      showSnackbar('Table added successfully');
      closeAddModal();
      await loadTables();
    } catch (error) {
      console.error('Error adding table:', error);
      showSnackbar('Failed to add table');
    }
  };

  const handleChangeTableStatus = async (tableId, newStatus) => {
    try {
      await updateRecord(
        'tables',
        { status: newStatus, updated_at: new Date().toISOString() },
        'id = ?',
        [tableId]
      );

      showSnackbar('Table status updated');
      await loadTables();
      closeDetailsModal();
    } catch (error) {
      console.error('Error updating table status:', error);
      showSnackbar('Failed to update table status');
    }
  };

  const handleCreateOrder = (table) => {
    navigation.navigate('CreateOrder', { tableId: table.id, tableNumber: table.table_number });
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return '#4caf50';
      case 'occupied':
        return '#f44336';
      case 'reserved':
        return '#ff9800';
      case 'maintenance':
        return '#9e9e9e';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return 'check-circle';
      case 'occupied':
        return 'account-group';
      case 'reserved':
        return 'clock-alert';
      case 'maintenance':
        return 'tools';
      default:
        return 'help-circle';
    }
  };

  const filteredTables = filterStatus === 'all'
    ? tables
    : tables.filter(t => t.status === filterStatus);

  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
  };

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.available}</Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: '#4caf50' }]}>Available</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.occupied}</Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: '#f44336' }]}>Occupied</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.reserved}</Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: '#ff9800' }]}>Reserved</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <Chip selected={filterStatus === 'all'} onPress={() => setFilterStatus('all')} style={styles.filterChip}>
          All ({stats.total})
        </Chip>
        <Chip selected={filterStatus === 'available'} onPress={() => setFilterStatus('available')} style={styles.filterChip}>
          Available ({stats.available})
        </Chip>
        <Chip selected={filterStatus === 'occupied'} onPress={() => setFilterStatus('occupied')} style={styles.filterChip}>
          Occupied ({stats.occupied})
        </Chip>
        <Chip selected={filterStatus === 'reserved'} onPress={() => setFilterStatus('reserved')} style={styles.filterChip}>
          Reserved ({stats.reserved})
        </Chip>
      </ScrollView>

      {/* Tables Grid */}
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.tablesGrid}>
          {filteredTables.map((table) => (
            <TouchableOpacity key={table.id} onPress={() => openDetailsModal(table)} style={styles.tableCardWrapper}>
              <Card style={[styles.tableCard, { borderColor: getStatusColor(table.status) }]}>
                <Card.Content style={styles.tableContent}>
                  <MaterialCommunityIcons
                    name={getStatusIcon(table.status)}
                    size={32}
                    color={getStatusColor(table.status)}
                  />
                  <Text variant="headlineSmall" style={styles.tableNumber}>{table.table_number}</Text>
                  <View style={styles.capacityRow}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#666" />
                    <Text variant="bodySmall" style={styles.capacity}>{table.capacity} seats</Text>
                  </View>
                  <Chip
                    mode="flat"
                    style={[styles.statusChip, { backgroundColor: getStatusColor(table.status) + '20' }]}
                    textStyle={{ color: getStatusColor(table.status), fontSize: 10 }}
                  >
                    {table.status.toUpperCase()}
                  </Chip>
                  {table.location && (
                    <Text variant="bodySmall" style={styles.location}>{table.location}</Text>
                  )}
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {user?.role !== 'waiter' && (
        <FAB style={styles.fab} icon="table-chair" label="Add Table" onPress={openAddModal} />
      )}

      {/* Add Table Modal */}
      <Portal>
        <Modal visible={addModalVisible} onDismiss={closeAddModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>Add New Table</Text>

          <TextInput
            label="Table Number *"
            value={formData.table_number}
            onChangeText={(text) => setFormData({ ...formData, table_number: text })}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., T1, T2, VIP1"
          />

          <TextInput
            label="Capacity *"
            value={formData.capacity}
            onChangeText={(text) => setFormData({ ...formData, capacity: text })}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            placeholder="Number of seats"
          />

          <TextInput
            label="Location"
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Main Floor, Terrace, VIP"
          />

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={closeAddModal} style={styles.modalButton}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleAddTable} style={styles.modalButton} icon="check">
              Add Table
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Table Details Modal */}
      <Portal>
        <Modal visible={detailsModalVisible} onDismiss={closeDetailsModal} contentContainerStyle={styles.modal}>
          {selectedTable && (
            <>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons
                  name={getStatusIcon(selectedTable.status)}
                  size={48}
                  color={getStatusColor(selectedTable.status)}
                />
                <Text variant="headlineMedium" style={styles.modalTableNumber}>{selectedTable.table_number}</Text>
              </View>

              <List.Item
                title="Capacity"
                description={`${selectedTable.capacity} seats`}
                left={(props) => <List.Icon {...props} icon="account-group" />}
              />
              <List.Item
                title="Location"
                description={selectedTable.location || 'Not specified'}
                left={(props) => <List.Icon {...props} icon="map-marker" />}
              />
              <List.Item
                title="Status"
                description={selectedTable.status.toUpperCase()}
                descriptionStyle={{ color: getStatusColor(selectedTable.status) }}
                left={(props) => <List.Icon {...props} icon={getStatusIcon(selectedTable.status)} />}
              />

              <Text variant="titleMedium" style={styles.actionsTitle}>Actions:</Text>

              {selectedTable.status === 'available' && (
                <>
                  <Button
                    mode="contained"
                    icon="plus"
                    onPress={() => handleCreateOrder(selectedTable)}
                    style={styles.actionButton}
                  >
                    Create Order
                  </Button>
                  <Button
                    mode="outlined"
                    icon="clock-alert"
                    onPress={() => handleChangeTableStatus(selectedTable.id, 'reserved')}
                    style={styles.actionButton}
                  >
                    Mark as Reserved
                  </Button>
                </>
              )}

              {selectedTable.status === 'occupied' && (
                <Button
                  mode="contained"
                  icon="check"
                  onPress={() => handleChangeTableStatus(selectedTable.id, 'available')}
                  style={styles.actionButton}
                  buttonColor="#4caf50"
                >
                  Mark as Available
                </Button>
              )}

              {selectedTable.status === 'reserved' && (
                <>
                  <Button
                    mode="contained"
                    icon="plus"
                    onPress={() => handleCreateOrder(selectedTable)}
                    style={styles.actionButton}
                  >
                    Create Order (Occupy)
                  </Button>
                  <Button
                    mode="outlined"
                    icon="check"
                    onPress={() => handleChangeTableStatus(selectedTable.id, 'available')}
                    style={styles.actionButton}
                  >
                    Cancel Reservation
                  </Button>
                </>
              )}

              <Button
                mode="outlined"
                icon="tools"
                onPress={() => handleChangeTableStatus(selectedTable.id, 'maintenance')}
                style={styles.actionButton}
              >
                Mark for Maintenance
              </Button>

              <Button mode="text" onPress={closeDetailsModal} style={styles.closeButton}>
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
  },
  filterScroll: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  filterChip: {
    marginRight: 8,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
  },
  tableCardWrapper: {
    width: '50%',
    padding: 6,
  },
  tableCard: {
    borderWidth: 3,
    borderRadius: 12,
  },
  tableContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  tableNumber: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  capacity: {
    color: '#666',
  },
  statusChip: {
    marginTop: 8,
  },
  location: {
    color: '#999',
    marginTop: 4,
    fontSize: 11,
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
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTableNumber: {
    fontWeight: 'bold',
    marginTop: 8,
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
  actionsTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  actionButton: {
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 16,
  },
});
