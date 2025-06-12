// Security utilities for input validation and sanitization

/**
 * Sanitizes text input by removing HTML tags and dangerous characters
 */
export const sanitizeText = (input: string | null | undefined): string => {
  if (!input) return '';
  
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>&"']/g, '') // Remove dangerous characters
    .trim();
};

/**
 * Validates license plate format
 */
export const validateLicensePlate = (licensePlate: string): boolean => {
  if (!licensePlate || licensePlate.length === 0 || licensePlate.length > 20) {
    return false;
  }
  return /^[A-Za-z0-9\-\s]+$/.test(licensePlate);
};

/**
 * Validates cargo description
 */
export const validateCargoDescription = (description: string): boolean => {
  if (!description || description.length === 0 || description.length > 500) {
    return false;
  }
  return !/<[^>]*>/.test(description); // No HTML tags
};

/**
 * Validates pallet count
 */
export const validatePalletCount = (count: number): boolean => {
  return count > 0 && count <= 100 && Number.isInteger(count);
};

/**
 * Validates task title
 */
export const validateTaskTitle = (title: string): boolean => {
  return title && title.trim().length > 0 && title.length <= 200;
};

/**
 * Validates task description
 */
export const validateTaskDescription = (description: string | null): boolean => {
  if (!description) return true; // Description is optional
  return description.length <= 1000 && !/<[^>]*>/.test(description);
};

/**
 * Validates date is not in the past and within reasonable future
 */
export const validateFutureDate = (date: string): boolean => {
  const selectedDate = new Date(date);
  const today = new Date();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(today.getFullYear() + 1);
  
  // Set both dates to start of day for proper comparison
  selectedDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return selectedDate >= today && selectedDate <= oneYearFromNow;
};

/**
 * Validates time is at least 2 minutes from now for today's date
 */
export const validateFutureTime = (date: string, time: string): boolean => {
  const selectedDate = new Date(date);
  const today = new Date();
  
  // If not today, any time is valid
  if (selectedDate.toDateString() !== today.toDateString()) {
    return true;
  }
  
  // For today, check if time is at least 2 minutes from now
  const [hours, minutes] = time.split(':').map(Number);
  const selectedDateTime = new Date();
  selectedDateTime.setHours(hours, minutes, 0, 0);
  
  const twoMinutesFromNow = new Date(Date.now() + 2 * 60 * 1000);
  
  return selectedDateTime >= twoMinutesFromNow;
};

/**
 * Security headers for API requests
 */
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };
};

/**
 * Rate limiting check (simple client-side implementation)
 */
const requestCounts = new Map<string, { count: number; timestamp: number }>();

export const checkRateLimit = (identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || now - record.timestamp > windowMs) {
    requestCounts.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
};

/**
 * Secure error message that doesn't leak sensitive information
 */
export const getSecureErrorMessage = (error: unknown): string => {
  // Don't expose internal error details
  if (error instanceof Error) {
    // Only return safe, user-friendly messages
    if (error.message.includes('Invalid license plate')) {
      return 'Please enter a valid license plate (letters, numbers, spaces, and hyphens only)';
    }
    if (error.message.includes('Arrival date must be')) {
      return 'Please select a date between today and one year from now';
    }
    if (error.message.includes('Invalid cargo description')) {
      return 'Cargo description must be 1-500 characters and contain no HTML';
    }
    if (error.message.includes('Pallet count must be')) {
      return 'Pallet count must be between 1 and 100';
    }
    if (error.message.includes('Task title')) {
      return 'Task title is required and must be under 200 characters';
    }
    if (error.message.includes('violates row-level security')) {
      return 'You do not have permission to perform this action';
    }
  }
  
  return 'An error occurred. Please try again or contact support if the problem persists.';
};

/**
 * Log security events (in production, this would send to a security monitoring service)
 */
export const logSecurityEvent = (event: string, details: Record<string, any> = {}): void => {
  console.warn('[SECURITY]', event, {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...details
  });
  
  // In production, send to security monitoring service:
  // sendToSecurityMonitoring({ event, details, timestamp: Date.now() });
};