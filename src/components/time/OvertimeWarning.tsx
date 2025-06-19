import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatHoursDisplay } from '@/lib/timeUtils';

interface OvertimeWarningProps {
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string | null;
  currentHours: number;
  overtimeHours: number;
}

export const OvertimeWarning: React.FC<OvertimeWarningProps> = ({
  isWeekend,
  isHoliday,
  holidayName,
  currentHours,
  overtimeHours
}) => {
  if (!isWeekend && !isHoliday && overtimeHours === 0) {
    return null;
  }

  const getWarningMessage = () => {
    if (isHoliday) {
      return `You're working on ${holidayName}. All hours will be counted as overtime and require approval.`;
    }
    if (isWeekend) {
      return 'You\'re working on a weekend. All hours will be counted as overtime and require approval.';
    }
    if (overtimeHours > 0) {
      return `You've worked ${formatHoursDisplay(currentHours)} today. ${formatHoursDisplay(overtimeHours)} are overtime.`;
    }
    return '';
  };

  const getWarningType = () => {
    if (isHoliday || isWeekend) return 'warning';
    return 'info';
  };

  return (
    <Alert className={`${getWarningType() === 'warning' ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{getWarningMessage()}</span>
        <div className="flex items-center space-x-2">
          {isHoliday && (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              <Calendar className="h-3 w-3 mr-1" />
              Holiday
            </Badge>
          )}
          {isWeekend && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
              <Clock className="h-3 w-3 mr-1" />
              Weekend
            </Badge>
          )}
          {overtimeHours > 0 && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              <Clock className="h-3 w-3 mr-1" />
              {formatHoursDisplay(overtimeHours)} OT
            </Badge>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};