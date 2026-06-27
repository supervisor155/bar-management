import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.subscriptions = [];
  }

  // Initialize notification service
  async initialize(userId, userRole) {
    try {
      console.log('🔔 Initializing notification service...');

      // Register for push notifications
      this.expoPushToken = await this.registerForPushNotifications();

      if (this.expoPushToken) {
        console.log('📱 Push token:', this.expoPushToken);

        // Save token to user profile
        await this.savePushToken(userId, this.expoPushToken);

        // Set up Supabase realtime subscriptions based on role
        await this.setupRealtimeSubscriptions(userId, userRole);
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      console.log('✅ Notification service initialized');
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
    }
  }

  // Register for push notifications
  async registerForPushNotifications() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Failed to get push token for push notification!');
        return null;
      }

      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          console.warn('⚠️ No Expo project ID found. Push notifications may not work.');
        }
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
      } catch (e) {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      }
    } else {
      console.log('⚠️ Must use physical device for Push Notifications');
    }

    return token;
  }

  // Save push token to user profile
  async savePushToken(userId, token) {
    try {
      const { error } = await supabase.from('users').update({ push_token: token }).eq('id', userId);

      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  // Set up Supabase realtime subscriptions
  async setupRealtimeSubscriptions(userId, userRole) {
    try {
      // 1. NEW ORDERS - For kitchen staff and managers
      if (userRole === 'cook' || userRole === 'manager' || userRole === 'owner') {
        const ordersChannel = supabase
          .channel('new-orders')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'orders',
            },
            (payload) => {
              this.handleNewOrder(payload.new);
            }
          )
          .subscribe();

        this.subscriptions.push(ordersChannel);
        console.log('✅ Subscribed to new orders');
      }

      // 2. ORDER STATUS CHANGES - For waiters (their orders only)
      if (userRole === 'waiter') {
        const orderStatusChannel = supabase
          .channel('order-status')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
              filter: `waiter_id=eq.${userId}`,
            },
            (payload) => {
              if (payload.new.status === 'ready') {
                this.handleOrderReady(payload.new);
              }
            }
          )
          .subscribe();

        this.subscriptions.push(orderStatusChannel);
        console.log('✅ Subscribed to order status updates');
      }

      // 3. LOW STOCK ALERTS - For managers only
      if (userRole === 'manager' || userRole === 'owner') {
        const lowStockChannel = supabase
          .channel('low-stock')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'products',
            },
            (payload) => {
              const { current_stock, min_stock_level, name } = payload.new;
              if (current_stock <= min_stock_level) {
                this.handleLowStock(payload.new);
              }
            }
          )
          .subscribe();

        this.subscriptions.push(lowStockChannel);
        console.log('✅ Subscribed to low stock alerts');
      }

      // 4. CASH DRAWER VARIANCE - For managers only
      if (userRole === 'manager' || userRole === 'owner') {
        const cashDrawerChannel = supabase
          .channel('cash-drawer')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'cash_drawer_shifts',
            },
            (payload) => {
              if (payload.new.status === 'closed' && Math.abs(payload.new.variance) > 1000) {
                this.handleCashVariance(payload.new);
              }
            }
          )
          .subscribe();

        this.subscriptions.push(cashDrawerChannel);
        console.log('✅ Subscribed to cash drawer alerts');
      }

      // 5. AI INSIGHTS - For managers only (high priority insights)
      if (userRole === 'manager' || userRole === 'owner') {
        // This would trigger when AI engine generates new insights
        // For now, we'll handle this manually when insights are generated
        console.log('✅ AI insights notifications enabled');
      }
    } catch (error) {
      console.error('Error setting up realtime subscriptions:', error);
    }
  }

  // Handle new order notification
  async handleNewOrder(order) {
    await this.sendLocalNotification({
      title: '🍽️ New Order Received',
      body: `Order #${order.order_number} - Table ${order.table_number || 'N/A'}`,
      data: { type: 'new_order', orderId: order.id, screen: 'KitchenDisplay' },
    });
  }

  // Handle order ready notification
  async handleOrderReady(order) {
    await this.sendLocalNotification({
      title: '✅ Order Ready',
      body: `Order #${order.order_number} is ready to serve!`,
      data: { type: 'order_ready', orderId: order.id, screen: 'Orders' },
    });
  }

  // Handle low stock notification
  async handleLowStock(product) {
    await this.sendLocalNotification({
      title: '⚠️ Low Stock Alert',
      body: `${product.name} is running low (${product.current_stock} ${product.unit} remaining)`,
      data: { type: 'low_stock', productId: product.id, screen: 'InventoryManagement' },
    });
  }

  // Handle cash drawer variance notification
  async handleCashVariance(shift) {
    const variance = shift.variance;
    const varianceType = variance > 0 ? 'over' : 'short';

    await this.sendLocalNotification({
      title: '💰 Cash Drawer Alert',
      body: `Shift closed with ${Math.abs(variance)} RWF ${varianceType}`,
      data: { type: 'cash_variance', shiftId: shift.id, screen: 'CashDrawer' },
    });
  }

  // Handle AI insight notification
  async handleAIInsight(insight) {
    await this.sendLocalNotification({
      title: '🤖 AI Insight',
      body: insight.title || 'New recommendation available',
      data: { type: 'ai_insight', insightId: insight.id, screen: 'AIInsights' },
    });
  }

  // Send local notification
  async sendLocalNotification({ title, body, data }) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });

      console.log('🔔 Notification sent:', title);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Send push notification to specific user(s)
  async sendPushNotification(userIds, { title, body, data }) {
    try {
      // Get push tokens for users
      const { data: users, error } = await supabase
        .from('users')
        .select('push_token')
        .in('id', userIds)
        .not('push_token', 'is', null);

      if (error || !users || users.length === 0) {
        console.log('No push tokens found for users');
        return;
      }

      const messages = users.map((user) => ({
        to: user.push_token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      }));

      // Send via Expo Push Notification API
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log('📤 Push notifications sent:', result);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Notification received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Notification received:', notification);
    });

    // User tapped on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification.request.content.data;

      // Navigation will be handled by the app
      if (data.screen) {
        // Emit event to navigate to screen
        this.notifyNavigationListeners(data);
      }
    });
  }

  // Navigation listeners
  navigationListeners = [];

  addNavigationListener(callback) {
    this.navigationListeners.push(callback);
  }

  removeNavigationListener(callback) {
    this.navigationListeners = this.navigationListeners.filter((l) => l !== callback);
  }

  notifyNavigationListeners(data) {
    this.navigationListeners.forEach((callback) => callback(data));
  }

  // Clean up
  cleanup() {
    // Remove notification listeners
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }

    // Unsubscribe from realtime channels
    this.subscriptions.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions = [];

    console.log('🧹 Notification service cleaned up');
  }

  // Test notification (for debugging)
  async testNotification() {
    await this.sendLocalNotification({
      title: '🧪 Test Notification',
      body: 'This is a test notification from Bar Management System',
      data: { type: 'test' },
    });
  }
}

export const notificationService = new NotificationService();
