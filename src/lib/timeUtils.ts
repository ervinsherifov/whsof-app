/**
 * Format hours into a user-friendly display
 * - Less than 1 hour: shows minutes (e.g., "18 min", "45 min")
 * - 1+ hours: shows hours and minutes (e.g., "2h 15m", "5h 24m")
 * - Zero: shows "0 min"
 */
export const formatHoursDisplay = (hours: number): string => {
  if (hours === 0) return "0 min";
  
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  
  const wholeHours = Math.floor(hours);
  const remainingMinutes = Math.round((hours - wholeHours) * 60);
  
  if (remainingMinutes === 0) {
    return `${wholeHours}h`;
  }
  
  return `${wholeHours}h ${remainingMinutes}m`;
};

/**
 * Format time duration from hours into HH:MM format
 * - Always shows hours:minutes (e.g., "0:18", "2:15", "5:24")
 */
export const formatHoursToTime = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Get a human-readable overtime description with context
 */
/**
 * Format total hours for display in KPI cards
 * Same as formatHoursDisplay but with alias for clarity
 */
export const formatTotalHours = formatHoursDisplay;

/**
 * Get a human-readable overtime description with context
 */
export const getOvertimeDescription = (
  overtimeHours: number, 
  isWeekend: boolean, 
  isHoliday: boolean,
  holidayName?: string | null
): string => {
  const formattedTime = formatHoursDisplay(overtimeHours);
  
  if (overtimeHours === 0) return "";
  
  if (isHoliday && holidayName) {
    return `${formattedTime} overtime (${holidayName})`;
  }
  
  if (isWeekend) {
    return `${formattedTime} overtime (Weekend)`;
  }
  
  return `${formattedTime} overtime`;
};