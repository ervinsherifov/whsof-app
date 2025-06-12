import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckInStatus } from '@/hooks/useCheckInStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getTodayISO } from '@/lib/dateUtils';

export const Dashboard: React.FC = () => {
  const { user, checkIn, checkOut } = useAuth();
  const { isCheckedIn, refreshStatus } = useCheckInStatus();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    trucks: { scheduled: 0, active: 0, completed: 0 },
    tasks: { total: 0, urgent: 0, assigned: 0 },
    ramps: { total: 12, occupied: 0 },
    staff: { online: 0, total: 0 },
    recentTasks: [],
    recentTrucks: []
  });

  const fetchDashboardData = async () => {
    try {
      // Fetch trucks data
      const { data: trucks } = await supabase
        .from('trucks')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch tasks data
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch user profiles for staff count
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      // Fetch time entries for online staff
      const today = getTodayISO();
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*')
        .gte('check_in_time', today)
        .is('check_out_time', null);

      // Calculate metrics
      const trucksScheduled = trucks?.filter(t => t.status === 'SCHEDULED').length || 0;
      const trucksActive = trucks?.filter(t => t.status === 'ARRIVED').length || 0;
      const trucksCompleted = trucks?.filter(t => t.status === 'DONE').length || 0;
      const rampsOccupied = trucks?.filter(t => t.status === 'ARRIVED' && t.ramp_number).length || 0;

      const totalTasks = tasks?.length || 0;
      const urgentTasks = tasks?.filter(t => t.priority === 'URGENT' && t.status === 'PENDING').length || 0;
      const assignedTasks = tasks?.filter(t => t.assigned_to_user_id && t.status === 'PENDING').length || 0;

      const recentUserTasks = user?.role === 'WAREHOUSE_STAFF' 
        ? tasks?.filter(t => t.assigned_to_user_id === user.id).slice(0, 3) || []
        : tasks?.slice(0, 3) || [];

      const recentTrucks = trucks?.slice(0, 2) || [];

      setDashboardData({
        trucks: { scheduled: trucksScheduled, active: trucksActive, completed: trucksCompleted },
        tasks: { total: totalTasks, urgent: urgentTasks, assigned: assignedTasks },
        ramps: { total: 12, occupied: rampsOccupied },
        staff: { online: timeEntries?.length || 0, total: profiles?.length || 0 },
        recentTasks: recentUserTasks,
        recentTrucks: recentTrucks
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-GB', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await checkIn();
      await refreshStatus();
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
      await refreshStatus();
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'default';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ARRIVED': return 'default';
      case 'SCHEDULED': return 'secondary';
      case 'DONE': return 'outline';
      default: return 'outline';
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time updates
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      fetchDashboardData();
    }, 10000); // 10 second refresh

    // Set up realtime subscriptions
    const trucksChannel = supabase
      .channel('dashboard-trucks')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trucks' }, 
        () => fetchDashboardData()
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('dashboard-tasks')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' }, 
        () => fetchDashboardData()
      )
      .subscribe();

    const timeEntriesChannel = supabase
      .channel('dashboard-time-entries')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'time_entries' }, 
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(trucksChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(timeEntriesChannel);
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {getGreeting()}, {user?.name}
        </h1>
        <p className="text-muted-foreground">
          Current time: {getCurrentTime()}
        </p>
      </div>

      {user?.role === 'WAREHOUSE_STAFF' && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-lg sm:text-xl">
                Time Clock
                <Badge variant="outline" className="w-fit">{getCurrentTime()}</Badge>
              </CardTitle>
              <CardDescription>
                Track your work hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleCheckIn} 
                  disabled={isCheckedIn || isCheckingIn}
                  className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95" 
                  size="sm"
                >
                  {isCheckingIn ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    "Check In"
                  )}
                </Button>
                <Button 
                  onClick={handleCheckOut} 
                  disabled={!isCheckedIn || isCheckingOut}
                  variant="outline" 
                  className="flex-1 transition-all duration-200 hover:scale-105 active:scale-95" 
                  size="sm"
                >
                  {isCheckingOut ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    "Check Out"
                  )}
                </Button>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Working hours: 08:00 - 17:00
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">My Tasks</CardTitle>
              <CardDescription>
                {dashboardData.recentTasks.length} tasks assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.recentTasks.length > 0 ? (
                  dashboardData.recentTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm truncate flex-1">{task.title}</span>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">No tasks assigned</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg sm:text-xl">Recent Trucks</CardTitle>
              <CardDescription>
                {dashboardData.recentTrucks.length} trucks today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData.recentTrucks.length > 0 ? (
                  dashboardData.recentTrucks.map((truck: any) => (
                    <div key={truck.id} className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm truncate flex-1">
                        {truck.license_plate} {truck.ramp_number ? `(Ramp ${truck.ramp_number})` : ''}
                      </span>
                      <Badge variant={getStatusColor(truck.status)} className="text-xs">
                        {truck.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground">No trucks scheduled</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {user?.role === 'OFFICE_ADMIN' && (
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Today's Schedule</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Trucks and ramps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{dashboardData.trucks.scheduled}</div>
              <p className="text-xs text-muted-foreground">
                trucks scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Active Tasks</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Assigned to staff
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{dashboardData.tasks.assigned}</div>
              <p className="text-xs text-muted-foreground">
                tasks in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Available Ramps</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Unloading & loading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {dashboardData.ramps.total - dashboardData.ramps.occupied}/{dashboardData.ramps.total}
              </div>
              <p className="text-xs text-muted-foreground">
                ramps available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Staff Online</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Currently checked in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{dashboardData.staff.online}</div>
              <p className="text-xs text-muted-foreground">
                warehouse staff
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {user?.role === 'SUPER_ADMIN' && (
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Total Users</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                System-wide
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{dashboardData.staff.total}</div>
              <p className="text-xs text-muted-foreground">
                active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">System Health</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Overall status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs sm:text-sm">All systems operational</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Today's Activity</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Trucks processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{dashboardData.trucks.completed}</div>
              <p className="text-xs text-muted-foreground">
                trucks completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Urgent Tasks</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                High priority items
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{dashboardData.tasks.urgent}</div>
              <p className="text-xs text-muted-foreground">
                urgent tasks
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Common tasks for your role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {user?.role === 'WAREHOUSE_STAFF' && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/task-management')}>
                  View My Tasks
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/truck-scheduling')}>
                  Check Truck Status
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/tv-dashboard')}>
                  View TV Dashboard
                </Button>
              </>
            )}
            {user?.role === 'OFFICE_ADMIN' && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/truck-scheduling')}>
                  Schedule New Truck
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/task-management')}>
                  Create Task
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
                  Export Time Report
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/tv-dashboard')}>
                  View TV Dashboard
                </Button>
              </>
            )}
            {user?.role === 'SUPER_ADMIN' && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/user-management')}>
                  Add New User
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
                  System Health
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
                  View All Reports
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/tv-dashboard')}>
                  TV Dashboard
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      <div className="text-center">
        <div className="text-xs sm:text-sm text-muted-foreground">
          Auto-refresh: 10s • Last updated: {currentTime.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};