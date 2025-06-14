// This hook is now refactored into smaller, focused hooks
// Import the new hooks instead:
// - useKPIMetrics for main KPI metrics
// - useUserKPIData for user performance data  
// - useExceptionData for exception handling

export { useKPIMetrics } from './useKPIMetrics';
export { useUserKPIData } from './useUserKPIData';
export { useExceptionData } from './useExceptionData';