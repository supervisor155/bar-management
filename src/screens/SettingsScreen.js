import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Divider, Avatar, Card, Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const handleLogout = () => {
    logout();
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Profile Card */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text size={64} label={user?.fullName?.charAt(0) || 'U'} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text variant="headlineSmall">{user?.fullName}</Text>
            <Text variant="bodyMedium" style={styles.role}>
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </Text>
            <Text variant="bodySmall" style={styles.username}>
              @{user?.username}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Settings Sections */}
      <List.Section>
        {user?.role === 'owner' && (
          <>
            <List.Subheader>Management</List.Subheader>

            <List.Item
              title="User Management"
              description="Add, edit, and manage users"
              left={(props) => <List.Icon {...props} icon="account-group" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Users')}
            />

            <List.Item
              title="Product Management"
              description="Add, edit, and manage products"
              left={(props) => <List.Icon {...props} icon="package-variant" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Products')}
            />

            <Divider />
          </>
        )}

        <List.Subheader>Account</List.Subheader>

        <List.Item
          title="Change Password"
          description="Update your account password"
          left={(props) => <List.Icon {...props} icon="lock-reset" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('ChangePassword')}
        />

        <Divider />

        <List.Subheader>General</List.Subheader>

        <List.Item
          title="Language"
          description="English"
          left={(props) => <List.Icon {...props} icon="translate" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />

        <List.Item
          title="Currency"
          description="RWF (Rwandan Franc)"
          left={(props) => <List.Icon {...props} icon="currency-usd" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />

        <Divider />

        <List.Subheader>App Settings</List.Subheader>

        <List.Item
          title="Notifications"
          description="Enable alerts and notifications"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />

        <List.Item
          title="Printer Settings"
          description="Configure receipt printer"
          left={(props) => <List.Icon {...props} icon="printer" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />

        {(user?.role === 'owner' || user?.role === 'manager') && (
          <List.Item
            title="Export & Backup"
            description="Export reports and create backups"
            left={(props) => <List.Icon {...props} icon="database-export" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Backup')}
          />
        )}

        <Divider />

        <List.Subheader>About</List.Subheader>

        <List.Item
          title="App Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />

        <List.Item
          title="Help & Support"
          description="Get help with the app"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />

        <Divider />
      </List.Section>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <Button mode="contained" onPress={handleLogout} icon="logout" style={styles.logoutButton} buttonColor="#f44336">
          Logout
        </Button>
      </View>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          Bar Management System v1.0.0
        </Text>
        <Text variant="bodySmall" style={styles.footerText}>
          © 2026 All rights reserved
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 16,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    backgroundColor: '#1976d2',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  role: {
    color: '#1976d2',
    marginTop: 4,
    fontWeight: 'bold',
  },
  username: {
    color: '#666',
    marginTop: 2,
  },
  logoutContainer: {
    padding: 16,
    marginTop: 16,
  },
  logoutButton: {
    paddingVertical: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    color: '#999',
    marginTop: 4,
  },
});
