import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckInStatus } from '@/hooks/useCheckInStatus';
import { useWorkSchedule } from '@/hooks/useWorkSchedule';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/dateUtils';
import { formatHoursDisplay, formatHoursToTime } from '@/lib/timeUtils';
import { OvertimeWarning } from '@/components/time/OvertimeWarning';

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
  approved_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export const TimeTracking: React.FC = () => {
  const { user, checkIn, checkOut } = useAuth();
  const { isCheckedIn, currentEntry, refreshStatus } = useCheckInStatus();
  const { isWorkingDay, isHoliday, getHolidayName, isWeekend } = useWorkSchedule();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const fetchTimeEntries = async () => {
    if (!user?.id) return;
    
    try {
      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id);

      // Apply date filter if selectedDate is valid
      if (selectedDate && selectedDate.includes('/')) {
        const [day, month, year] = selectedDate.split('/');
        if (day && month && year && year.length === 4) {
          const filterDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const nextDay = new Date(filterDate);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextDayString = nextDay.toISOString().split('T')[0];
          
          query = query
            .gte('check_in_time', `${filterDate}T00:00:00.000Z`)
            .lt('check_in_time', `${nextDayString}T00:00:00.000Z`);
        }
      }

      const { data, error } = await query
        .order('check_in_time', { ascending: false })
        .limit(50);

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
  }, [user?.id, selectedDate]);

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
          ? `You're checking in on ${getHolidayName(now)}. All hours will be overtime.`
          : todayIsWeekend 
          ? 'You\'re checking in on a weekend. All hours will be overtime.'
          : 'You\'re checking in on a non-working day. All hours will be overtime.';
        
        toast({
          title: "Overtime Warning",
          description: warningMessage,
          variant: "default",
        });
      }
      
      await checkIn();
      await Promise.all([refreshData(), refreshStatus()]);
      toast({
        title: "Checked In",
        description: `Welcome! You checked in at ${getCurrentTime()}`,
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
        title: "Checked Out",
        description: `See you tomorrow! You checked out at ${getCurrentTime()}`,
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
    return new Date().toLocaleTimeString('en-GB', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateHours = (entry: TimeEntry) => {
    // Use database-calculated values if available, otherwise calculate
    if (entry.total_hours !== undefined) {
      return {
        total: entry.total_hours,
        regular: entry.regular_hours,
        overtime: entry.overtime_hours
      };
    }
    
    // Fallback calculation for legacy entries
    const checkIn = new Date(entry.check_in_time);
    const checkOut = entry.check_out_time ? new Date(entry.check_out_time) : new Date();
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    
    const dayOfWeek = checkIn.getDay();
    let regularHours = 0;
    let overtimeHours = 0;
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      regularHours = Math.min(hours, 8);
      overtimeHours = Math.max(0, hours - 8);
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

  const getWeeklySummary = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.check_in_time);
      return entryDate >= oneWeekAgo && entry.check_out_time; // Only completed entries
    });

    let totalRegular = 0;
    let totalOvertime = 0;

    weeklyEntries.forEach(entry => {
      const hours = calculateHours(entry);
      totalRegular += hours.regular;
      totalOvertime += hours.overtime;
    });

    return {
      regular: Math.round(totalRegular),
      overtime: Math.round(totalOvertime),
      total: Math.round(totalRegular + totalOvertime)
    };
  };

  const workingTime = getWorkingTime();
  const weeklySummary = getWeeklySummary();

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Time Tracking</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Track work hours and manage overtime
        </p>
      </div>

      {/* Current Status */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getCurrentTime()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={workingTime.checkedIn ? 'default' : 'secondary'}>
                {workingTime.checkedIn ? 'Checked In' : 'Checked Out'}
              </Badge>
              {workingTime.checkedIn && (
                <span className="text-sm text-muted-foreground">
                  since {workingTime.checkInTime}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingTime.currentHours}</div>
            <p className="text-xs text-muted-foreground">regular time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overtime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {workingTime.overtimeHours}
            </div>
            <p className="text-xs text-muted-foreground">beyond 08:00-17:00</p>
          </CardContent>
        </Card>
      </div>

      {/* Overtime Warning */}
      <OvertimeWarning
        isWeekend={workingTime.isWeekend}
        isHoliday={workingTime.isHoliday}
        holidayName={workingTime.holidayName}
        currentHours={workingTime.totalHours}
        overtimeHours={workingTime.overtimeHoursNum}
      />

      {/* Time Clock Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Time Clock</CardTitle>
          <CardDescription>
            Record your check-in and check-out times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Button
              onClick={handleCheckIn}
              disabled={isCheckedIn || isLoading || isCheckingIn}
              className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {isCheckingIn ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                "Check In"
              )}
            </Button>
            <Button 
              onClick={handleCheckOut}
              disabled={!isCheckedIn || isLoading || isCheckingOut}
              variant="outline"
              className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {isCheckingOut ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                "Check Out"
              )}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>• Standard hours: Monday-Friday 09:00 - 17:00 (8 hours)</p>
            <p>• Weekend work is automatically overtime</p>
            <p>• Holiday work requires approval</p>
            <p>• All times are recorded in 24-hour format</p>
          </div>
        </CardContent>
      </Card>

      {/* Time Log History */}
      <Card>
        <CardHeader>
          <CardTitle>Time Log History</CardTitle>
          <CardDescription>
            View your recent time entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="date-filter">Filter by date (DD/MM/YYYY):</Label>
              <Input
                id="date-filter"
                type="text"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="12/06/2025"
                pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$"
                title="Please enter date in DD/MM/YYYY format"
                className="w-auto"
              />
            </div>

            {/* Mobile: Card Layout */}
            <div className="block sm:hidden space-y-3">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : timeEntries.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No time entries found
                </div>
              ) : (
                timeEntries.map((entry) => {
                  const hours = calculateHours(entry);
                  return (
                    <div key={entry.id} className="border rounded-lg p-4 bg-card">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">Date:</span>
                          <div className="flex items-center space-x-2">
                            <span>{formatDate(entry.check_in_time)}</span>
                            {entry.is_weekend && (
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">Weekend</Badge>
                            )}
                            {entry.is_holiday && (
                              <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">Holiday</Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Status:</span>
                          <div className="flex items-center space-x-2">
                            <span>{entry.check_out_time ? 'Complete' : 'Working'}</span>
                            {entry.approval_status === 'pending' && (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">Pending Approval</Badge>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">In:</span>
                          <div>{formatTime(entry.check_in_time)}</div>
                        </div>
                        <div>
                          <span className="font-medium text-muted-foreground">Out:</span>
                          <div>{entry.check_out_time ? formatTime(entry.check_out_time) : '-'}</div>
                        </div>
                         <div>
                           <span className="font-medium text-muted-foreground">Regular:</span>
                           <div>{formatHoursDisplay(hours.regular)}</div>
                         </div>
                         <div>
                           <span className="font-medium text-muted-foreground">Overtime:</span>
                           <div className={hours.overtime > 0 ? "text-orange-600 font-medium" : ""}>
                             {formatHoursDisplay(hours.overtime)}
                             {entry.overtime_reason && entry.overtime_reason.length > 0 && (
                               <span className="ml-1 text-xs text-muted-foreground">
                                 ({entry.overtime_reason.join(', ')})
                               </span>
                             )}
                           </div>
                         </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Regular</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : timeEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No time entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    timeEntries.map((entry) => {
                      const hours = calculateHours(entry);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <span>{formatDate(entry.check_in_time)}</span>
                              {entry.is_weekend && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">Weekend</Badge>
                              )}
                              {entry.is_holiday && (
                                <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">Holiday</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatTime(entry.check_in_time)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span>{entry.check_out_time ? formatTime(entry.check_out_time) : 'Working'}</span>
                              {entry.approval_status === 'pending' && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>
                              )}
                            </div>
                          </TableCell>
                           <TableCell>{formatHoursDisplay(hours.regular)}</TableCell>
                           <TableCell>
                             {hours.overtime > 0 ? (
                               <div className="flex items-center space-x-1">
                                 <span className="text-orange-600 font-medium">
                                   {formatHoursDisplay(hours.overtime)}
                                 </span>
                                 {entry.overtime_reason && entry.overtime_reason.length > 0 && (
                                   <span className="text-xs text-muted-foreground">
                                     ({entry.overtime_reason.join(', ')})
                                   </span>
                                 )}
                               </div>
                             ) : (
                               '0 min'
                             )}
                           </TableCell>
                          <TableCell>
                            {entry.approval_status === 'approved' ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">Approved</Badge>
                            ) : entry.approval_status === 'rejected' ? (
                              <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>
                            ) : entry.approval_status === 'pending' ? (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Summary</CardTitle>
          <CardDescription>
            Hours breakdown for current week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatHoursDisplay(weeklySummary.regular)}</div>
              <p className="text-sm text-muted-foreground">Regular Hours</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{formatHoursDisplay(weeklySummary.overtime)}</div>
              <p className="text-sm text-muted-foreground">Overtime Hours</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatHoursDisplay(weeklySummary.total)}</div>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};