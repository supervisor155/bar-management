import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Card,
  Text,
  Button,
  FAB,
  Portal,
  Modal,
  TextInput,
  Chip,
  List,
  Divider,
  Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchAll, insertRecord, updateRecord } from '../database';
import { useAuth } from '../context/AuthContext';

export default function InventoryScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const productsData = await fetchAll(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1
         ORDER BY p.current_stock ASC, p.name ASC`,
        []
      );

      const categoriesData = await fetchAll('SELECT * FROM categories ORDER BY name', []);

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openStockModal = (product) => {
    setSelectedProduct(product);
    setStockQuantity('');
    setModalVisible(true);
  };

  const handleAddStock = async () => {
    if (!stockQuantity || isNaN(stockQuantity) || parseFloat(stockQuantity) <= 0) {
      showSnackbar('Please enter a valid quantity');
      return;
    }

    try {
      const quantity = parseFloat(stockQuantity);
      const newStock = selectedProduct.current_stock + quantity;

      await updateRecord(
        'products',
        { current_stock: newStock, updated_at: new Date().toISOString() },
        'id = ?',
        [selectedProduct.id]
      );

      await insertRecord('stock_movements', {
        product_id: selectedProduct.id,
        movement_type: 'purchase',
        quantity: quantity,
        created_by: user.id,
      });

      showSnackbar(`Added ${quantity} ${selectedProduct.unit} to ${selectedProduct.name}`);
      setModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error adding stock:', error);
      showSnackbar('Failed to add stock');
    }
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const formatCurrency = (amount) => {
    return `${amount.toLocaleString()} RWF`;
  };

  const getStockStatus = (product) => {
    if (product.current_stock === 0) {
      return { label: 'Out of Stock', color: '#f44336', icon: 'alert-circle' };
    } else if (product.current_stock <= product.min_stock_level) {
      return { label: 'Low Stock', color: '#ff9800', icon: 'alert' };
    } else {
      return { label: 'In Stock', color: '#4caf50', icon: 'check-circle' };
    }
  };

  const groupByCategory = () => {
    const grouped = {};
    products.forEach((product) => {
      if (!grouped[product.category_name]) {
        grouped[product.category_name] = [];
      }
      grouped[product.category_name].push(product);
    });
    return grouped;
  };

  const groupedProducts = groupByCategory();

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleMedium">Total Products</Text>
              <Text variant="headlineMedium" style={styles.summaryValue}>
                {products.length}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleMedium">Low Stock Items</Text>
              <Text variant="headlineMedium" style={[styles.summaryValue, { color: '#ff9800' }]}>
                {products.filter((p) => p.current_stock <= p.min_stock_level).length}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Products by Category */}
        {Object.keys(groupedProducts).map((categoryName) => (
          <View key={categoryName}>
            <Text variant="titleLarge" style={styles.categoryHeader}>
              {categoryName}
            </Text>

            {groupedProducts[categoryName].map((product) => {
              const status = getStockStatus(product);
              return (
                <Card key={product.id} style={styles.productCard}>
                  <Card.Title
                    title={product.name}
                    subtitle={`${product.current_stock} ${product.unit} available`}
                    left={(props) => (
                      <View style={[styles.statusIcon, { backgroundColor: status.color }]}>
                        <MaterialCommunityIcons name={status.icon} size={24} color="#fff" />
                      </View>
                    )}
                    right={(props) => (
                      <Button mode="outlined" onPress={() => openStockModal(product)}>
                        Add Stock
                      </Button>
                    )}
                  />
                  <Card.Content>
                    <View style={styles.productDetails}>
                      <View style={styles.detailRow}>
                        <Text variant="bodyMedium">Cost Price:</Text>
                        <Text variant="bodyMedium" style={styles.detailValue}>
                          {formatCurrency(product.cost_price)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text variant="bodyMedium">Selling Price:</Text>
                        <Text variant="bodyMedium" style={styles.detailValue}>
                          {formatCurrency(product.selling_price)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text variant="bodyMedium">Min Stock Level:</Text>
                        <Text variant="bodyMedium" style={styles.detailValue}>
                          {product.min_stock_level} {product.unit}
                        </Text>
                      </View>
                    </View>

                    <Chip icon={status.icon} textStyle={{ color: status.color }} style={styles.statusChip}>
                      {status.label}
                    </Chip>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Add Stock Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Add Stock: {selectedProduct?.name}
          </Text>

          <Divider />

          <View style={styles.modalContent}>
            <Text variant="bodyLarge" style={styles.currentStock}>
              Current Stock: {selectedProduct?.current_stock} {selectedProduct?.unit}
            </Text>

            <TextInput
              label="Quantity to Add"
              value={stockQuantity}
              onChangeText={setStockQuantity}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              right={<TextInput.Affix text={selectedProduct?.unit} />}
            />

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.modalButton}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleAddStock} style={styles.modalButton}>
                Add Stock
              </Button>
            </View>
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
  },
  summaryValue: {
    color: '#1976d2',
    fontWeight: 'bold',
    marginTop: 8,
  },
  categoryHeader: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    fontWeight: 'bold',
  },
  productCard: {
    margin: 12,
    marginTop: 4,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  productDetails: {
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailValue: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  modal: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    padding: 16,
  },
  modalContent: {
    padding: 16,
  },
  currentStock: {
    marginBottom: 16,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});
