import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchOne } from '../database';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      // Query user from database
      const dbUser = await fetchOne(
        'SELECT id, username, full_name, role, is_active FROM users WHERE username = ? AND password = ? COLLATE NOCASE',
        [username, password]
      );

      console.log('Login attempt:', { username, found: !!dbUser, dbUser });

      if (!dbUser) {
        throw new Error('Invalid username or password');
      }

      if (dbUser.is_active === 0 || dbUser.is_active === false) {
        throw new Error('Account is deactivated');
      }

      // Store user data
      const userData = {
        id: dbUser.id,
        username: dbUser.username,
        fullName: dbUser.full_name,
        role: dbUser.role,
      };

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const hasRole = (roles) => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    hasRole,
    isOwner: user?.role === 'owner',
    isManager: user?.role === 'manager',
    isWaiter: user?.role === 'waiter',
    isBartender: user?.role === 'bartender',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
