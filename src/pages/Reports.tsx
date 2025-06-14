import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { Search, Download } from 'lucide-react';
import { formatDate, formatTime, getTodayISO } from '@/lib/dateUtils';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [completedTrucks, setCompletedTrucks] = useState<any[]>([]);
  const [truckSearchQuery, setTruckSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user has access to all reports (super admin) or limited access (office staff)
  const hasFullAccess = user?.role === 'SUPER_ADMIN';
  const hasOfficeAccess = user?.role === 'OFFICE_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch time entries and profiles separately
      const { data: timeData, error: timeError } = await supabase
        .from('time_entries')
        .select('*');
      
      if (timeError) throw timeError;

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email');
      
      if (profilesError) throw profilesError;

      // Join time entries with profiles data
      const timeEntriesWithProfiles = (timeData || []).map(entry => ({
        ...entry,
        profiles: profilesData?.find(profile => profile.user_id === entry.user_id) || null
      }));
      
      setTimeEntries(timeEntriesWithProfiles);

      // Fetch trucks
      const { data: truckData, error: truckError } = await supabase
        .from('trucks')
        .select('*');
      
      if (truckError) throw truckError;
      setTrucks(truckData || []);

      // Fetch users (profiles with warehouse staff role)
      // First get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'WAREHOUSE_STAFF');

      if (rolesError) throw rolesError;

      if (userRoles && userRoles.length > 0) {
        const userIds = userRoles.map(role => role.user_id);
        
        // Then get profiles for those users
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);

        if (userError) throw userError;
        setUsers(userData || []);
      } else {
        setUsers([]);
      }

      // Fetch tasks
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*');
      
      if (taskError) throw taskError;
      setTasks(taskData || []);

      // Fetch completed trucks separately to avoid foreign key conflicts
      const { data: completedTrucksData, error: completedTrucksError } = await supabase
        .from('trucks')
        .select('*')
        .eq('status', 'DONE')
        .order('updated_at', { ascending: false });
      
      if (completedTrucksError) throw completedTrucksError;

      let enrichedCompletedTrucks = completedTrucksData || [];

      // Fetch completion photos separately if we have trucks
      if (completedTrucksData && completedTrucksData.length > 0) {
        const truckIds = completedTrucksData.map(truck => truck.id);
        
        const { data: photosData } = await supabase
          .from('truck_completion_photos')
          .select('id, photo_url, created_at, truck_id')
          .in('truck_id', truckIds);

        // Attach photos to trucks
        enrichedCompletedTrucks = completedTrucksData.map(truck => ({
          ...truck,
          truck_completion_photos: photosData?.filter(photo => photo.truck_id === truck.id) || []
        }));
      }

      setCompletedTrucks(enrichedCompletedTrucks);

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
    link.setAttribute('download', `${filename}_${getTodayISO()}.xlsx`);
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

  const downloadPhoto = async (photoUrl: string, truckLicense: string, photoIndex: number) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${truckLicense}_photo_${photoIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Photo downloaded',
        description: `Photo for truck ${truckLicense} has been downloaded`,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Failed to download photo',
        variant: 'destructive',
      });
    }
  };

  const downloadAllPhotosForTruck = async (truck: any) => {
    if (!truck.truck_completion_photos || truck.truck_completion_photos.length === 0) {
      toast({
        title: 'No photos found',
        description: `No photos available for truck ${truck.license_plate}`,
        variant: 'destructive',
      });
      return;
    }

    for (let i = 0; i < truck.truck_completion_photos.length; i++) {
      await downloadPhoto(truck.truck_completion_photos[i].photo_url, truck.license_plate, i);
      // Add a small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
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

  const filteredCompletedTrucks = completedTrucks.filter(truck =>
    truck.license_plate.toLowerCase().includes(truckSearchQuery.toLowerCase())
  );

  const summary = getReportSummary();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <div className="max-w-7xl mx-auto space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-display text-3xl font-bold flex items-center gap-3">
              <Download className="h-8 w-8 text-primary" />
              Reports & Analytics
            </h1>
            <p className="text-caption mt-2">
              Generate comprehensive reports and export warehouse operation data
            </p>
          </div>
        </div>

      {/* Report Generation - Role-based access */}
      {hasOfficeAccess && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Generate Custom Reports
            </CardTitle>
            <CardDescription>
              Configure and export detailed warehouse operation reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-group">
                  <Label className="form-label">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="form-input">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {hasFullAccess && <SelectItem value="time_logs">📊 Time Logs</SelectItem>}
                      <SelectItem value="truck_activity">🚛 Truck Activity</SelectItem>
                      {hasOfficeAccess && <SelectItem value="task_management">📋 Task Management</SelectItem>}
                      {hasFullAccess && <SelectItem value="task_summary">📈 Task Summary</SelectItem>}
                      {hasFullAccess && <SelectItem value="productivity">⚡ Productivity Report</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-group">
                  <Label className="form-label">Filter by User</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="form-input">
                      <SelectValue placeholder="All users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">👥 All users</SelectItem>
                       {users.map((user) => (
                         <SelectItem key={user.user_id} value={user.user_id}>
                           👤 {user.display_name || user.email}
                         </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-group">
                  <Label className="form-label">Start Date</Label>
                  <Input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$"
                    title="Please enter date in DD/MM/YYYY format"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <Label className="form-label">End Date</Label>
                  <Input
                    type="text"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$"
                    title="Please enter date in DD/MM/YYYY format"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={generateReport} className="btn-primary flex-1">
                  <Search className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button
                  variant="outline" 
                  className="btn-outline flex-1"
                  onClick={() => {
                    if (reportType === 'time_logs') {
                      exportToXLSX(timeEntries.map(entry => ({
                        userName: entry.profiles?.display_name || entry.profiles?.email,
                        date: formatDate(entry.check_in_time),
                        checkIn: formatTime(entry.check_in_time),
                        checkOut: entry.check_out_time ? formatTime(entry.check_out_time) : 'Not checked out',
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
                        handledBy: truck.handled_by_user_id ? 'User ID: ' + truck.handled_by_user_id : '',
                        cargoDescription: truck.cargo_description
                      })), 'truck_activity');
                    } else if (reportType === 'task_management') {
                       exportToXLSX(tasks.map(task => ({
                         title: task.title,
                         description: task.description,
                         priority: task.priority,
                         status: task.status,
                         completedBy: task.status === 'COMPLETED' 
                           ? (task.completed_by_user_id ? 'User ID: ' + task.completed_by_user_id : 'Unknown') 
                           : (task.status === 'IN_PROGRESS' ? (task.assigned_to_name || 'Processing by unknown') : 'Not started'),
                         dueDate: task.due_date ? formatDate(task.due_date) : 'No deadline',
                         createdAt: formatDate(task.created_at),
                         completedAt: task.completed_at ? formatDate(task.completed_at) : '',
                         completionComment: task.completion_comment || ''
                       })), 'task_management');
                    }
                  }}
                  disabled={!reportType}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

        {/* Summary Statistics - Only for Super Admin */}
        {hasFullAccess && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="card-elevated h-32">
            <CardContent className="p-0 h-full flex flex-col justify-center items-center text-center">
              <div className="text-2xl font-bold font-mono text-success">{summary.totalHours}</div>
              <div className="text-overline mt-1">Total Hours Today</div>
              <div className="text-caption mt-2">All staff combined</div>
            </CardContent>
          </Card>

          <Card className="card-elevated h-32">
            <CardContent className="p-0 h-full flex flex-col justify-center items-center text-center">
              <div className="text-2xl font-bold font-mono text-warning">{summary.totalOvertime}</div>
              <div className="text-overline mt-1">Overtime Hours</div>
              <div className="text-caption mt-2">Beyond standard hours</div>
            </CardContent>
          </Card>

          <Card className="card-elevated h-32">
            <CardContent className="p-0 h-full flex flex-col justify-center items-center text-center">
              <div className="text-2xl font-bold font-mono text-primary">{summary.totalTrucks}</div>
              <div className="text-overline mt-1">Trucks Processed</div>
              <div className="text-caption mt-2">Completed today</div>
            </CardContent>
          </Card>

          <Card className="card-elevated h-32">
            <CardContent className="p-0 h-full flex flex-col justify-center items-center text-center">
              <div className="text-2xl font-bold font-mono text-success">{summary.totalTasks}</div>
              <div className="text-overline mt-1">Completed Tasks</div>
              <div className="text-caption mt-2">Tasks completed</div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Time Logs Report - Super Admin Only */}
      {hasFullAccess && (reportType === 'time_logs' || reportType === '') && (
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
              <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Regular</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.profiles?.display_name || entry.profiles?.email || 'Unknown'}
                        </TableCell>
                        <TableCell>{formatDate(entry.check_in_time)}</TableCell>
                        <TableCell>{formatTime(entry.check_in_time)}</TableCell>
                         <TableCell>
                           {entry.check_out_time ? formatTime(entry.check_out_time) : 
                            (!entry.check_out_time && formatDate(entry.check_in_time) === formatDate(new Date().toISOString()) ? 'Working' : 'Not completed')}
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
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {timeEntries.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">{entry.profiles?.display_name || entry.profiles?.email || 'Unknown'}</h3>
                          <p className="text-sm text-muted-foreground">{formatDate(entry.check_in_time)}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{((entry.regular_hours || 0) + (entry.overtime_hours || 0)).toFixed(1)}h</div>
                          <div className="text-sm text-muted-foreground">Total</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Check In</div>
                          <div>{formatTime(entry.check_in_time)}</div>
                        </div>
                         <div>
                           <div className="text-muted-foreground">Check Out</div>
                           <div>{entry.check_out_time ? formatTime(entry.check_out_time) : 
                            (!entry.check_out_time && formatDate(entry.check_in_time) === formatDate(new Date().toISOString()) ? 'Working' : 'Not completed')}</div>
                         </div>
                        <div>
                          <div className="text-muted-foreground">Regular Hours</div>
                          <div>{(entry.regular_hours || 0).toFixed(1)}h</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Overtime</div>
                          <div>
                            {(entry.overtime_hours || 0) > 0 ? (
                              <span className="text-orange-600 font-medium">
                                {(entry.overtime_hours || 0).toFixed(1)}h
                              </span>
                            ) : (
                              '0h'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Truck Activity Report - Office staff and Super Admin */}
      {hasOfficeAccess && (reportType === 'truck_activity' || reportType === '') && (
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
              <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                       <TableHead>Ramp</TableHead>
                       <TableHead>Processing</TableHead>
                       <TableHead>Pallets</TableHead>
                       <TableHead>Cargo</TableHead>
                       <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trucks.map((truck) => (
                      <TableRow key={truck.id}>
                        <TableCell className="font-medium">
                          {truck.license_plate}
                        </TableCell>
                        <TableCell>{formatDate(truck.arrival_date)}</TableCell>
                        <TableCell>{truck.arrival_time?.substring(0, 5)}</TableCell>
                        <TableCell>{truck.ramp_number ? `#${truck.ramp_number}` : 'N/A'}</TableCell>
                         <TableCell>
                           {(() => {
                             if (!truck.started_at) return 'Not started';
                             const start = new Date(truck.started_at);
                             const end = truck.completed_at ? new Date(truck.completed_at) : new Date();
                             const diffMs = end.getTime() - start.getTime();
                             const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
                             return truck.completed_at ? `${hours}h` : `${hours}h (ongoing)`;
                           })()}
                         </TableCell>
                         <TableCell>{truck.pallet_count}</TableCell>
                         <TableCell title={truck.cargo_description}>{truck.cargo_description}</TableCell>
                        <TableCell>
                          <span className={`${truck.status === 'DONE' ? 'text-green-600' : 'text-orange-600'}`}>
                            {truck.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {trucks.map((truck) => (
                  <Card key={truck.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">{truck.license_plate}</h3>
                          <p className="text-sm text-muted-foreground">{formatDate(truck.arrival_date)} • {truck.arrival_time?.substring(0, 5)}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-sm ${truck.status === 'DONE' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                          {truck.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Ramp</div>
                          <div>{truck.ramp_number ? `#${truck.ramp_number}` : 'N/A'}</div>
                        </div>
                         <div>
                           <div className="text-muted-foreground">Processing</div>
                           <div>
                             {(() => {
                               if (!truck.started_at) return 'Not started';
                               const start = new Date(truck.started_at);
                               const end = truck.completed_at ? new Date(truck.completed_at) : new Date();
                               const diffMs = end.getTime() - start.getTime();
                               const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
                               return truck.completed_at ? `${hours}h` : `${hours}h (ongoing)`;
                             })()}
                           </div>
                         </div>
                         <div>
                           <div className="text-muted-foreground">Pallets</div>
                           <div>{truck.pallet_count}</div>
                         </div>
                         <div className="col-span-2">
                           <div className="text-muted-foreground">Cargo Description</div>
                           <div>{truck.cargo_description}</div>
                         </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Management Report - Office staff and Super Admin */}
      {hasOfficeAccess && (reportType === 'task_management' || reportType === '') && (
        <Card>
          <CardHeader>
            <CardTitle>Task Management Report</CardTitle>
            <CardDescription>
              Task completion status and performance tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading task data...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No task data found
              </div>
            ) : (
              <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completed By</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Done</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium" title={task.title}>
                          {task.title}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${
                            task.priority === 'URGENT' ? 'text-red-600' :
                            task.priority === 'HIGH' ? 'text-orange-600' :
                            task.priority === 'MEDIUM' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {task.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs ${
                            task.status === 'COMPLETED' ? 'text-green-600' :
                            task.status === 'IN_PROGRESS' ? 'text-blue-600' :
                            'text-gray-600'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                         <TableCell>
                           {task.status === 'COMPLETED' 
                             ? (task.completed_by_user_id ? `User ID: ${task.completed_by_user_id}` : 'Unknown') 
                             : (task.status === 'IN_PROGRESS' ? (task.assigned_to_name || 'Processing by unknown') : 'Not started')}
                         </TableCell>
                        <TableCell>
                          {task.due_date ? formatDate(task.due_date) : 'No deadline'}
                        </TableCell>
                        <TableCell>{formatDate(task.created_at)}</TableCell>
                        <TableCell>
                          {task.completed_at ? formatDate(task.completed_at) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg" title={task.title}>{task.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              task.priority === 'URGENT' ? 'bg-red-100 text-red-600' :
                              task.priority === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                              task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {task.priority}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              task.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                              task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                         <div>
                           <div className="text-muted-foreground">
                             {task.status === 'COMPLETED' ? 'Completed By' : 'Processing By'}
                           </div>
                           <div>
                             {task.status === 'COMPLETED' 
                               ? (task.completed_by_user_id ? `User ID: ${task.completed_by_user_id}` : 'Unknown') 
                               : (task.status === 'IN_PROGRESS' ? (task.assigned_to_name || 'Processing by unknown') : 'Not started')}
                           </div>
                         </div>
                        <div>
                          <div className="text-muted-foreground">Due Date</div>
                          <div>{task.due_date ? formatDate(task.due_date) : 'No deadline'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Created</div>
                          <div>{formatDate(task.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Completed</div>
                          <div>{task.completed_at ? formatDate(task.completed_at) : '—'}</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Export Buttons - Role-based */}
      {hasOfficeAccess && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Export</CardTitle>
            <CardDescription>
              Export common reports with predefined settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              {hasFullAccess && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs"
                  onClick={() => exportToXLSX(timeEntries.map(entry => ({
                    userName: entry.profiles?.display_name || entry.profiles?.email,
                    date: formatDate(entry.check_in_time),
                    checkIn: new Date(entry.check_in_time).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    checkOut: entry.check_out_time ? new Date(entry.check_out_time).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' }) : 'Not checked out',
                    regularHours: entry.regular_hours || 0,
                    overtimeHours: entry.overtime_hours || 0,
                    totalHours: (entry.regular_hours || 0) + (entry.overtime_hours || 0)
                  })), 'daily_time_report')}
                >
                  Export Time Report
                </Button>
              )}
              <Button 
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs"
                onClick={() => exportToXLSX(trucks.map(truck => ({
                  licensePlate: truck.license_plate,
                  arrivalDate: truck.arrival_date,
                  arrivalTime: truck.arrival_time,
                  rampNumber: truck.ramp_number,
                  palletCount: truck.pallet_count,
                  status: truck.status,
                  cargoDescription: truck.cargo_description
                })), 'daily_truck_report')}
              >
                Export Truck Report
              </Button>
              {hasFullAccess && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs"
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
                  Export Summary
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

        {/* Completed Trucks with Photos - Office staff and Super Admin */}
        {hasOfficeAccess && (
          <Card>
        <CardHeader>
          <CardTitle>Completed Trucks with Photos</CardTitle>
          <CardDescription>
            View and export photos from completed truck operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             {/* Search */}
             <div className="flex items-center space-x-2">
               <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
               <Input
                 placeholder="Search by license plate..."
                 value={truckSearchQuery}
                 onChange={(e) => setTruckSearchQuery(e.target.value)}
                 className="w-full"
               />
             </div>

            {loading ? (
              <div>Loading completed trucks...</div>
            ) : filteredCompletedTrucks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {truckSearchQuery ? 'No trucks found matching your search' : 'No completed trucks found'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCompletedTrucks.map((truck) => (
                  <Card key={truck.id} className="border">
                     <CardContent className="p-4">
                       <div className="space-y-4">
                         <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                           <div className="flex-1 space-y-1">
                             <h3 className="font-semibold text-lg">{truck.license_plate}</h3>
                             <p className="text-sm text-muted-foreground">
                               Completed: {formatDate(truck.updated_at)}
                             </p>
                             <p className="text-sm text-muted-foreground">
                               Handled by: {truck.handled_by_name || 'Unknown'}
                             </p>
                             <p className="text-sm text-muted-foreground">
                               {truck.pallet_count} pallets • {truck.cargo_description}
                             </p>
                           </div>
                           <div className="flex flex-col items-end gap-2 sm:min-w-[120px]">
                             <span className="text-sm text-muted-foreground text-right">
                               {truck.truck_completion_photos?.length || 0} photos
                             </span>
                             {truck.truck_completion_photos && truck.truck_completion_photos.length > 0 && (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 className="w-full text-xs"
                                 onClick={() => downloadAllPhotosForTruck(truck)}
                               >
                                 <Download className="h-3 w-3 mr-1" />
                                 Download All
                               </Button>
                             )}
                           </div>
                         </div>
                       </div>
                      
                      {truck.truck_completion_photos && truck.truck_completion_photos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {truck.truck_completion_photos.map((photo: any, index: number) => (
                            <div key={photo.id} className="relative group">
                              <img
                                src={photo.photo_url}
                                alt={`Completion photo ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(photo.photo_url, '_blank')}
                              />
                              <Button
                                variant="secondary"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => downloadPhoto(photo.photo_url, truck.license_plate, index)}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                               <div className="absolute bottom-2 left-2 bg-background/90 text-foreground text-xs px-2 py-1 rounded border">
                                 {formatDate(photo.created_at)}
                               </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No photos available for this truck
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};