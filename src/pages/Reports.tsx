import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch time entries
      const { data: timeData, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          *,
          profiles!inner(display_name, email)
        `);
      
      if (timeError) throw timeError;
      setTimeEntries(timeData || []);

      // Fetch trucks
      const { data: truckData, error: truckError } = await supabase
        .from('trucks')
        .select('*');
      
      if (truckError) throw truckError;
      setTrucks(truckData || []);

      // Fetch users (profiles with warehouse staff role)
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          email,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'WAREHOUSE_STAFF');
      
      if (userError) throw userError;
      setUsers(userData || []);

      // Fetch tasks
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*');
      
      if (taskError) throw taskError;
      setTasks(taskData || []);

    } catch (error: any) {
      toast({
        title: 'Error fetching data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToXLSX = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Please select a date range with data',
        variant: 'destructive',
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Report exported',
      description: `${filename} has been downloaded as Excel file`,
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
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.regular_hours || 0) + (entry.overtime_hours || 0), 0);
    const totalOvertime = timeEntries.reduce((sum, entry) => sum + (entry.overtime_hours || 0), 0);
    const totalTrucks = trucks.filter(truck => truck.status === 'DONE').length;
    const totalTasks = tasks.filter(task => task.status === 'COMPLETED').length;

    return {
      totalHours: totalHours.toFixed(1),
      totalOvertime: totalOvertime.toFixed(1),
      totalTrucks,
      totalTasks
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
                  <SelectItem value="all">All users</SelectItem>
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
                      exportToXLSX(timeEntries.map(entry => ({
                        userName: entry.profiles?.display_name || entry.profiles?.email,
                        date: new Date(entry.check_in_time).toLocaleDateString(),
                        checkIn: new Date(entry.check_in_time).toLocaleTimeString(),
                        checkOut: entry.check_out_time ? new Date(entry.check_out_time).toLocaleTimeString() : 'Not checked out',
                        regularHours: entry.regular_hours || 0,
                        overtimeHours: entry.overtime_hours || 0,
                        totalHours: (entry.regular_hours || 0) + (entry.overtime_hours || 0)
                      })), 'time_logs');
                    } else if (reportType === 'truck_activity') {
                      exportToXLSX(trucks.map(truck => ({
                        licensePlate: truck.license_plate,
                        arrivalDate: truck.arrival_date,
                        arrivalTime: truck.arrival_time,
                        rampNumber: truck.ramp_number,
                        palletCount: truck.pallet_count,
                        status: truck.status,
                        assignedStaff: truck.assigned_staff_name,
                        cargoDescription: truck.cargo_description
                      })), 'truck_activity');
                    }
                  }}
                  disabled={!reportType}
                >
                  Export Excel
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
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTasks}</div>
            <p className="text-xs text-muted-foreground">Tasks completed</p>
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
            {loading ? (
              <div>Loading time entries...</div>
            ) : timeEntries.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No time entries found
              </div>
            ) : (
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
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.profiles?.display_name || entry.profiles?.email || 'Unknown'}
                      </TableCell>
                      <TableCell>{new Date(entry.check_in_time).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(entry.check_in_time).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        {entry.check_out_time ? new Date(entry.check_out_time).toLocaleTimeString() : 'Not checked out'}
                      </TableCell>
                      <TableCell>{(entry.regular_hours || 0).toFixed(1)}h</TableCell>
                      <TableCell>
                        {(entry.overtime_hours || 0) > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {(entry.overtime_hours || 0).toFixed(1)}h
                          </span>
                        ) : (
                          '0h'
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {((entry.regular_hours || 0) + (entry.overtime_hours || 0)).toFixed(1)}h
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
            {loading ? (
              <div>Loading truck data...</div>
            ) : trucks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No truck data found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Arrival Date</TableHead>
                    <TableHead>Arrival Time</TableHead>
                    <TableHead>Ramp</TableHead>
                    <TableHead>Pallets</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Assigned Staff</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trucks.map((truck) => (
                    <TableRow key={truck.id}>
                      <TableCell className="font-medium">{truck.license_plate}</TableCell>
                      <TableCell>{truck.arrival_date}</TableCell>
                      <TableCell>{truck.arrival_time}</TableCell>
                      <TableCell>{truck.ramp_number ? `Ramp ${truck.ramp_number}` : 'Not assigned'}</TableCell>
                      <TableCell>{truck.pallet_count}</TableCell>
                      <TableCell>{truck.cargo_description}</TableCell>
                      <TableCell>{truck.assigned_staff_name || 'Unassigned'}</TableCell>
                      <TableCell>
                        <span className={truck.status === 'DONE' ? 'text-green-600' : 'text-orange-600'}>
                          {truck.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
              onClick={() => exportToXLSX(timeEntries.map(entry => ({
                userName: entry.profiles?.display_name || entry.profiles?.email,
                date: new Date(entry.check_in_time).toLocaleDateString(),
                checkIn: new Date(entry.check_in_time).toLocaleTimeString(),
                checkOut: entry.check_out_time ? new Date(entry.check_out_time).toLocaleTimeString() : 'Not checked out',
                regularHours: entry.regular_hours || 0,
                overtimeHours: entry.overtime_hours || 0,
                totalHours: (entry.regular_hours || 0) + (entry.overtime_hours || 0)
              })), 'daily_time_report')}
            >
              Export Today's Time Report
            </Button>
            <Button 
              variant="outline"
              onClick={() => exportToXLSX(trucks.map(truck => ({
                licensePlate: truck.license_plate,
                arrivalDate: truck.arrival_date,
                arrivalTime: truck.arrival_time,
                rampNumber: truck.ramp_number,
                palletCount: truck.pallet_count,
                status: truck.status,
                assignedStaff: truck.assigned_staff_name,
                cargoDescription: truck.cargo_description
              })), 'daily_truck_report')}
            >
              Export Today's Truck Report
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const summaryData = [{
                  date: new Date().toISOString().split('T')[0],
                  totalHours: summary.totalHours,
                  overtimeHours: summary.totalOvertime,
                  trucksProcessed: summary.totalTrucks,
                  completedTasks: summary.totalTasks
                }];
                exportToXLSX(summaryData, 'daily_summary');
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