import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Fullscreen, Tv } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const TVDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [trucks, setTrucks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const fetchData = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch trucks - only for today and only SCHEDULED or ARRIVED
      const { data: trucksData, error: trucksError } = await supabase
        .from('trucks')
        .select('*')
        .eq('arrival_date', today)
        .in('status', ['SCHEDULED', 'ARRIVED'])
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
        return 'bg-secondary text-secondary-foreground';
      case 'ARRIVED':
        return 'bg-green-600 text-white';
      case 'DONE':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-destructive text-destructive-foreground';
      case 'HIGH':
        return 'bg-orange-600 text-white';
      case 'MEDIUM':
        return 'bg-secondary text-secondary-foreground';
      case 'LOW':
        return 'bg-green-600 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-6xl 4xl:text-8xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden p-2 lg:p-4 4xl:p-6">
      {/* Fullscreen Toggle */}
      <div className="absolute top-2 right-2 z-10">
        <Button 
          onClick={toggleFullscreen}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur"
        >
          {isFullscreen ? <Tv className="w-4 h-4" /> : <Fullscreen className="w-4 h-4" />}
        </Button>
      </div>

      {/* Header */}
      <div className="text-center mb-2 lg:mb-4 4xl:mb-6 flex-shrink-0">
        <h1 className="text-4xl lg:text-6xl 4xl:text-8xl font-bold mb-1 lg:mb-2 4xl:mb-4">Warehouse Operations</h1>
        <div className="text-3xl lg:text-5xl 4xl:text-7xl font-mono text-muted-foreground">
          {currentTime.toLocaleTimeString('en-GB', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        <div className="text-lg lg:text-2xl 4xl:text-3xl text-muted-foreground">
          {currentTime.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-2 lg:gap-4 4xl:gap-6 min-h-0">
        {/* Trucks Status - Primary Focus */}
        <Card className="xl:col-span-1 flex flex-col min-h-0">
          <CardHeader className="pb-1 lg:pb-2 flex-shrink-0">
            <CardTitle className="text-2xl lg:text-3xl 4xl:text-5xl">Today's Trucks</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-3 lg:space-y-4 4xl:space-y-6">
              {trucks.map((truck) => (
                <div 
                  key={truck.id}
                  className="border border-border rounded-lg p-3 lg:p-4 4xl:p-6 bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xl lg:text-2xl 4xl:text-3xl font-bold">{truck.license_plate}</div>
                    <Badge className={`text-sm lg:text-lg 4xl:text-xl px-3 py-1 ${getStatusColor(truck.status)}`}>
                      {truck.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 lg:gap-3 text-sm lg:text-lg 4xl:text-xl">
                    <div>
                      <span className="text-muted-foreground">Time:</span>
                      <div className="font-bold text-lg lg:text-xl 4xl:text-2xl">
                        {truck.arrival_time.substring(0, 5)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ramp:</span>
                      <div className="font-bold text-lg lg:text-xl 4xl:text-2xl">
                        {truck.ramp_number ? `#${truck.ramp_number}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pallets:</span>
                      <div className="font-bold text-lg lg:text-xl 4xl:text-2xl">{truck.pallet_count}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm lg:text-lg 4xl:text-xl">
                    <span className="text-muted-foreground">Cargo:</span> {truck.cargo_description}
                  </div>
                </div>
              ))}
              {trucks.length === 0 && (
                <div className="text-center text-muted-foreground text-lg lg:text-xl 4xl:text-2xl py-8">
                  No trucks scheduled for today
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Secondary Info Column */}
        <div className="xl:col-span-1 flex flex-col gap-2 lg:gap-4 4xl:gap-6">
          {/* Urgent Tasks - Smaller */}
          <Card className="flex flex-col min-h-0 flex-1">
            <CardHeader className="pb-1 lg:pb-2 flex-shrink-0">
              <CardTitle className="text-lg lg:text-xl 4xl:text-2xl">Urgent Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-1 lg:space-y-2 4xl:space-y-3">
                {tasks.slice(0, 3).map((task) => (
                  <div 
                    key={task.id}
                    className="border border-border rounded p-1 lg:p-2 4xl:p-3 bg-card"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-xs lg:text-sm 4xl:text-lg font-bold line-clamp-1 flex-1 mr-2">{task.title}</div>
                      <Badge className={`text-xs px-1 py-0.5 ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="text-xs lg:text-sm 4xl:text-base">
                      <div className="font-semibold">{task.assigned_to_name || 'Unassigned'}</div>
                        {task.due_date && (
                        <div className="font-bold">
                          {new Date(task.due_date).toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ramp Status Grid - Smaller */}
          <Card className="flex flex-col min-h-0 flex-1">
            <CardHeader className="pb-1 lg:pb-2 flex-shrink-0">
              <CardTitle className="text-lg lg:text-xl 4xl:text-2xl">Ramp Status</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="grid grid-cols-5 lg:grid-cols-7 gap-1 flex-1">
                {Array.from({ length: 13 }, (_, i) => {
                  const rampNumber = i + 1;
                  const occupyingTruck = trucks.find(truck => 
                    truck.ramp_number === rampNumber && truck.status === 'ARRIVED'
                  );
                  const isOccupied = !!occupyingTruck;
                  
                  return (
                    <div 
                      key={rampNumber}
                      className={`
                        aspect-square rounded border flex items-center justify-center text-center p-1
                        ${isOccupied 
                          ? 'bg-destructive border-destructive text-destructive-foreground' 
                          : 'bg-green-600 border-green-600 text-white'
                        }
                      `}
                    >
                      <div className="text-xs lg:text-sm 4xl:text-lg font-bold">#{rampNumber}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 lg:mt-2 flex justify-center space-x-3 text-xs flex-shrink-0">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-destructive rounded"></div>
                  <span>Busy</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-600 rounded"></div>
                  <span>Free</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-2 left-2 text-muted-foreground text-xs lg:text-sm 4xl:text-lg bg-background/80 backdrop-blur px-2 py-1 rounded">
        Auto-refresh: 10s • Realtime
      </div>
    </div>
  );
};