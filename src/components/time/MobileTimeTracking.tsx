import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckInStatus } from '@/hooks/useCheckInStatus';
import { useWorkSchedule } from '@/hooks/useWorkSchedule';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/dateUtils';
import { formatHoursDisplay, formatHoursToTime } from '@/lib/timeUtils';
import { Clock, Timer, PlayCircle, StopCircle, RefreshCw } from 'lucide-react';

interface TimeEntry {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time: string | null;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  is_weekend: boolean;
  is_holiday: boolean;
  overtime_reason: string[];
  approval_status: string;
  created_at: string;
}

export const MobileTimeTracking: React.FC = () => {
  const { user, checkIn, checkOut } = useAuth();
  const { isCheckedIn, currentEntry, refreshStatus } = useCheckInStatus();
  const { isWorkingDay, isHoliday, getHolidayName, isWeekend } = useWorkSchedule();
  const { toast } = useToast();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchTimeEntries = async () => {
    if (!user?.id) return;
    
    try {
      // Get today's entries only for mobile
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const tomorrowString = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in_time', `${todayString}T00:00:00.000Z`)
        .lt('check_in_time', `${tomorrowString}T00:00:00.000Z`)
        .order('check_in_time', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchTimeEntries().finally(() => {
        setIsLoading(false);
      });
    }
  }, [user?.id]);

  const refreshData = async () => {
    await fetchTimeEntries();
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const now = new Date();
      const todayIsWorkingDay = isWorkingDay(now);
      const todayIsHoliday = isHoliday(now);
      const todayIsWeekend = isWeekend(now);
      
      // Show warning for non-working days
      if (!todayIsWorkingDay || todayIsHoliday || todayIsWeekend) {
        const warningMessage = todayIsHoliday 
          ? `Working on ${getHolidayName(now)} - all hours will be overtime`
          : todayIsWeekend 
          ? 'Working on weekend - all hours will be overtime'
          : 'Working on non-working day - all hours will be overtime';
        
        toast({
          title: "Overtime Notice",
          description: warningMessage,
          variant: "default",
        });
      }
      
      await checkIn();
      await Promise.all([refreshData(), refreshStatus()]);
      toast({
        title: "Checked In ✅",
        description: `Welcome! Time: ${getCurrentTime()}`,
      });
    } catch (error: any) {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    try {
      await checkOut();
      await Promise.all([refreshData(), refreshStatus()]);
      toast({
        title: "Checked Out ✅",
        description: `See you tomorrow! Time: ${getCurrentTime()}`,
      });
    } catch (error: any) {
      toast({
        title: "Check-out Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const getCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-GB', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateHours = (entry: TimeEntry) => {
    if (entry.total_hours !== undefined) {
      return {
        total: entry.total_hours,
        regular: entry.regular_hours,
        overtime: entry.overtime_hours
      };
    }
    
    const checkIn = new Date(entry.check_in_time);
    const checkOut = entry.check_out_time ? new Date(entry.check_out_time) : new Date();
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    
    const dayOfWeek = checkIn.getDay();
    let regularHours = 0;
    let overtimeHours = 0;
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      regularHours = Math.min(hours, 9);
      overtimeHours = Math.max(0, hours - 9);
    } else {
      overtimeHours = hours;
    }
    
    return {
      total: hours,
      regular: regularHours,
      overtime: overtimeHours
    };
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWorkingTime = () => {
    if (!currentEntry) {
      return {
        checkedIn: false,
        checkInTime: '',
        currentHours: '0:00',
        overtimeHours: '0 min',
        isWeekend: false,
        isHoliday: false,
        holidayName: null,
        totalHours: 0,
        overtimeHoursNum: 0
      };
    }

    const hours = calculateHours(currentEntry);
    const checkInDate = new Date(currentEntry.check_in_time);

    return {
      checkedIn: isCheckedIn,
      checkInTime: formatTime(currentEntry.check_in_time),
      currentHours: formatHoursToTime(hours.regular),
      overtimeHours: formatHoursDisplay(hours.overtime),
      isWeekend: currentEntry.is_weekend ?? isWeekend(checkInDate),
      isHoliday: currentEntry.is_holiday ?? isHoliday(checkInDate),
      holidayName: getHolidayName(checkInDate),
      totalHours: hours.total,
      overtimeHoursNum: hours.overtime
    };
  };

  const workingTime = getWorkingTime();

  return (
    <div className="space-y-4 p-1">
      {/* Current Time & Status */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-xl font-bold text-blue-900">{getCurrentTime()}</div>
            <p className="text-xs text-blue-700">Current Time</p>
          </CardContent>
        </Card>

        <Card className={`${workingTime.checkedIn 
          ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' 
          : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'}`}>
          <CardContent className="p-4 text-center">
            {workingTime.checkedIn ? (
              <Timer className="w-6 h-6 mx-auto mb-2 text-green-600" />
            ) : (
              <StopCircle className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            )}
            <Badge 
              variant={workingTime.checkedIn ? 'default' : 'secondary'}
              className="mb-1"
            >
              {workingTime.checkedIn ? 'Working' : 'Off Duty'}
            </Badge>
            {workingTime.checkedIn && (
              <p className="text-xs text-green-700">since {workingTime.checkInTime}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Hours */}
      {workingTime.checkedIn && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-blue-600">{workingTime.currentHours}</div>
              <p className="text-xs text-muted-foreground">Regular Hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-orange-600">{workingTime.overtimeHours}</div>
              <p className="text-xs text-muted-foreground">Overtime</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Working Day Status */}
      {workingTime.checkedIn && (workingTime.isWeekend || workingTime.isHoliday) && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                {workingTime.isHoliday ? 'Holiday' : 'Weekend'}
              </Badge>
              <span className="text-sm text-orange-700">
                {workingTime.isHoliday && workingTime.holidayName 
                  ? workingTime.holidayName 
                  : 'All hours count as overtime'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Clock Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Time Clock</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCheckIn}
              disabled={isCheckedIn || isLoading || isCheckingIn}
              className="h-12 flex flex-col items-center justify-center space-y-1"
              size="lg"
            >
              {isCheckingIn ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  <span className="text-xs">Check In</span>
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleCheckOut}
              disabled={!isCheckedIn || isLoading || isCheckingOut}
              variant="outline"
              className="h-12 flex flex-col items-center justify-center space-y-1"
              size="lg"
            >
              {isCheckingOut ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <StopCircle className="w-5 h-5" />
                  <span className="text-xs">Check Out</span>
                </>
              )}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <p>• Standard: Mon-Fri 08:00-17:00 (9h)</p>
            <p>• Weekend/Holiday work = overtime</p>
          </div>
        </CardContent>
      </Card>

      {/* Today's Entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Today's Time Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No entries for today
            </div>
          ) : (
            <div className="space-y-3">
              {timeEntries.map((entry) => {
                const hours = calculateHours(entry);
                return (
                  <div key={entry.id} className="bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {formatTime(entry.check_in_time)}
                        </span>
                        <span className="text-sm text-muted-foreground">→</span>
                        <span className="text-sm font-medium">
                          {entry.check_out_time ? formatTime(entry.check_out_time) : 'Working...'}
                        </span>
                      </div>
                      {entry.approval_status === 'pending' && hours.overtime > 0 && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">
                          Pending
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Regular: </span>
                        <span className="font-medium">{formatHoursDisplay(hours.regular)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Overtime: </span>
                        <span className={`font-medium ${hours.overtime > 0 ? 'text-orange-600' : ''}`}>
                          {formatHoursDisplay(hours.overtime)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};