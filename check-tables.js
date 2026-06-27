// Check what tables exist in Supabase
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tqkpzkxjipigqcdwlpqs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxa3B6a3hqaXBpZ3FjZHdscHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzY0NTEsImV4cCI6MjA5ODE1MjQ1MX0.YHrzkaWAd3bB3tIu6HMYCQIKKNJq4YXvzroVrKOF5Bc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const expectedTables = [
  'users',
  'categories',
  'products',
  'orders',
  'order_items',
  'payments',
  'inventory_transactions',
  'suppliers',
  'purchase_orders',
  'purchase_order_items',
  'credit_customers',
  'credit_payments',
  'loyalty_customers',
  'loyalty_transactions',
  'tables',
  'cash_drawer_shifts',
  'cash_drawer_transactions'
];

async function checkTables() {
  console.log('📊 Checking Supabase tables...\n');

  const results = [];

  for (const table of expectedTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.push({ table, exists: false, count: 0, error: error.message });
      } else {
        results.push({ table, exists: true, count: count || 0 });
      }
    } catch (err) {
      results.push({ table, exists: false, count: 0, error: err.message });
    }
  }

  console.log('Results:\n');
  results.forEach(r => {
    if (r.exists) {
      console.log(`✅ ${r.table.padEnd(30)} - ${r.count} records`);
    } else {
      console.log(`❌ ${r.table.padEnd(30)} - NOT FOUND`);
    }
  });

  const existingCount = results.filter(r => r.exists).length;
  console.log(`\n📊 Summary: ${existingCount}/${expectedTables.length} tables exist`);

  if (existingCount === expectedTables.length) {
    console.log('\n🎉 All tables are ready! Your database is fully set up.');
  } else {
    console.log('\n⚠️  Some tables are missing. You need to run the migration script.');
  }
}

checkTables();
