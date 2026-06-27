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
  SegmentedButtons,
  Chip,
  IconButton,
  Snackbar,
  Menu,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll, insertRecord, updateRecord, deleteRecord } from '../database';

export default function ProductsScreen() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [menuVisible, setMenuVisible] = useState({});

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    category_id: 1,
    cost_price: '',
    selling_price: '',
    current_stock: '0',
    min_stock_level: '10',
    unit: 'piece',
    is_active: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, products]);

  const loadData = async () => {
    try {
      const categoriesData = await fetchAll('SELECT * FROM categories ORDER BY name', []);
      const productsData = await fetchAll(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         ORDER BY p.name`,
        []
      );

      setCategories(categoriesData);
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const filterProducts = () => {
    if (selectedCategory === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter((p) => p.category_id === parseInt(selectedCategory)));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditMode(false);
    setFormData({
      id: null,
      name: '',
      category_id: categories[0]?.id || 1,
      cost_price: '',
      selling_price: '',
      current_stock: '0',
      min_stock_level: '10',
      unit: 'piece',
      is_active: 1,
    });
    setModalVisible(true);
  };

  const openEditModal = (product) => {
    setEditMode(true);
    setFormData({
      id: product.id,
      name: product.name,
      category_id: product.category_id,
      cost_price: product.cost_price.toString(),
      selling_price: product.selling_price.toString(),
      current_stock: product.current_stock.toString(),
      min_stock_level: product.min_stock_level.toString(),
      unit: product.unit,
      is_active: product.is_active,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name || !formData.cost_price || !formData.selling_price) {
      showSnackbar('Please fill in all required fields');
      return;
    }

    const costPrice = parseFloat(formData.cost_price);
    const sellingPrice = parseFloat(formData.selling_price);

    if (isNaN(costPrice) || isNaN(sellingPrice)) {
      showSnackbar('Prices must be valid numbers');
      return;
    }

    if (sellingPrice < costPrice) {
      showSnackbar('Selling price should be higher than cost price');
      return;
    }

    try {
      const productData = {
        name: formData.name,
        category_id: formData.category_id,
        cost_price: costPrice,
        selling_price: sellingPrice,
        current_stock: parseInt(formData.current_stock) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 10,
        unit: formData.unit,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editMode) {
        await updateRecord('products', productData, 'id = ?', [formData.id]);
        showSnackbar('Product updated successfully');
      } else {
        await insertRecord('products', productData);
        showSnackbar('Product created successfully');
      }

      closeModal();
      await loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      showSnackbar('Failed to save product');
    }
  };

  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      await updateRecord(
        'products',
        { is_active: currentStatus ? 0 : 1, updated_at: new Date().toISOString() },
        'id = ?',
        [productId]
      );
      await loadData();
      showSnackbar(currentStatus ? 'Product deactivated' : 'Product activated');
    } catch (error) {
      console.error('Error toggling product status:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await deleteRecord('products', 'id = ?', [productId]);
      await loadData();
      showSnackbar('Product deleted successfully');
      closeMenu(productId);
    } catch (error) {
      console.error('Error deleting product:', error);
      showSnackbar('Failed to delete product. It may be referenced in orders.');
    }
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const formatCurrency = (amount) => {
    return `${Math.round(amount).toLocaleString()} RWF`;
  };

  const openMenu = (productId) => {
    setMenuVisible({ ...menuVisible, [productId]: true });
  };

  const closeMenu = (productId) => {
    setMenuVisible({ ...menuVisible, [productId]: false });
  };

  // Only owners can manage products
  if (user?.role !== 'owner') {
    return (
      <View style={styles.unauthorizedContainer}>
        <MaterialCommunityIcons name="lock" size={64} color="#ccc" />
        <Text variant="titleLarge" style={styles.unauthorizedText}>
          Access Denied
        </Text>
        <Text variant="bodyMedium" style={styles.unauthorizedSubtext}>
          Only owners can manage products
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={selectedCategory === 'all'}
            onPress={() => setSelectedCategory('all')}
            style={styles.categoryChip}
          >
            All Products
          </Chip>
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              selected={selectedCategory === cat.id.toString()}
              onPress={() => setSelectedCategory(cat.id.toString())}
              style={styles.categoryChip}
            >
              {cat.name}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.subtitle}>
            {filteredProducts.length} products
          </Text>
        </View>

        {filteredProducts.map((product) => (
          <Card key={product.id} style={styles.productCard}>
            <Card.Content>
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <View style={styles.productNameRow}>
                    <Text variant="titleLarge">{product.name}</Text>
                    {!product.is_active && (
                      <Chip icon="close-circle" textStyle={{ fontSize: 10 }} style={styles.inactiveChip}>
                        Inactive
                      </Chip>
                    )}
                    {product.current_stock <= product.min_stock_level && (
                      <Chip icon="alert" textStyle={{ fontSize: 10, color: '#f44336' }} style={styles.lowStockChip}>
                        Low Stock
                      </Chip>
                    )}
                  </View>

                  <Text variant="bodyMedium" style={styles.category}>
                    {product.category_name}
                  </Text>

                  <View style={styles.priceRow}>
                    <View style={styles.priceItem}>
                      <Text variant="bodySmall" style={styles.priceLabel}>
                        Cost:
                      </Text>
                      <Text variant="bodyLarge" style={styles.costPrice}>
                        {formatCurrency(product.cost_price)}
                      </Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text variant="bodySmall" style={styles.priceLabel}>
                        Selling:
                      </Text>
                      <Text variant="bodyLarge" style={styles.sellingPrice}>
                        {formatCurrency(product.selling_price)}
                      </Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text variant="bodySmall" style={styles.priceLabel}>
                        Profit:
                      </Text>
                      <Text variant="bodyLarge" style={styles.profitPrice}>
                        {formatCurrency(product.selling_price - product.cost_price)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stockRow}>
                    <Text variant="bodyMedium">
                      Stock: <Text style={styles.stockValue}>{product.current_stock}</Text> {product.unit}
                    </Text>
                    <Text variant="bodySmall" style={styles.minStock}>
                      (Min: {product.min_stock_level})
                    </Text>
                  </View>
                </View>

                <View style={styles.productActions}>
                  <IconButton icon="pencil" size={24} onPress={() => openEditModal(product)} iconColor="#2196f3" />
                  <Menu
                    visible={menuVisible[product.id] || false}
                    onDismiss={() => closeMenu(product.id)}
                    anchor={
                      <IconButton icon="dots-vertical" size={24} onPress={() => openMenu(product.id)} />
                    }
                  >
                    <Menu.Item
                      onPress={() => {
                        toggleProductStatus(product.id, product.is_active);
                        closeMenu(product.id);
                      }}
                      title={product.is_active ? 'Deactivate' : 'Activate'}
                      leadingIcon={product.is_active ? 'eye-off' : 'eye'}
                    />
                    <Menu.Item
                      onPress={() => handleDeleteProduct(product.id)}
                      title="Delete"
                      leadingIcon="delete"
                      titleStyle={{ color: '#f44336' }}
                    />
                  </Menu>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <FAB style={styles.fab} icon="plus" label="Add Product" onPress={openAddModal} />

      {/* Add/Edit Product Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={closeModal} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {editMode ? 'Edit Product' : 'Add New Product'}
          </Text>

          <ScrollView>
            <TextInput
              label="Product Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              mode="outlined"
              style={styles.input}
            />

            <Text variant="titleSmall" style={styles.fieldLabel}>
              Category *
            </Text>
            <SegmentedButtons
              value={formData.category_id.toString()}
              onValueChange={(value) => setFormData({ ...formData, category_id: parseInt(value) })}
              buttons={categories.map((cat) => ({
                value: cat.id.toString(),
                label: cat.name,
              }))}
              style={styles.segmentedButtons}
            />

            <View style={styles.row}>
              <TextInput
                label="Cost Price *"
                value={formData.cost_price}
                onChangeText={(text) => setFormData({ ...formData, cost_price: text })}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                keyboardType="numeric"
                right={<TextInput.Affix text="RWF" />}
              />
              <TextInput
                label="Selling Price *"
                value={formData.selling_price}
                onChangeText={(text) => setFormData({ ...formData, selling_price: text })}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                keyboardType="numeric"
                right={<TextInput.Affix text="RWF" />}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                label="Current Stock"
                value={formData.current_stock}
                onChangeText={(text) => setFormData({ ...formData, current_stock: text })}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                keyboardType="numeric"
              />
              <TextInput
                label="Min Stock Level"
                value={formData.min_stock_level}
                onChangeText={(text) => setFormData({ ...formData, min_stock_level: text })}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                keyboardType="numeric"
              />
            </View>

            <Text variant="titleSmall" style={styles.fieldLabel}>
              Unit
            </Text>
            <SegmentedButtons
              value={formData.unit}
              onValueChange={(value) => setFormData({ ...formData, unit: value })}
              buttons={[
                { value: 'piece', label: 'Piece' },
                { value: 'bottle', label: 'Bottle' },
                { value: 'plate', label: 'Plate' },
                { value: 'kg', label: 'Kg' },
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
  filterContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryChip: {
    marginRight: 8,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  subtitle: {
    color: '#666',
  },
  productCard: {
    margin: 12,
    marginBottom: 8,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  category: {
    color: '#666',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    color: '#999',
  },
  costPrice: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  sellingPrice: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  profitPrice: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  stockValue: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  minStock: {
    color: '#999',
  },
  inactiveChip: {
    height: 24,
    backgroundColor: '#ffebee',
  },
  lowStockChip: {
    height: 24,
    backgroundColor: '#fff3e0',
  },
  productActions: {
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  segmentedButtons: {
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
