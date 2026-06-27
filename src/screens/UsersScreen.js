import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Button, FAB, Portal, Modal, TextInput, SegmentedButtons, Chip, IconButton, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll, insertRecord, updateRecord } from '../database';

export default function UsersScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const [formData, setFormData] = useState({
    id: null,
    username: '',
    password: '',
    full_name: '',
    role: 'waiter',
    is_active: 1,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await fetchAll('SELECT * FROM users ORDER BY created_at DESC', []);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditMode(false);
    setFormData({
      id: null,
      username: '',
      password: '',
      full_name: '',
      role: 'waiter',
      is_active: 1,
    });
    setModalVisible(true);
  };

  const openEditModal = (userItem) => {
    setEditMode(true);
    setFormData({
      id: userItem.id,
      username: userItem.username,
      password: '', // Don't show existing password
      full_name: userItem.full_name,
      role: userItem.role,
      is_active: userItem.is_active,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.full_name || !formData.username) {
      showSnackbar('Please fill in all required fields');
      return;
    }

    if (!editMode && !formData.password) {
      showSnackbar('Password is required for new users');
      return;
    }

    try {
      if (editMode) {
        // Update existing user
        const updateData = {
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        };

        // Only update password if provided
        if (formData.password) {
          updateData.password = formData.password;
        }

        await updateRecord('users', updateData, 'id = ?', [formData.id]);
        showSnackbar('User updated successfully');
      } else {
        // Create new user
        await insertRecord('users', {
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
        });
        showSnackbar('User created successfully');
      }

      closeModal();
      await loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      showSnackbar('Failed to save user. Username might already exist.');
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await updateRecord(
        'users',
        { is_active: currentStatus ? 0 : 1, updated_at: new Date().toISOString() },
        'id = ?',
        [userId]
      );
      await loadUsers();
      showSnackbar(currentStatus ? 'User deactivated' : 'User activated');
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return '#9c27b0';
      case 'manager':
        return '#2196f3';
      case 'waiter':
        return '#4caf50';
      case 'bartender':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return 'crown';
      case 'manager':
        return 'briefcase';
      case 'waiter':
        return 'room-service';
      case 'bartender':
        return 'glass-cocktail';
      default:
        return 'account';
    }
  };

  // Only owners can manage users
  if (user?.role !== 'owner') {
    return (
      <View style={styles.unauthorizedContainer}>
        <MaterialCommunityIcons name="lock" size={64} color="#ccc" />
        <Text variant="titleLarge" style={styles.unauthorizedText}>
          Access Denied
        </Text>
        <Text variant="bodyMedium" style={styles.unauthorizedSubtext}>
          Only owners can manage users
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            User Management
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {users.length} total users
          </Text>
        </View>

        {users.map((userItem) => (
          <Card key={userItem.id} style={styles.userCard}>
            <Card.Content>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text variant="titleLarge">{userItem.full_name}</Text>
                    {!userItem.is_active && (
                      <Chip icon="close-circle" textStyle={{ fontSize: 10 }} style={styles.inactiveChip}>
                        Inactive
                      </Chip>
                    )}
                  </View>
                  <Text variant="bodyMedium" style={styles.username}>
                    @{userItem.username}
                  </Text>
                  <View style={styles.roleContainer}>
                    <MaterialCommunityIcons
                      name={getRoleIcon(userItem.role)}
                      size={20}
                      color={getRoleColor(userItem.role)}
                    />
                    <Text variant="bodyMedium" style={[styles.roleText, { color: getRoleColor(userItem.role) }]}>
                      {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.userActions}>
                  <IconButton
                    icon="pencil"
                    size={24}
                    onPress={() => openEditModal(userItem)}
                    iconColor="#2196f3"
                  />
                  <IconButton
                    icon={userItem.is_active ? 'account-off' : 'account-check'}
                    size={24}
                    onPress={() => toggleUserStatus(userItem.id, userItem.is_active)}
                    iconColor={userItem.is_active ? '#f44336' : '#4caf50'}
                    disabled={userItem.id === user.id}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {/* Add User FAB */}
      <FAB style={styles.fab} icon="account-plus" label="Add User" onPress={openAddModal} />

      {/* Add/Edit User Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={closeModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {editMode ? 'Edit User' : 'Add New User'}
          </Text>

          <ScrollView>
            <TextInput
              label="Full Name *"
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Username *"
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              disabled={editMode}
            />

            <TextInput
              label={editMode ? 'New Password (leave empty to keep current)' : 'Password *'}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              mode="outlined"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text variant="titleSmall" style={styles.fieldLabel}>
              Role *
            </Text>
            <SegmentedButtons
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              buttons={[
                { value: 'waiter', label: 'Waiter', icon: 'room-service' },
                { value: 'bartender', label: 'Bartender', icon: 'glass-cocktail' },
                { value: 'manager', label: 'Manager', icon: 'briefcase' },
                { value: 'owner', label: 'Owner', icon: 'crown' },
              ]}
              style={styles.segmentedButtons}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={closeModal} style={styles.modalButton}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSave} style={styles.modalButton} icon="check">
                {editMode ? 'Update' : 'Create'}
              </Button>
            </View>
          </ScrollView>
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
  userCard: {
    margin: 12,
    marginBottom: 8,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    color: '#666',
    marginTop: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  roleText: {
    fontWeight: 'bold',
  },
  inactiveChip: {
    height: 24,
    backgroundColor: '#ffebee',
  },
  userActions: {
    flexDirection: 'row',
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
  fieldLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  segmentedButtons: {
    marginBottom: 24,
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
