/**
 * Utility functions for consistent date formatting across the application
 * All dates should be displayed in DD/MM/YYYY format
 */

/**
 * Formats a date to DD/MM/YYYY format
 * @param date - Date object, string, or timestamp
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString();
  
  return `${day}/${month}/${year}`;
};

/**
 * Formats a date and time to DD/MM/YYYY HH:mm format
 * @param date - Date object, string, or timestamp
 * @returns Formatted datetime string
 */
export const formatDateTime = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const formattedDate = formatDate(d);
  const time = d.toLocaleTimeString('en-GB', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `${formattedDate} ${time}`;
};

/**
 * Formats time to HH:mm format (24-hour)
 * @param date - Date object, string, or timestamp
 * @returns Formatted time string in HH:mm format
 */
export const formatTime = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid Time';
  }
  
  return d.toLocaleTimeString('en-GB', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Parses DD/MM/YYYY format to Date object
 * @param dateString - Date string in DD/MM/YYYY format
 * @returns Date object or null if invalid
 */
export const parseDate = (dateString: string): Date | null => {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(regex);
  
  if (!match) {
    return null;
  }
  
  const [, day, month, year] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  // Validate the date
  if (date.getDate() !== parseInt(day) || 
      date.getMonth() !== parseInt(month) - 1 || 
      date.getFullYear() !== parseInt(year)) {
    return null;
  }
  
  return date;
};

/**
 * Gets today's date in YYYY-MM-DD format for database queries
 * @returns Today's date in YYYY-MM-DD format
 */
export const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Gets today's date in DD/MM/YYYY format for display
 * @returns Today's date in DD/MM/YYYY format
 */
export const getTodayFormatted = (): string => {
  return formatDate(new Date());
};