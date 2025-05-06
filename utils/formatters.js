/**
 * Format a date to a human-readable string
 * @param {Date|string} date - Date object or date string
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  // If date is a string, convert to Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if valid date
  if (isNaN(dateObj.getTime())) return '';
  
  // Format options
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return dateObj.toLocaleDateString('en-IN', options);
};

/**
 * Format a number as INR currency
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0.00';
  
  // Ensure amount is a number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if valid number
  if (isNaN(numAmount)) return '₹0.00';
  
  // Format as currency
  return `₹${numAmount.toFixed(2)}`;
};

/**
 * Format a number as INR currency without decimal places for larger amounts
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrencyCompact = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  
  // Ensure amount is a number
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Check if valid number
  if (isNaN(numAmount)) return '₹0';
  
  // For amounts >= 1000, format without decimal places
  if (Math.abs(numAmount) >= 1000) {
    return `₹${Math.round(numAmount).toLocaleString('en-IN')}`;
  }
  
  // For smaller amounts, show 2 decimal places
  return `₹${numAmount.toFixed(2)}`;
}; 