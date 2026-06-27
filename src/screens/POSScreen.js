import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Card, Text, Button, TextInput, Chip, FAB, Portal, Modal, Snackbar, Divider, RadioButton, Menu } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchAll, fetchOne, insertRecord, updateRecord, executeQuery } from '../database';
import { format } from 'date-fns';

export default function POSScreen() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [orderType, setOrderType] = useState('regular'); // 'regular' or 'credit'
  const [creditCustomers, setCreditCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerMenuVisible, setCustomerMenuVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, searchQuery, products]);

  const loadData = async () => {
    try {
      const categoriesData = await fetchAll('SELECT * FROM categories ORDER BY name', []);
      const productsData = await fetchAll(
        `SELECT p.*, c.name as category_name
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1
         ORDER BY p.name`,
        []
      );

      const customersData = await fetchAll(
        'SELECT * FROM credit_customers WHERE is_active = 1 ORDER BY customer_name',
        []
      );

      setCategories(categoriesData);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setCreditCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.id !== productId));
    } else {
      setCart(cart.map((item) => (item.id === productId ? { ...item, quantity } : item)));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setTableNumber('');
    setOrderType('regular');
    setSelectedCustomer(null);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      showSnackbar('Cart is empty');
      return;
    }

    if (orderType === 'credit' && !selectedCustomer) {
      showSnackbar('Please select a customer for credit order');
      return;
    }

    try {
      // Generate order number
      const orderNumber = `ORD${Date.now()}`;
      const totalAmount = getCartTotal();

      // Insert order
      const orderId = await insertRecord('orders', {
        order_number: orderNumber,
        table_number: tableNumber || null,
        customer_id: orderType === 'credit' ? selectedCustomer.id : null,
        status: 'pending',
        total_amount: totalAmount,
        payment_status: orderType === 'credit' ? 'unpaid' : 'unpaid',
        payment_method: orderType === 'credit' ? 'credit' : null,
        created_by: user.id,
      });

      // Insert order items
      for (const item of cart) {
        await insertRecord('order_items', {
          order_id: orderId,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price,
          subtotal: item.selling_price * item.quantity,
          status: 'pending',
        });

        // Update stock for beverages
        if (item.current_stock !== undefined && item.current_stock !== null) {
          await executeQuery(
            'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
            [item.quantity, item.id]
          );

          // Record stock movement
          await insertRecord('stock_movements', {
            product_id: item.id,
            movement_type: 'sale',
            quantity: -item.quantity,
            reference_id: orderId,
            created_by: user.id,
          });
        }
      }

      // If credit order, update customer balance
      if (orderType === 'credit') {
        const newTotalCredit = selectedCustomer.total_credit + totalAmount;
        const newBalance = selectedCustomer.balance + totalAmount;

        await updateRecord(
          'credit_customers',
          {
            total_credit: newTotalCredit,
            balance: newBalance,
            updated_at: new Date().toISOString(),
          },
          'id = ?',
          [selectedCustomer.id]
        );

        // Record credit transaction
        await insertRecord('credit_transactions', {
          customer_id: selectedCustomer.id,
          order_id: orderId,
          transaction_type: 'credit',
          amount: totalAmount,
          balance_after: newBalance,
          notes: `Order #${orderNumber}`,
          created_by: user.id,
        });

        showSnackbar(`Credit order placed for ${selectedCustomer.customer_name}!`);
      } else {
        showSnackbar(`Order ${orderNumber} placed successfully!`);
      }

      clearCart();
      setModalVisible(false);
    } catch (error) {
      console.error('Error placing order:', error);
      showSnackbar('Failed to place order');
    }
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const formatCurrency = (amount) => {
    return `${amount.toLocaleString()} RWF`;
  };

  return (
    <View style={styles.container}>
      {/* Search and Category Filter */}
      <View style={styles.filterContainer}>
        <TextInput
          label="Search products"
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <Chip
            selected={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
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
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.productsList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
            <Card>
              <Card.Content style={styles.productContent}>
                <MaterialCommunityIcons
                  name={item.category_name.includes('Beer') ? 'beer' : item.category_name.includes('Food') ? 'food' : 'cup'}
                  size={48}
                  color="#1976d2"
                />
                <Text variant="titleMedium" style={styles.productName}>
                  {item.name}
                </Text>
                <Text variant="bodyLarge" style={styles.productPrice}>
                  {formatCurrency(item.selling_price)}
                </Text>
                {item.current_stock !== undefined && item.current_stock <= item.min_stock_level && (
                  <Chip icon="alert" textStyle={{ color: '#f44336', fontSize: 10 }} style={styles.lowStockChip}>
                    Low Stock
                  </Chip>
                )}
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
      />

      {/* Cart FAB */}
      {cart.length > 0 && (
        <FAB
          style={styles.fab}
          icon="cart"
          label={`${cart.length} items - ${formatCurrency(getCartTotal())}`}
          onPress={() => setModalVisible(true)}
        />
      )}

      {/* Cart Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <View style={styles.modalHeader}>
            <Text variant="headlineSmall">Cart</Text>
            <Button onPress={() => setModalVisible(false)}>Close</Button>
          </View>

          <Divider />

          <TextInput
            label="Table Number (Optional)"
            value={tableNumber}
            onChangeText={setTableNumber}
            mode="outlined"
            style={styles.tableInput}
            keyboardType="number-pad"
          />

          <View style={styles.orderTypeContainer}>
            <Text variant="titleSmall" style={styles.orderTypeLabel}>
              Order Type
            </Text>
            <RadioButton.Group onValueChange={setOrderType} value={orderType}>
              <View style={styles.radioRow}>
                <RadioButton.Item label="Regular Order" value="regular" />
                <RadioButton.Item label="Credit Order (Pay Later)" value="credit" />
              </View>
            </RadioButton.Group>
          </View>

          {orderType === 'credit' && (
            <View style={styles.customerSelectContainer}>
              <Text variant="titleSmall" style={styles.orderTypeLabel}>
                Select Customer *
              </Text>
              <Menu
                visible={customerMenuVisible}
                onDismiss={() => setCustomerMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setCustomerMenuVisible(true)}
                    style={styles.customerButton}
                    icon="account"
                  >
                    {selectedCustomer ? selectedCustomer.customer_name : 'Select Customer'}
                  </Button>
                }
              >
                {creditCustomers.map((customer) => (
                  <Menu.Item
                    key={customer.id}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setCustomerMenuVisible(false);
                    }}
                    title={customer.customer_name}
                    leadingIcon="account"
                  />
                ))}
              </Menu>
              {selectedCustomer && (
                <Text variant="bodySmall" style={styles.customerBalance}>
                  Current Balance: {formatCurrency(selectedCustomer.balance)}
                </Text>
              )}
            </View>
          )}

          <ScrollView style={styles.cartList}>
            {cart.map((item) => (
              <Card key={item.id} style={styles.cartItem}>
                <Card.Content>
                  <View style={styles.cartItemRow}>
                    <View style={styles.cartItemInfo}>
                      <Text variant="titleMedium">{item.name}</Text>
                      <Text variant="bodyMedium" style={styles.cartItemPrice}>
                        {formatCurrency(item.selling_price)} x {item.quantity}
                      </Text>
                    </View>
                    <View style={styles.cartItemActions}>
                      <Button icon="minus" mode="outlined" onPress={() => updateCartQuantity(item.id, item.quantity - 1)}>
                        -
                      </Button>
                      <Text variant="titleLarge" style={styles.quantityText}>
                        {item.quantity}
                      </Text>
                      <Button icon="plus" mode="outlined" onPress={() => updateCartQuantity(item.id, item.quantity + 1)}>
                        +
                      </Button>
                    </View>
                  </View>
                  <Text variant="titleMedium" style={styles.subtotal}>
                    Subtotal: {formatCurrency(item.selling_price * item.quantity)}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>

          <Divider />

          <View style={styles.cartFooter}>
            <View style={styles.totalRow}>
              <Text variant="headlineSmall">Total:</Text>
              <Text variant="headlineSmall" style={styles.totalAmount}>
                {formatCurrency(getCartTotal())}
              </Text>
            </View>

            <View style={styles.cartActions}>
              <Button mode="outlined" onPress={clearCart} style={styles.actionButton}>
                Clear Cart
              </Button>
              <Button mode="contained" onPress={handlePlaceOrder} style={styles.actionButton}>
                Place Order
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
  filterContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    marginBottom: 12,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    marginRight: 8,
  },
  productsList: {
    padding: 8,
  },
  productCard: {
    flex: 1,
    margin: 6,
  },
  productContent: {
    alignItems: 'center',
    padding: 12,
  },
  productName: {
    marginTop: 8,
    textAlign: 'center',
  },
  productPrice: {
    marginTop: 4,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  lowStockChip: {
    marginTop: 8,
    height: 24,
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
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  tableInput: {
    margin: 16,
    marginBottom: 8,
  },
  orderTypeContainer: {
    padding: 16,
    paddingTop: 0,
  },
  orderTypeLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  radioRow: {
    flexDirection: 'column',
  },
  customerSelectContainer: {
    padding: 16,
    paddingTop: 0,
  },
  customerButton: {
    marginBottom: 8,
  },
  customerBalance: {
    color: '#666',
    marginTop: 4,
  },
  cartList: {
    maxHeight: 300,
    padding: 16,
  },
  cartItem: {
    marginBottom: 12,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemPrice: {
    color: '#666',
    marginTop: 4,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityText: {
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  subtotal: {
    marginTop: 8,
    color: '#1976d2',
    textAlign: 'right',
  },
  cartFooter: {
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalAmount: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  cartActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
