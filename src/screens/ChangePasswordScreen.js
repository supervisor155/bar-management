import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchOne, updateRecord } from '../database';
import { useNavigation } from '@react-navigation/native';

export default function ChangePasswordScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      showSnackbar('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      showSnackbar('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      showSnackbar('New password must be different from current password');
      return;
    }

    setLoading(true);

    try {
      // Verify current password
      const dbUser = await fetchOne(
        'SELECT id FROM users WHERE id = ? AND password = ?',
        [user.id, currentPassword]
      );

      if (!dbUser) {
        showSnackbar('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Update password
      await updateRecord(
        'users',
        { password: newPassword, updated_at: new Date().toISOString() },
        'id = ?',
        [user.id]
      );

      showSnackbar('Password changed successfully!');

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Navigate back after 2 seconds
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);
      showSnackbar('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header Card */}
        <Card style={styles.card}>
          <Card.Content style={styles.header}>
            <MaterialCommunityIcons name="lock-reset" size={48} color="#1976d2" />
            <Text variant="headlineSmall" style={styles.title}>
              Change Password
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Enter your current password and choose a new one
            </Text>
          </Card.Content>
        </Card>

        {/* Form Card */}
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
              left={<TextInput.Icon icon="lock-plus" />}
            />

            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
              left={<TextInput.Icon icon="lock-check" />}
            />

            <View style={styles.requirements}>
              <Text variant="bodySmall" style={styles.requirementsTitle}>
                Password Requirements:
              </Text>
              <View style={styles.requirement}>
                <MaterialCommunityIcons
                  name={newPassword.length >= 6 ? 'check-circle' : 'circle-outline'}
                  size={16}
                  color={newPassword.length >= 6 ? '#4caf50' : '#999'}
                />
                <Text variant="bodySmall" style={styles.requirementText}>
                  At least 6 characters
                </Text>
              </View>
              <View style={styles.requirement}>
                <MaterialCommunityIcons
                  name={newPassword === confirmPassword && newPassword ? 'check-circle' : 'circle-outline'}
                  size={16}
                  color={newPassword === confirmPassword && newPassword ? '#4caf50' : '#999'}
                />
                <Text variant="bodySmall" style={styles.requirementText}>
                  Passwords match
                </Text>
              </View>
              <View style={styles.requirement}>
                <MaterialCommunityIcons
                  name={newPassword && currentPassword !== newPassword ? 'check-circle' : 'circle-outline'}
                  size={16}
                  color={newPassword && currentPassword !== newPassword ? '#4caf50' : '#999'}
                />
                <Text variant="bodySmall" style={styles.requirementText}>
                  Different from current password
                </Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={loading}
              disabled={loading}
              icon="check"
              style={styles.button}
            >
              Change Password
            </Button>
          </Card.Content>
        </Card>

        {/* Security Tips */}
        <Card style={styles.card}>
          <Card.Title
            title="Security Tips"
            left={(props) => <MaterialCommunityIcons name="shield-check" size={24} color="#4caf50" />}
          />
          <Card.Content>
            <View style={styles.tip}>
              <MaterialCommunityIcons name="check" size={20} color="#4caf50" />
              <Text variant="bodyMedium" style={styles.tipText}>
                Use a mix of letters, numbers, and symbols
              </Text>
            </View>
            <View style={styles.tip}>
              <MaterialCommunityIcons name="check" size={20} color="#4caf50" />
              <Text variant="bodyMedium" style={styles.tipText}>
                Don't use easily guessable passwords
              </Text>
            </View>
            <View style={styles.tip}>
              <MaterialCommunityIcons name="check" size={20} color="#4caf50" />
              <Text variant="bodyMedium" style={styles.tipText}>
                Change your password regularly
              </Text>
            </View>
            <View style={styles.tip}>
              <MaterialCommunityIcons name="check" size={20} color="#4caf50" />
              <Text variant="bodyMedium" style={styles.tipText}>
                Don't share your password with anyone
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

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
  card: {
    margin: 12,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    marginTop: 12,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  subtitle: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  requirements: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  requirementText: {
    color: '#666',
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    gap: 12,
  },
  tipText: {
    flex: 1,
    color: '#666',
  },
});
