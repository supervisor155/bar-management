/**
 * Format currency with proper NaN handling
 * @param {number|string} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount) => {
  // Convert to number and handle invalid values
  const numAmount = parseFloat(amount);

  // Check for NaN, null, undefined, or invalid numbers
  if (isNaN(numAmount) || numAmount === null || numAmount === undefined) {
    return '0 RWF';
  }

  // Format with thousands separator
  return `${numAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })} RWF`;
};

/**
 * Parse currency input string to number
 * @param {string} value - Input value
 * @returns {number} - Parsed number or 0
 */
export const parseCurrency = (value) => {
  if (!value) return 0;

  // Remove non-numeric characters except decimal point
  const cleaned = value.toString().replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Format number with proper handling
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number
 */
export const formatNumber = (value, decimals = 0) => {
  const num = parseFloat(value);

  if (isNaN(num)) return '0';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Ensure value is a valid number
 * @param {any} value - Value to validate
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} - Valid number
 */
export const ensureNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};
