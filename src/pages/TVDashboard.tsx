import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export const TVDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [trucks, setTrucks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch trucks
      const { data: trucksData, error: trucksError } = await supabase
        .from('trucks')
        .select('*')
        .order('arrival_date', { ascending: true })
        .order('arrival_time', { ascending: true });

      if (trucksError) throw trucksError;

      // Fetch urgent tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('priority', ['URGENT', 'HIGH'])
        .eq('status', 'PENDING')
        .order('due_date', { ascending: true })
        .limit(5);

      if (tasksError) throw tasksError;

      setTrucks(trucksData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
      fetchData(); // Refresh data every 10 seconds
    }, 10000);

    // Set up realtime subscriptions
    const trucksChannel = supabase
      .channel('trucks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trucks' }, 
        () => fetchData()
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' }, 
        () => fetchData()
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(trucksChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-500';
      case 'ARRIVED':
        return 'bg-green-500';
      case 'DONE':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-4xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      {/* Header */}
      <div className="text-center mb-6 lg:mb-8">
        <h1 className="text-3xl lg:text-6xl font-bold mb-2 lg:mb-4">Warehouse Operations</h1>
        <div className="text-2xl lg:text-4xl font-mono text-muted-foreground">
          {currentTime.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        <div className="text-lg lg:text-2xl text-muted-foreground">
          {currentTime.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
        {/* Trucks Status */}
        <Card className="h-fit">
          <CardHeader className="pb-2 lg:pb-4">
            <CardTitle className="text-xl lg:text-3xl">Truck Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 lg:space-y-4">
              {trucks.slice(0, 6).map((truck) => (
                <div 
                  key={truck.id}
                  className="border rounded-lg p-3 lg:p-4 bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg lg:text-2xl font-bold">{truck.license_plate}</div>
                    <Badge 
                      className={`text-white text-sm lg:text-lg px-2 lg:px-3 py-1 ${getStatusColor(truck.status)}`}
                    >
                      {truck.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 lg:gap-4 text-sm lg:text-lg">
                    <div>
                      <span className="text-muted-foreground">Ramp:</span>
                      <div className="font-bold text-lg lg:text-2xl">
                        {truck.ramp_number ? `#${truck.ramp_number}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pallets:</span>
                      <div className="font-bold text-lg lg:text-2xl">{truck.pallet_count}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm lg:text-lg">
                    <span className="text-muted-foreground">Cargo:</span> {truck.cargo_description}
                  </div>
                  <div className="mt-2 text-sm lg:text-lg">
                    <span className="text-muted-foreground">Staff:</span> {truck.assigned_staff_name || 'Not assigned'}
                  </div>
                  <div className="mt-2 text-sm lg:text-lg">
                    <span className="text-muted-foreground">Arrival:</span> {truck.arrival_date} {truck.arrival_time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Tasks */}
        <Card className="h-fit">
          <CardHeader className="pb-2 lg:pb-4">
            <CardTitle className="text-xl lg:text-3xl">Urgent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 lg:space-y-4">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className="border rounded-lg p-3 lg:p-4 bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-base lg:text-xl font-bold line-clamp-2">{task.title}</div>
                    <Badge 
                      className={`text-white text-sm lg:text-lg px-2 lg:px-3 py-1 ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-4 text-sm lg:text-lg">
                    <div>
                      <span className="text-muted-foreground">Assigned to:</span>
                      <div className="font-semibold">{task.assigned_to_name || 'Unassigned'}</div>
                    </div>
                    {task.due_date && (
                      <div>
                        <span className="text-muted-foreground">Due:</span>
                        <div className="font-bold text-base lg:text-xl">
                          {new Date(task.due_date).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ramp Status Grid */}
      <Card>
        <CardHeader className="pb-2 lg:pb-4">
          <CardTitle className="text-xl lg:text-3xl">Ramp Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 lg:gap-4">
            {Array.from({ length: 12 }, (_, i) => {
              const rampNumber = i + 1;
              const isUnloading = rampNumber <= 6;
              const occupyingTruck = trucks.find(truck => 
                truck.ramp_number === rampNumber && truck.status === 'ARRIVED'
              );
              const isOccupied = !!occupyingTruck;
              
              return (
                <div 
                  key={rampNumber}
                  className={`
                    aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-center p-2 lg:p-4
                    ${isOccupied 
                      ? 'bg-red-100 border-red-500 text-red-700' 
                      : 'bg-green-100 border-green-500 text-green-700'
                    }
                  `}
                >
                  <div className="text-xl lg:text-3xl font-bold">#{rampNumber}</div>
                  <div className="text-xs lg:text-sm font-medium">
                    {isUnloading ? 'Unloading' : 'Loading'}
                  </div>
                  <div className="text-sm lg:text-lg font-bold mt-1">
                    {isOccupied ? 'BUSY' : 'FREE'}
                  </div>
                  {occupyingTruck && (
                    <div className="text-xs mt-1 truncate w-full">
                      {occupyingTruck.license_plate}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 lg:mt-6 flex justify-center space-x-4 lg:space-x-8 text-sm lg:text-lg">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 lg:w-4 lg:h-4 bg-red-500 rounded"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 lg:w-4 lg:h-4 bg-green-500 rounded"></div>
              <span>Available</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-2 lg:bottom-4 right-2 lg:right-4 text-muted-foreground text-sm lg:text-lg">
        Auto-refresh: 10s • Realtime updates
      </div>
    </div>
  );
};