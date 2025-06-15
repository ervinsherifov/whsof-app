import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DynamicBackground } from '@/components/ui/dynamic-background';
import { SoundControls } from '@/components/ui/sound-controls';
import { Fullscreen, Tv, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getTodayISO, formatDate } from '@/lib/dateUtils';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';

export const TVDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [trucks, setTrucks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize sound notifications
  const { handleTruckStatusChange, playTestSound, initializeAudio, enabled: soundSystemEnabled } = useSoundNotifications({
    enabled: soundEnabled,
    volume: 0.7
  });

  // Initialize audio on first user interaction
  const handleUserInteraction = () => {
    if (soundEnabled) {
      initializeAudio();
    }
  };

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
      // Fetch all trucks except COMPLETED/DONE status
      const { data: trucksData, error: trucksError } = await supabase
        .from('trucks')
        .select(`
          *,
          created_by_profile:profiles!trucks_created_by_user_id_fkey(
            display_name,
            email
          )
        `)
        .not('status', 'eq', 'COMPLETED')
        .not('status', 'eq', 'DONE');

      if (trucksError) throw trucksError;

      // Sort trucks by status priority: IN_PROGRESS > ARRIVED > SCHEDULED (by date/time)
      const sortedTrucks = (trucksData || []).sort((a, b) => {
        // Define status priority
        const getStatusPriority = (status: string) => {
          switch (status) {
            case 'IN_PROGRESS': return 1;
            case 'ARRIVED': return 2;
            case 'SCHEDULED': return 3;
            default: return 4;
          }
        };

        const aPriority = getStatusPriority(a.status);
        const bPriority = getStatusPriority(b.status);

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // For same status, sort SCHEDULED trucks by date and time (earliest first)
        if (a.status === 'SCHEDULED' && b.status === 'SCHEDULED') {
          const aDateTime = new Date(`${a.arrival_date}T${a.arrival_time}`);
          const bDateTime = new Date(`${b.arrival_date}T${b.arrival_time}`);
          return aDateTime.getTime() - bDateTime.getTime();
        }

        // For other statuses, maintain original order
        return 0;
      });

      // Fetch urgent tasks - show all except COMPLETED
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          created_by_profile:profiles!tasks_created_by_user_id_fkey(
            display_name,
            email
          )
        `)
        .in('priority', ['URGENT', 'HIGH'])
        .not('status', 'eq', 'COMPLETED')
        .order('due_date', { ascending: true })
        .limit(5);

      if (tasksError) throw tasksError;

      setTrucks(sortedTrucks);
      setTasks(tasksData || []);

      // Handle sound notifications for truck status changes
      handleTruckStatusChange(sortedTrucks);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Timer for updating time every second
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Timer for refreshing data every 10 seconds
    const dataTimer = setInterval(() => {
      fetchData();
    }, 10000);

    // Set up realtime subscriptions
    const trucksChannel = supabase
      .channel('trucks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trucks' }, 
        (payload) => {
          console.log('Trucks realtime update:', payload);
          fetchData();
        }
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' }, 
        (payload) => {
          console.log('Tasks realtime update:', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      clearInterval(timeTimer);
      clearInterval(dataTimer);
      supabase.removeChannel(trucksChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-secondary text-secondary-foreground';
      case 'ARRIVED':
        return 'bg-green-600 text-green-50';
      case 'IN_PROGRESS':
        return 'bg-orange-600 text-orange-50';
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
        return 'bg-orange-600 text-orange-50';
      case 'MEDIUM':
        return 'bg-secondary text-secondary-foreground';
      case 'LOW':
        return 'bg-green-600 text-green-50';
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
    <div 
      className="relative h-screen bg-background flex flex-col overflow-hidden p-2 lg:p-4 4xl:p-6 tv-dashboard"
      onClick={handleUserInteraction}
    >
      {/* Dynamic Background */}
      <DynamicBackground trucks={trucks} />
      
      {/* Subtle overlay for better readability */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[0.5px]" />
      {/* Top Right Controls */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
        {/* Sound Controls Icon */}
        <Button
          onClick={() => setSoundEnabled(!soundEnabled)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>
        
        {/* Fullscreen Toggle */}
        <Button 
          onClick={toggleFullscreen}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur"
        >
          {isFullscreen ? <Tv className="w-4 h-4" /> : <Fullscreen className="w-4 h-4" />}
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="relative flex-1 grid grid-cols-1 xl:grid-cols-2 gap-2 lg:gap-4 4xl:gap-6 min-h-0 z-10">
        {/* Trucks Status - Primary Focus */}
        <Card className="xl:col-span-1 flex flex-col min-h-0 bg-card/90 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-1 lg:pb-2 flex-shrink-0">
            <CardTitle className="text-2xl lg:text-3xl 4xl:text-5xl">All Trucks</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-3 lg:space-y-4 4xl:space-y-6">
              {trucks.map((truck, index) => (
                  <div 
                    key={truck.id}
                    className={`
                      relative border-2 rounded-xl p-6 lg:p-8 4xl:p-10 
                      transform transition-all duration-500 ease-out
                      animate-fade-in truck-card backdrop-blur-sm
                      hover:scale-[1.01]
                      ${truck.status === 'IN_PROGRESS' 
                        ? 'border-orange-500/60 animate-pulse' 
                        : truck.status === 'ARRIVED'
                        ? 'border-green-500/60'
                        : 'border-border/50'
                      }
                    `}
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  {/* Status Indicator Bar */}
                  <div className={`
                    absolute top-0 left-0 right-0 h-2 rounded-t-xl status-indicator
                    ${truck.status === 'IN_PROGRESS' 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-400' 
                      : truck.status === 'ARRIVED'
                      ? 'bg-gradient-to-r from-green-500 to-green-400'
                      : 'bg-gradient-to-r from-secondary to-secondary/80'
                    }
                  `} />

                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl lg:text-4xl 4xl:text-5xl font-black tracking-tight text-foreground">
                        {truck.license_plate}
                      </div>
                      {truck.priority === 'URGENT' && (
                        <div className="w-4 h-4 bg-destructive rounded-full animate-pulse" />
                      )}
                    </div>
                    <Badge className={`
                      text-sm lg:text-lg 4xl:text-xl px-4 py-2 font-semibold border-2
                      ${truck.status === 'SCHEDULED' 
                        ? 'bg-secondary/20 text-secondary-foreground border-secondary/40'
                        : truck.status === 'ARRIVED'
                        ? 'bg-green-500/25 text-green-100 border-green-500/50'
                        : truck.status === 'IN_PROGRESS'
                        ? 'bg-orange-500/25 text-orange-100 border-orange-500/50'
                        : 'bg-muted/20 text-muted-foreground border-muted/30'
                      }
                    `}>
                      {truck.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Main Info Grid - Compact layout with proper spacing */}
                  <div className="flex flex-wrap justify-between items-start gap-4 lg:gap-6 mb-4">
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Date
                      </div>
                      <div className="text-lg lg:text-xl font-black text-foreground">
                        {formatDate(truck.arrival_date)}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Time
                      </div>
                      <div className="text-lg lg:text-xl font-black text-foreground font-mono tracking-wider">
                        <span className="font-black">{truck.arrival_time.substring(0, 5)}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-[100px] space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Ramp
                      </div>
                      <div className="text-lg lg:text-xl font-black text-foreground">
                        {truck.ramp_number ? `#${truck.ramp_number}` : 'TBD'}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-[100px] space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Pallets
                      </div>
                      <div className="text-lg lg:text-xl font-black text-foreground">
                        {truck.pallet_count}
                      </div>
                    </div>
                  </div>

                  {/* Staff Assignment */}
                  {(truck.status === 'IN_PROGRESS' || truck.status === 'ARRIVED') && truck.handled_by_name && (
                    <div className="mb-4 p-3 lg:p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm lg:text-base 4xl:text-lg text-blue-700 font-medium">
                          Handled by:
                        </span>
                        <span className="text-sm lg:text-base 4xl:text-lg text-blue-900 font-bold">
                          {truck.handled_by_name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cargo Description */}
                  <div className="space-y-2">
                    <div className="text-xs lg:text-sm 4xl:text-base text-muted-foreground uppercase tracking-wide font-medium">
                      Cargo
                    </div>
                    <div className="text-sm lg:text-base 4xl:text-lg text-foreground leading-relaxed">
                      {truck.cargo_description}
                    </div>
                  </div>

                  {/* Progress Indicator for In-Progress Trucks */}
                  {truck.status === 'IN_PROGRESS' && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs lg:text-sm text-muted-foreground">
                        <span>Processing...</span>
                        <span>Est. 50 min</span>
                      </div>
                      <div className="w-full bg-secondary/30 rounded-full h-2">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-400 h-2 rounded-full animate-pulse" 
                             style={{ width: '65%' }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {trucks.length === 0 && (
                <div className="text-center text-muted-foreground text-lg lg:text-xl 4xl:text-2xl py-8">
                  No active trucks
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Secondary Info Column */}
        <div className="xl:col-span-1 flex flex-col gap-2 lg:gap-4 4xl:gap-6">
          {/* Urgent Tasks - Smaller */}
          <Card className="flex flex-col min-h-0 flex-1 bg-card/90 backdrop-blur-sm border-border/50">
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
          <Card className="flex flex-col min-h-0 flex-1 bg-card/90 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-1 lg:pb-2 flex-shrink-0">
              <CardTitle className="text-lg lg:text-xl 4xl:text-2xl">Ramp Status</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="grid grid-cols-5 lg:grid-cols-7 gap-1 flex-1">
                {Array.from({ length: 13 }, (_, i) => {
                  const rampNumber = i + 1;
                  const occupyingTruck = trucks.find(truck => 
                    truck.ramp_number === rampNumber && (truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS')
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


      {/* Sound Test Controls (hidden, but accessible for testing) */}
      {soundEnabled && (
        <div className="fixed bottom-2 right-2 z-20 opacity-0 hover:opacity-100 transition-opacity">
          <SoundControls
            enabled={soundEnabled}
            onToggle={() => setSoundEnabled(!soundEnabled)}
            onTestSound={playTestSound}
            className="w-64"
          />
        </div>
      )}

      {/* Date and Time indicator */}
      <div className="fixed bottom-2 left-2 text-foreground text-sm lg:text-base 4xl:text-lg bg-background/90 backdrop-blur px-3 py-2 rounded z-20 border border-border/30">
        <div className="font-black">
          {currentTime.toLocaleTimeString('en-GB', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })} • {formatDate(currentTime)}
        </div>
      </div>
    </div>
  );
};