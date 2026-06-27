// Quick test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tqkpzkxjipigqcdwlpqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxa3B6a3hqaXBpZ3FjZHdscHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzY0NTEsImV4cCI6MjA5ODE1MjQ1MX0.YHrzkaWAd3bB3tIu6HMYCQIKKNJq4YXvzroVrKOF5Bc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Try to query (will fail if no tables, but connection works)
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error && error.message.includes('relation "public.users" does not exist')) {
      console.log('✅ Connection successful!');
      console.log('⚠️  Tables not created yet - run the migration script next');
      console.log('\nNext step: Go to Supabase SQL Editor and run the migration');
      return true;
    }

    if (error) {
      console.log('❌ Connection error:', error.message);
      return false;
    }

    console.log('✅ Connection successful!');
    console.log('✅ Tables already exist!');
    return true;

  } catch (err) {
    console.log('❌ Connection failed:', err.message);
    return false;
  }
}

testConnection();
