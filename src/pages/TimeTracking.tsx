import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const TimeTracking: React.FC = () => {
  const { user, checkIn, checkOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Mock time log data
  const timeLogs = [
    {
      id: '1',
      date: '2024-06-07',
      checkIn: '08:00',
      checkOut: '17:15',
      regularHours: 8,
      overtimeHours: 1.25,
      notes: 'Truck unloading overtime'
    },
    {
      id: '2',
      date: '2024-06-06',
      checkIn: '08:05',
      checkOut: '17:00',
      regularHours: 8,
      overtimeHours: 0,
      notes: ''
    },
    {
      id: '3',
      date: '2024-06-05',
      checkIn: '07:45',
      checkOut: '18:30',
      regularHours: 8,
      overtimeHours: 2.75,
      notes: 'Emergency shipment processing'
    }
  ];

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWorkingTime = () => {
    // Mock calculation
    return {
      checkedIn: true,
      checkInTime: '08:15',
      currentHours: '8:45',
      overtimeHours: '0:45'
    };
  };

  const workingTime = getWorkingTime();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Time Tracking</h1>
        <p className="text-muted-foreground">
          Track work hours and manage overtime
        </p>
      </div>

      {/* Current Status */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
          <div className="flex space-x-4">
            <Button 
              onClick={checkIn}
              disabled={workingTime.checkedIn}
              className="flex-1"
            >
              Check In
            </Button>
            <Button 
              onClick={checkOut}
              disabled={!workingTime.checkedIn}
              variant="outline"
              className="flex-1"
            >
              Check Out
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

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Regular Hours</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {new Date(log.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{log.checkIn}</TableCell>
                    <TableCell>{log.checkOut}</TableCell>
                    <TableCell>{log.regularHours}h</TableCell>
                    <TableCell>
                      {log.overtimeHours > 0 ? (
                        <span className="text-orange-600 font-medium">
                          {log.overtimeHours}h
                        </span>
                      ) : (
                        '0h'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold">32</div>
              <p className="text-sm text-muted-foreground">Regular Hours</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">4</div>
              <p className="text-sm text-muted-foreground">Overtime Hours</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">36</div>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};