import { ProcessingTime } from '@/types';

/**
 * Calculate processing hours for a truck
 */
export const calculateProcessingHours = (startedAt?: string, completedAt?: string): ProcessingTime | null => {
  if (!startedAt) return null;
  
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null;
  }
  
  const diffMs = Math.max(0, end.getTime() - start.getTime()); // Ensure non-negative
  const hours = diffMs / (1000 * 60 * 60);
  
  return {
    hours: Math.floor(hours),
    minutes: Math.floor((hours - Math.floor(hours)) * 60),
    totalHours: hours.toFixed(1)
  };
};

/**
 * Format truck processing time for display
 */
export const formatProcessingTime = (startedAt?: string, completedAt?: string): string => {
  const processingTime = calculateProcessingHours(startedAt, completedAt);
  if (!processingTime) return 'Not started';
  
  // Additional safety check for negative or invalid values
  const hours = parseFloat(processingTime.totalHours);
  if (hours < 0 || isNaN(hours)) return 'Invalid time';
  
  return completedAt 
    ? `${processingTime.totalHours}h` 
    : `${processingTime.totalHours}h (ongoing)`;
};

/**
 * Get truck status badge variant
 */
export const getTruckStatusVariant = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return 'default';
    case 'ARRIVED':
      return 'secondary';
    case 'IN_PROGRESS':
      return 'default';
    case 'DONE':
      return 'outline';
    default:
      return 'default';
  }
};