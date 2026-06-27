import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase Project Credentials
const SUPABASE_URL = 'https://tqkpzkxjipigqcdwlpqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxa3B6a3hqaXBpZ3FjZHdscHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzY0NTEsImV4cCI6MjA5ODE1MjQ1MX0.YHrzkaWAd3bB3tIu6HMYCQIKKNJq4YXvzroVrKOF5Bc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Connection status helper
export const checkConnection = async () => {
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    return false;
  }
};
