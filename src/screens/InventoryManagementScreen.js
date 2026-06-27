import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, FAB, Portal, Modal, TextInput, Button, Chip, Snackbar, List, Searchbar, Divider, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll, insertRecord, updateRecord, executeQuery } from '../database';
import { formatCurrency, ensureNumber } from '../utils/formatters';
import { useFocusEffect } from '@react-navigation/native';

export default function InventoryManagementScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [addStockModalVisible, setAddStockModalVisible] = useState(false);
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [alertSettingsModalVisible, setAlertSettingsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const [stockForm, setStockForm] = useState({
    quantity: '',
    cost_price: '',
    supplier_id: '',
    notes: '',
  });

  const [supplierForm, setSupplierForm] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });

  const [alertForm, setAlertForm] = useState({
    min_stock_level: '',
  });

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
      const productsData = await fetchAll(
        `SELECT p.*, c.name as category_name, c.type as category_type
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1
         ORDER BY p.current_stock ASC, p.name ASC`,
        []
      );
      setProducts(productsData);

      const suppliersData = await fetchAll(
        `SELECT * FROM suppliers WHERE is_active = 1 ORDER BY supplier_name ASC`,
        []
      );
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openAddStockModal = (product) => {
    setSelectedProduct(product);
    setStockForm({
      quantity: '',
      cost_price: product.cost_price.toString(),
      supplier_id: '',
      notes: '',
    });
    setAddStockModalVisible(true);
  };

  const openAlertSettingsModal = (product) => {
    setSelectedProduct(product);
    setAlertForm({
      min_stock_level: product.min_stock_level.toString(),
    });
    setAlertSettingsModalVisible(true);
  };

  const openSupplierModal = () => {
    setSupplierForm({
      supplier_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
    });
    setSupplierModalVisible(true);
  };

  const closeModals = () => {
    setAddStockModalVisible(false);
    setSupplierModalVisible(false);
    setAlertSettingsModalVisible(false);
    setSelectedProduct(null);
  };

  const handleAddStock = async () => {
    if (!stockForm.quantity || parseInt(stockForm.quantity) <= 0) {
      showSnackbar('Please enter a valid quantity');
      return;
    }

    try {
      const quantity = parseInt(stockForm.quantity);
      const costPrice = parseFloat(stockForm.cost_price);

      // Update product stock
      await executeQuery(
        `UPDATE products SET current_stock = current_stock + ? WHERE id = ?`,
        [quantity, selectedProduct.id]
      );

      // Update cost price if changed
      if (costPrice !== selectedProduct.cost_price) {
        await updateRecord(
          'products',
          { cost_price: costPrice, updated_at: new Date().toISOString() },
          'id = ?',
          [selectedProduct.id]
        );
      }

      // Record stock movement
      await insertRecord('stock_movements', {
        product_id: selectedProduct.id,
        quantity: quantity,
        movement_type: 'in',
        reason: `Stock received${stockForm.notes ? ': ' + stockForm.notes : ''}`,
        created_by: user.id,
      });

      showSnackbar(`Added ${quantity} ${selectedProduct.unit} of ${selectedProduct.name}`);
      closeModals();
      await loadData();
    } catch (error) {
      console.error('Error adding stock:', error);
      showSnackbar('Failed to add stock');
    }
  };

  const handleAddSupplier = async () => {
    if (!supplierForm.supplier_name || !supplierForm.phone) {
      showSnackbar('Please fill in supplier name and phone');
      return;
    }

    try {
      await insertRecord('suppliers', {
        supplier_name: supplierForm.supplier_name,
        contact_person: supplierForm.contact_person || null,
        phone: supplierForm.phone,
        email: supplierForm.email || null,
        address: supplierForm.address || null,
        is_active: 1,
      });

      showSnackbar('Supplier added successfully');
      closeModals();
      await loadData();
    } catch (error) {
      console.error('Error adding supplier:', error);
      showSnackbar('Failed to add supplier');
    }
  };

  const handleUpdateAlertLevel = async () => {
    if (!alertForm.min_stock_level || parseInt(alertForm.min_stock_level) < 0) {
      showSnackbar('Please enter a valid minimum stock level');
      return;
    }

    try {
      await updateRecord(
        'products',
        { min_stock_level: parseInt(alertForm.min_stock_level), updated_at: new Date().toISOString() },
        'id = ?',
        [selectedProduct.id]
      );

      showSnackbar('Alert level updated successfully');
      closeModals();
      await loadData();
    } catch (error) {
      console.error('Error updating alert level:', error);
      showSnackbar('Failed to update alert level');
    }
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const getStockStatus = (product) => {
    if (product.current_stock === 0) {
      return { status: 'out', color: '#f44336', icon: 'alert-circle', text: 'OUT OF STOCK' };
    }
    if (product.current_stock <= product.min_stock_level) {
      return { status: 'low', color: '#ff9800', icon: 'alert', text: 'LOW STOCK' };
    }
    if (product.current_stock <= product.min_stock_level * 2) {
      return { status: 'warning', color: '#ffc107', icon: 'alert-outline', text: 'WARNING' };
    }
    return { status: 'good', color: '#4caf50', icon: 'check-circle', text: 'GOOD STOCK' };
  };

  const calculateStockValue = (product) => {
    return product.current_stock * product.cost_price;
  };

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || p.category_type === filterCategory;
      return matchesSearch && matchesCategory;
    });

  const totalInventoryValue = products.reduce((sum, p) => sum + calculateStockValue(p), 0);
  const lowStockCount = products.filter(p => p.current_stock <= p.min_stock_level).length;
  const outOfStockCount = products.filter(p => p.current_stock === 0).length;

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <Text variant="titleMedium" style={styles.statValue}>{formatCurrency(totalInventoryValue)}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Total Value</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: '#ff980020' }]}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineSmall" style={[styles.statValue, { color: '#ff9800' }]}>{lowStockCount}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Low Stock</Text>
          </Card.Content>
        </Card>
        <Card style={[styles.statCard, { backgroundColor: '#f4433620' }]}>
          <Card.Content style={styles.statContent}>
            <Text variant="headlineSmall" style={[styles.statValue, { color: '#f44336' }]}>{outOfStockCount}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>Out of Stock</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Search and Filters */}
      <View style={styles.filterContainer}>
        <Searchbar
          placeholder="Search products..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Chip selected={filterCategory === 'all'} onPress={() => setFilterCategory('all')} style={styles.filterChip}>
            All
          </Chip>
          <Chip selected={filterCategory === 'food'} onPress={() => setFilterCategory('food')} style={styles.filterChip}>
            Food
          </Chip>
          <Chip selected={filterCategory === 'beverage'} onPress={() => setFilterCategory('beverage')} style={styles.filterChip}>
            Drinks
          </Chip>
        </ScrollView>
      </View>

      {/* Products List */}
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product);
          const stockValue = calculateStockValue(product);

          return (
            <Card key={product.id} style={styles.productCard}>
              <Card.Content>
                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <Text variant="titleMedium" style={styles.productName}>{product.name}</Text>
                    <Text variant="bodySmall" style={styles.category}>{product.category_name}</Text>
                  </View>
                  <Chip
                    mode="flat"
                    icon={stockStatus.icon}
                    style={[styles.statusChip, { backgroundColor: stockStatus.color + '20' }]}
                    textStyle={{ color: stockStatus.color, fontSize: 10 }}
                  >
                    {stockStatus.text}
                  </Chip>
                </View>

                <View style={styles.stockRow}>
                  <View style={styles.stockInfo}>
                    <MaterialCommunityIcons name="package-variant" size={20} color="#666" />
                    <Text variant="bodyLarge" style={styles.stockValue}>
                      {product.current_stock} {product.unit}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.minStock}>
                    Min: {product.min_stock_level} {product.unit}
                  </Text>
                </View>

                <Divider style={styles.divider} />

                <View style={styles.priceRow}>
                  <View>
                    <Text variant="bodySmall" style={styles.priceLabel}>Cost Price</Text>
                    <Text variant="bodyLarge" style={styles.priceValue}>{formatCurrency(product.cost_price)}</Text>
                  </View>
                  <View>
                    <Text variant="bodySmall" style={styles.priceLabel}>Selling Price</Text>
                    <Text variant="bodyLarge" style={[styles.priceValue, { color: '#4caf50' }]}>
                      {formatCurrency(product.selling_price)}
                    </Text>
                  </View>
                  <View>
                    <Text variant="bodySmall" style={styles.priceLabel}>Stock Value</Text>
                    <Text variant="bodyLarge" style={[styles.priceValue, { color: '#1976d2' }]}>
                      {formatCurrency(stockValue)}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Button
                    mode="contained"
                    icon="plus"
                    onPress={() => openAddStockModal(product)}
                    style={styles.actionButton}
                    compact
                  >
                    Add Stock
                  </Button>
                  <IconButton
                    icon="bell-cog"
                    size={20}
                    onPress={() => openAlertSettingsModal(product)}
                    style={styles.iconButton}
                  />
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      {user?.role !== 'waiter' && (
        <FAB style={styles.fab} icon="account-plus" label="Add Supplier" onPress={openSupplierModal} />
      )}

      {/* Add Stock Modal */}
      <Portal>
        <Modal visible={addStockModalVisible} onDismiss={closeModals} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>Add Stock</Text>

          {selectedProduct && (
            <>
              <Card style={styles.productSummary}>
                <Card.Content>
                  <Text variant="titleMedium">{selectedProduct.name}</Text>
                  <Text variant="bodyMedium" style={styles.currentStock}>
                    Current: {selectedProduct.current_stock} {selectedProduct.unit}
                  </Text>
                </Card.Content>
              </Card>

              <TextInput
                label="Quantity to Add *"
                value={stockForm.quantity}
                onChangeText={(text) => setStockForm({ ...stockForm, quantity: text })}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                right={<TextInput.Affix text={selectedProduct.unit} />}
              />

              <TextInput
                label="Cost Price *"
                value={stockForm.cost_price}
                onChangeText={(text) => setStockForm({ ...stockForm, cost_price: text })}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                left={<TextInput.Affix text="RWF" />}
              />

              <TextInput
                label="Notes (Optional)"
                value={stockForm.notes}
                onChangeText={(text) => setStockForm({ ...stockForm, notes: text })}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={2}
              />

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={closeModals} style={styles.modalButton}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleAddStock} style={styles.modalButton} icon="check">
                  Add Stock
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>

      {/* Add Supplier Modal */}
      <Portal>
        <Modal visible={supplierModalVisible} onDismiss={closeModals} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>Add Supplier</Text>

          <ScrollView>
            <TextInput
              label="Supplier Name *"
              value={supplierForm.supplier_name}
              onChangeText={(text) => setSupplierForm({ ...supplierForm, supplier_name: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Contact Person"
              value={supplierForm.contact_person}
              onChangeText={(text) => setSupplierForm({ ...supplierForm, contact_person: text })}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Phone Number *"
              value={supplierForm.phone}
              onChangeText={(text) => setSupplierForm({ ...supplierForm, phone: text })}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
            />

            <TextInput
              label="Email"
              value={supplierForm.email}
              onChangeText={(text) => setSupplierForm({ ...supplierForm, email: text })}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
            />

            <TextInput
              label="Address"
              value={supplierForm.address}
              onChangeText={(text) => setSupplierForm({ ...supplierForm, address: text })}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={closeModals} style={styles.modalButton}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleAddSupplier} style={styles.modalButton} icon="check">
                Add Supplier
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Alert Settings Modal */}
      <Portal>
        <Modal visible={alertSettingsModalVisible} onDismiss={closeModals} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>Stock Alert Settings</Text>

          {selectedProduct && (
            <>
              <Card style={styles.productSummary}>
                <Card.Content>
                  <Text variant="titleMedium">{selectedProduct.name}</Text>
                  <Text variant="bodyMedium" style={styles.currentStock}>
                    Current: {selectedProduct.current_stock} {selectedProduct.unit}
                  </Text>
                </Card.Content>
              </Card>

              <TextInput
                label="Minimum Stock Level *"
                value={alertForm.min_stock_level}
                onChangeText={(text) => setAlertForm({ ...alertForm, min_stock_level: text })}
                mode="outlined"
                style={styles.input}
                keyboardType="numeric"
                right={<TextInput.Affix text={selectedProduct.unit} />}
                helperText="You'll be alerted when stock falls below this level"
              />

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={closeModals} style={styles.modalButton}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleUpdateAlertLevel} style={styles.modalButton} icon="check">
                  Update
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
    gap: 8,
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
  filterContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    marginBottom: 12,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
  },
  productCard: {
    margin: 12,
    marginBottom: 8,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: 'bold',
  },
  category: {
    color: '#666',
    marginTop: 2,
  },
  statusChip: {
    height: 28,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockValue: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  minStock: {
    color: '#999',
  },
  divider: {
    marginVertical: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  iconButton: {
    margin: 0,
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
  productSummary: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  currentStock: {
    marginTop: 4,
    color: '#666',
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
