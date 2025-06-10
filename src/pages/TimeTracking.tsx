import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckInStatus } from '@/hooks/useCheckInStatus';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface TimeEntry {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time: string | null;
  created_at: string;
  updated_at: string;
}

export const TimeTracking: React.FC = () => {
  const { user, checkIn, checkOut } = useAuth();
  const { isCheckedIn, currentEntry, refreshStatus } = useCheckInStatus();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const fetchTimeEntries = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('check_in_time', { ascending: false })
        .limit(10);

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

  const calculateHours = (checkInTime: string, checkOutTime?: string | null) => {
    const checkIn = new Date(checkInTime);
    const checkOut = checkOutTime ? new Date(checkOutTime) : new Date();
    const diffMs = checkOut.getTime() - checkIn.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    
    // Check if it's weekend (Saturday = 6, Sunday = 0)
    const dayOfWeek = checkIn.getDay();
    
    let regularHours = 0;
    let overtimeHours = 0;
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Monday to Friday: 8 hours standard, rest is overtime
      const standardHours = 8;
      regularHours = Math.min(hours, standardHours);
      overtimeHours = Math.max(0, hours - standardHours);
    } else {
      // Saturday and Sunday: all hours are overtime
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
        overtimeHours: '0:00'
      };
    }

    const hours = calculateHours(currentEntry.check_in_time, currentEntry.check_out_time);
    const currentHours = Math.floor(hours.regular);
    const currentMinutes = Math.floor((hours.regular - currentHours) * 60);
    const overtimeHoursCalc = Math.floor(hours.overtime);
    const overtimeMinutes = Math.floor((hours.overtime - overtimeHoursCalc) * 60);

    return {
      checkedIn: isCheckedIn,
      checkInTime: formatTime(currentEntry.check_in_time),
      currentHours: `${currentHours}:${currentMinutes.toString().padStart(2, '0')}`,
      overtimeHours: `${overtimeHoursCalc}:${overtimeMinutes.toString().padStart(2, '0')}`
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
      const hours = calculateHours(entry.check_in_time, entry.check_out_time);
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
            <p>• Standard hours: 08:00 - 17:00 (8 hours)</p>
            <p>• Overtime applies for time outside standard hours</p>
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
              <Label htmlFor="date-filter">Filter by date:</Label>
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>

            <div className="w-full overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">Date</TableHead>
                    <TableHead className="min-w-[60px]">In</TableHead>
                    <TableHead className="min-w-[60px]">Out</TableHead>
                    <TableHead className="min-w-[70px]">Regular</TableHead>
                    <TableHead className="min-w-[70px]">Overtime</TableHead>
                    <TableHead className="min-w-[50px]">Notes</TableHead>
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
                      const hours = calculateHours(entry.check_in_time, entry.check_out_time);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            {new Date(entry.check_in_time).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">{formatTime(entry.check_in_time)}</TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {entry.check_out_time ? formatTime(entry.check_out_time) : 'Working'}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">{hours.regular.toFixed(1)}h</TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {hours.overtime > 0 ? (
                              <span className="text-orange-600 font-medium">
                                {hours.overtime.toFixed(1)}h
                              </span>
                            ) : (
                              '0h'
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-muted-foreground">
                            -
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
              <div className="text-2xl font-bold">{weeklySummary.regular}</div>
              <p className="text-sm text-muted-foreground">Regular Hours</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{weeklySummary.overtime}</div>
              <p className="text-sm text-muted-foreground">Overtime Hours</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{weeklySummary.total}</div>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};