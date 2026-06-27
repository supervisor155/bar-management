import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { format } from 'date-fns';

// Export data to CSV format
export const exportToCSV = async (data, filename) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get column headers from first row
  const headers = Object.keys(data[0]);

  // Create CSV content
  let csvContent = headers.join(',') + '\n';

  data.forEach((row) => {
    const values = headers.map((header) => {
      let value = row[header];

      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }

      // Escape quotes and wrap in quotes if contains comma
      value = String(value).replace(/"/g, '""');
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        value = `"${value}"`;
      }

      return value;
    });

    csvContent += values.join(',') + '\n';
  });

  // Save and share file
  if (Platform.OS === 'web') {
    // For web, trigger download
    downloadWebFile(csvContent, filename, 'text/csv');
  } else {
    // For mobile, save to filesystem and share
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }

    return fileUri;
  }
};

// Export data to JSON format
export const exportToJSON = async (data, filename) => {
  if (!data) {
    throw new Error('No data to export');
  }

  const jsonContent = JSON.stringify(data, null, 2);

  // Save and share file
  if (Platform.OS === 'web') {
    // For web, trigger download
    downloadWebFile(jsonContent, filename, 'application/json');
  } else {
    // For mobile, save to filesystem and share
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }

    return fileUri;
  }
};

// Helper function to download file in web browser
const downloadWebFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Export complete database backup
export const exportCompleteBackup = async (fetchAll) => {
  try {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');

    // Fetch all data from all tables
    const backup = {
      exported_at: new Date().toISOString(),
      version: '1.0.0',
      data: {
        users: await fetchAll('SELECT * FROM users', []),
        categories: await fetchAll('SELECT * FROM categories', []),
        products: await fetchAll('SELECT * FROM products', []),
        orders: await fetchAll('SELECT * FROM orders', []),
        order_items: await fetchAll('SELECT * FROM order_items', []),
        stock_movements: await fetchAll('SELECT * FROM stock_movements', []),
        daily_summaries: await fetchAll('SELECT * FROM daily_summaries', []),
      },
    };

    const filename = `bar_backup_${timestamp}.json`;
    await exportToJSON(backup, filename);

    return filename;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};

// Export sales report for a date range
export const exportSalesReport = async (fetchAll, startDate, endDate) => {
  try {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');

    const orders = await fetchAll(
      `SELECT o.*, u.full_name as waiter_name
       FROM orders o
       JOIN users u ON o.created_by = u.id
       WHERE DATE(o.created_at) BETWEEN ? AND ?
       ORDER BY o.created_at DESC`,
      [startDate, endDate]
    );

    const filename = `sales_report_${startDate}_to_${endDate}_${timestamp}.csv`;
    await exportToCSV(orders, filename);

    return filename;
  } catch (error) {
    console.error('Error exporting sales report:', error);
    throw error;
  }
};

// Export inventory report
export const exportInventoryReport = async (fetchAll) => {
  try {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');

    const products = await fetchAll(
      `SELECT p.*, c.name as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = 1
       ORDER BY p.name`,
      []
    );

    const filename = `inventory_report_${timestamp}.csv`;
    await exportToCSV(products, filename);

    return filename;
  } catch (error) {
    console.error('Error exporting inventory report:', error);
    throw error;
  }
};

// Export product sales summary
export const exportProductSalesReport = async (fetchAll, startDate, endDate) => {
  try {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');

    const productSales = await fetchAll(
      `SELECT
        p.name as product_name,
        c.name as category_name,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.unit_price) as avg_selling_price,
        COUNT(DISTINCT oi.order_id) as number_of_orders
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN orders o ON oi.order_id = o.id
       WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.payment_status = 'paid'
       GROUP BY p.id
       ORDER BY total_revenue DESC`,
      [startDate, endDate]
    );

    const filename = `product_sales_${startDate}_to_${endDate}_${timestamp}.csv`;
    await exportToCSV(productSales, filename);

    return filename;
  } catch (error) {
    console.error('Error exporting product sales report:', error);
    throw error;
  }
};
