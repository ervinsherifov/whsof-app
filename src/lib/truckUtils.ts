import { formatHoursDisplay } from './timeUtils';
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
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  
  return {
    hours: Math.floor(hours),
    minutes: totalMinutes, // Total minutes for use when hours < 1
    rawHours: hours, // Raw hours as number for calculations
    totalHours: formatHoursDisplay(hours)
  };
};

/**
 * Format truck processing time for display
 */
export const formatProcessingTime = (startedAt?: string, completedAt?: string): string => {
  const processingTime = calculateProcessingHours(startedAt, completedAt);
  if (!processingTime) return 'Not started';
  
  // Use the raw hours value instead of parsing the formatted string
  const hours = processingTime.rawHours;
  if (hours < 0 || isNaN(hours)) return 'Invalid time';
  
  // Show minutes if less than 1 hour, otherwise show hours
  if (hours < 1) {
    const minutes = Math.floor(hours * 60);
    return completedAt 
      ? `${minutes}min` 
      : `${minutes}min (ongoing)`;
  } else {
    return completedAt 
      ? formatHoursDisplay(hours)
      : `${formatHoursDisplay(hours)} (ongoing)`;
  }
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