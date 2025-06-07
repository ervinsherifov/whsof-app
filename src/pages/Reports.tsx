import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const { toast } = useToast();

  // Mock data for reports
  const timeLogData = [
    {
      id: '1',
      userName: 'John Smith',
      date: '2024-06-07',
      checkIn: '08:00',
      checkOut: '17:15',
      regularHours: 8.0,
      overtimeHours: 1.25,
      totalHours: 9.25
    },
    {
      id: '2',
      userName: 'Mike Johnson',
      date: '2024-06-07',
      checkIn: '08:05',
      checkOut: '17:00',
      regularHours: 8.0,
      overtimeHours: 0,
      totalHours: 8.0
    },
    {
      id: '3',
      userName: 'Sarah Wilson',
      date: '2024-06-07',
      checkIn: '07:45',
      checkOut: '18:30',
      regularHours: 8.0,
      overtimeHours: 2.75,
      totalHours: 10.75
    }
  ];

  const truckData = [
    {
      id: '1',
      licensePlate: 'ABC-123',
      arrivalTime: '09:30',
      departureTime: '11:15',
      rampNumber: 3,
      palletCount: 24,
      status: 'DONE',
      assignedStaff: 'John Smith',
      processingTime: '1:45'
    },
    {
      id: '2',
      licensePlate: 'XYZ-789',
      arrivalTime: '11:00',
      departureTime: '13:30',
      rampNumber: 8,
      palletCount: 18,
      status: 'DONE',
      assignedStaff: 'Mike Johnson',
      processingTime: '2:30'
    }
  ];

  const users = [
    { id: '1', name: 'John Smith' },
    { id: '2', name: 'Mike Johnson' },
    { id: '3', name: 'Sarah Wilson' },
    { id: '4', name: 'David Brown' },
    { id: '5', name: 'Lisa Davis' },
  ];

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Please select a date range with data',
        variant: 'destructive',
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(key => `"${row[key]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Report exported',
      description: `${filename} has been downloaded`,
    });
  };

  const generateReport = () => {
    if (!reportType) {
      toast({
        title: 'Please select report type',
        description: 'Choose the type of report to generate',
        variant: 'destructive',
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: 'Please select date range',
        description: 'Both start and end dates are required',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Report generated',
      description: `${reportType} report for ${startDate} to ${endDate}`,
    });
  };

  const getReportSummary = () => {
    const totalHours = timeLogData.reduce((sum, log) => sum + log.totalHours, 0);
    const totalOvertime = timeLogData.reduce((sum, log) => sum + log.overtimeHours, 0);
    const totalTrucks = truckData.length;
    const avgProcessingTime = truckData.reduce((sum, truck) => {
      const [hours, minutes] = truck.processingTime.split(':').map(Number);
      return sum + hours + (minutes / 60);
    }, 0) / truckData.length;

    return {
      totalHours: totalHours.toFixed(1),
      totalOvertime: totalOvertime.toFixed(1),
      totalTrucks,
      avgProcessingTime: `${Math.floor(avgProcessingTime)}:${Math.round((avgProcessingTime % 1) * 60).toString().padStart(2, '0')}`
    };
  };

  const summary = getReportSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Generate and export warehouse operation reports
        </p>
      </div>

      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>
            Select report parameters and export data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_logs">Time Logs</SelectItem>
                  <SelectItem value="truck_activity">Truck Activity</SelectItem>
                  <SelectItem value="task_summary">Task Summary</SelectItem>
                  <SelectItem value="productivity">Productivity Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selectedUser">Filter by User (Optional)</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex space-x-2">
                <Button onClick={generateReport} className="flex-1">
                  Generate
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (reportType === 'time_logs') {
                      exportToCSV(timeLogData, 'time_logs');
                    } else if (reportType === 'truck_activity') {
                      exportToCSV(truckData, 'truck_activity');
                    }
                  }}
                  disabled={!reportType}
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Hours Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalHours}</div>
            <p className="text-xs text-muted-foreground">All staff combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.totalOvertime}</div>
            <p className="text-xs text-muted-foreground">Beyond standard hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Trucks Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTrucks}</div>
            <p className="text-xs text-muted-foreground">Completed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgProcessingTime}</div>
            <p className="text-xs text-muted-foreground">Per truck</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Logs Report */}
      {(reportType === 'time_logs' || reportType === '') && (
        <Card>
          <CardHeader>
            <CardTitle>Time Logs Report</CardTitle>
            <CardDescription>
              Staff time tracking and overtime summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Regular Hours</TableHead>
                  <TableHead>Overtime Hours</TableHead>
                  <TableHead>Total Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeLogData.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.userName}</TableCell>
                    <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                    <TableCell>{log.checkIn}</TableCell>
                    <TableCell>{log.checkOut}</TableCell>
                    <TableCell>{log.regularHours.toFixed(1)}h</TableCell>
                    <TableCell>
                      {log.overtimeHours > 0 ? (
                        <span className="text-orange-600 font-medium">
                          {log.overtimeHours.toFixed(1)}h
                        </span>
                      ) : (
                        '0h'
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{log.totalHours.toFixed(1)}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Truck Activity Report */}
      {(reportType === 'truck_activity' || reportType === '') && (
        <Card>
          <CardHeader>
            <CardTitle>Truck Activity Report</CardTitle>
            <CardDescription>
              Truck processing times and efficiency metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Ramp</TableHead>
                  <TableHead>Pallets</TableHead>
                  <TableHead>Processing Time</TableHead>
                  <TableHead>Assigned Staff</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {truckData.map((truck) => (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">{truck.licensePlate}</TableCell>
                    <TableCell>{truck.arrivalTime}</TableCell>
                    <TableCell>{truck.departureTime}</TableCell>
                    <TableCell>Ramp {truck.rampNumber}</TableCell>
                    <TableCell>{truck.palletCount}</TableCell>
                    <TableCell className="font-medium">{truck.processingTime}</TableCell>
                    <TableCell>{truck.assignedStaff}</TableCell>
                    <TableCell>
                      <span className="text-green-600">{truck.status}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Quick Export Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export</CardTitle>
          <CardDescription>
            Export common reports with predefined settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={() => exportToCSV(timeLogData, 'daily_time_report')}
            >
              Export Today's Time Report
            </Button>
            <Button 
              variant="outline"
              onClick={() => exportToCSV(truckData, 'daily_truck_report')}
            >
              Export Today's Truck Report
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const combinedData = timeLogData.map(log => ({
                  ...log,
                  type: 'Time Log'
                }));
                exportToCSV(combinedData, 'weekly_summary');
              }}
            >
              Export Weekly Summary
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const summaryData = [{
                  date: new Date().toISOString().split('T')[0],
                  totalHours: summary.totalHours,
                  overtimeHours: summary.totalOvertime,
                  trucksProcessed: summary.totalTrucks,
                  avgProcessingTime: summary.avgProcessingTime
                }];
                exportToCSV(summaryData, 'daily_summary');
              }}
            >
              Export Daily Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};