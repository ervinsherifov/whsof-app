import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DynamicBackground } from '@/components/ui/dynamic-background';
import { SoundControls } from '@/components/ui/sound-controls';
import { Fullscreen, Tv, Volume2, VolumeX, AlertTriangle, UserCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getTodayISO, formatDate, formatTime } from '@/lib/dateUtils';
import { useSoundNotifications } from '@/hooks/useSoundNotifications';

export const TVDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [trucks, setTrucks] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedTruckId, setExpandedTruckId] = useState<string | null>(null);

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

      // Fetch all tasks - show all except COMPLETED
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          created_by_profile:profiles!tasks_created_by_user_id_fkey(
            display_name,
            email
          )
        `)
        .not('status', 'eq', 'COMPLETED')
        .order('priority', { ascending: false })
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

  // Calculate progress percentage based on work time
  const calculateProgress = (truck: any) => {
    if (truck.status !== 'IN_PROGRESS' || !truck.started_at) return 0;
    
    const startTime = new Date(truck.started_at);
    const currentTime = new Date();
    const elapsedMinutes = (currentTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    // Assume 50 minutes is 100% completion
    const estimatedDurationMinutes = 50;
    const progress = Math.min((elapsedMinutes / estimatedDurationMinutes) * 100, 99); // Cap at 99% until marked done
    
    return Math.max(progress, 5); // Minimum 5% to show some progress
  };

  // Format elapsed time
  const formatElapsedTime = (truck: any) => {
    if (truck.status !== 'IN_PROGRESS' || !truck.started_at) return '0min';
    
    const startTime = new Date(truck.started_at);
    const currentTime = new Date();
    const elapsedMinutes = Math.floor((currentTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    if (elapsedMinutes < 60) {
      return `${elapsedMinutes}min`;
    } else {
      const hours = Math.floor(elapsedMinutes / 60);
      const mins = elapsedMinutes % 60;
      return `${hours}h ${mins}min`;
    }
  };

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

  // Helper for status order
  const STATUS_ORDER = ['SCHEDULED', 'ARRIVED', 'IN_PROGRESS', 'DONE'];
  const STATUS_LABELS = {
    SCHEDULED: 'Scheduled',
    ARRIVED: 'Arrived',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
  };

  // Group trucks by status
  const groupedTrucks = STATUS_ORDER.map(status => ({
    status,
    trucks: trucks.filter(t => t.status === status),
  })).filter(group => group.trucks.length > 0);

  // Status stepper component
  const StatusStepper = ({ currentStatus }: { currentStatus: string }) => {
    return (
      <div className="flex items-center justify-center gap-2 my-2">
        {STATUS_ORDER.map((status, idx) => {
          const isActive = STATUS_ORDER.indexOf(currentStatus) >= idx;
          return (
            <React.Fragment key={status}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300
                ${isActive ? 'bg-blue-600 text-white border-blue-700 shadow-lg' : 'bg-muted text-muted-foreground border-muted-foreground/30'}`}
                aria-label={STATUS_LABELS[status]}
              >
                {idx + 1}
              </div>
              {idx < STATUS_ORDER.length - 1 && (
                <div className={`h-1 w-8 rounded-full transition-all duration-300
                  ${isActive ? 'bg-blue-400' : 'bg-muted-foreground/20'}`}/>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Helper to get estimated done time
  const getEstimatedDoneTime = (truck: any) => {
    if (!truck.started_at) return null;
    const start = new Date(truck.started_at);
    start.setMinutes(start.getMinutes() + 50);
    return start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Helper to get staff initials
  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
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
      {/* LIVE Indicator */}
      <div className="absolute top-2 left-2 z-30 flex items-center gap-2">
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse shadow-lg" aria-label="Live updates enabled">
          <span className="w-2 h-2 rounded-full bg-white animate-ping mr-1" />LIVE
        </span>
      </div>
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
          <CardContent className="flex-1 overflow-y-auto pt-4">
            <div className="space-y-6 lg:space-y-8 4xl:space-y-10">
              {groupedTrucks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-96 text-center text-muted-foreground">
                  <img src="/assets/empty-warehouse.svg" alt="No trucks" className="w-32 h-32 mb-4 opacity-80" />
                  <div className="text-2xl font-bold mb-2">No trucks scheduled</div>
                  <div className="text-md">All ramps are free and ready for action!</div>
                </div>
              )}
              {groupedTrucks.map(group => (
                <div key={group.status} className="relative">
                  {/* Sticky group header */}
                  <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border/30 py-1 px-2 mb-2">
                    <span className="text-lg font-bold tracking-wide text-foreground drop-shadow-sm uppercase">
                      {STATUS_LABELS[group.status]}
                    </span>
                  </div>
                  {/* Truck cards for this group */}
                  <div className="space-y-3">
                    {group.trucks.map((truck, index) => {
                      const hasException = !!truck.exception_type || !!truck.late_arrival_reason;
                      const isExpanded = expandedTruckId === truck.id;
                      return (
                        <div
                          key={truck.id}
                          className={`relative rounded-lg p-3 lg:p-4 4xl:p-5 transform transition-all duration-700 ease-out animate-fade-in truck-card backdrop-blur-sm hover:scale-[1.01] shadow-md cursor-pointer
                            ${hasException ? 'border-2 border-red-500 shadow-red-400/30' : ''}`}
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          aria-label={`Truck ${truck.license_plate} card`}
                          onClick={() => setExpandedTruckId(isExpanded ? null : truck.id)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpandedTruckId(isExpanded ? null : truck.id); }}
                        >
                          {/* Exception/Alert Icon */}
                          {hasException && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold border border-red-700 shadow-red-500/50 animate-pulse z-20">
                              <AlertTriangle className="w-4 h-4 mr-1" aria-label="Exception" />
                              Exception
                            </div>
                          )}
                          {/* Status Stepper */}
                          <StatusStepper currentStatus={truck.status} />
                          {/* Status Indicator - Top Left Corner Badge */}
                          <div className={`
                            absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                            backdrop-blur-sm border shadow-sm
                            ${truck.status === 'IN_PROGRESS' 
                              ? 'bg-orange-500/90 text-white border-orange-400 shadow-orange-500/50 animate-pulse' 
                              : truck.status === 'ARRIVED'
                              ? 'bg-green-500/90 text-white border-green-400 shadow-green-500/50'
                              : truck.status === 'SCHEDULED'
                              ? 'bg-blue-500/90 text-white border-blue-400 shadow-blue-500/50'
                              : 'bg-muted/90 text-muted-foreground border-muted'
                            }
                          `} 
                          style={{
                            animationDuration: truck.status === 'IN_PROGRESS' ? '3s' : undefined
                          }}>
                            {truck.status.replace('_', ' ')}
                          </div>

                          {/* Priority Indicator */}
                          {truck.priority === 'URGENT' && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/90 text-destructive-foreground text-xs font-bold border border-destructive shadow-destructive/50">
                              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              URGENT
                            </div>
                          )}

                          {/* Header - License Plate - More Compact */}
                          <div className="mt-6 mb-3 text-center">
                            <div className="text-xl lg:text-2xl 4xl:text-3xl font-black tracking-tight text-foreground drop-shadow-sm">
                              {truck.license_plate}
                            </div>
                          </div>

                          {/* Main Info Grid - Ultra Compact */}
                          <div className="grid grid-cols-4 gap-2 mb-3">
                             <div className="text-center p-1.5 rounded-md bg-background/50 backdrop-blur-sm border border-border/30">
                               <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                                 Date
                               </div>
                               <div className="text-xs lg:text-sm 4xl:text-base font-bold text-foreground leading-tight">
                                 {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE' 
                                   ? (truck.actual_arrival_date 
                                       ? new Date(truck.actual_arrival_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
                                       : new Date(truck.arrival_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
                                     )
                                   : new Date(truck.arrival_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
                                 }
                               </div>
                             </div>
                             
                             <div className="text-center p-1.5 rounded-md bg-background/50 backdrop-blur-sm border border-border/30">
                               <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                                 Time
                               </div>
                                <div className="text-xs lg:text-sm 4xl:text-base font-black text-foreground font-mono leading-tight">
                                   {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE'
                                     ? (truck.actual_arrival_time 
                                         ? (typeof truck.actual_arrival_time === 'string' && truck.actual_arrival_time.includes(':')
                                             ? truck.actual_arrival_time.substring(0, 5)
                                             : truck.arrival_time.substring(0, 5)
                                           )
                                         : truck.arrival_time.substring(0, 5)
                                       )
                                     : truck.arrival_time.substring(0, 5)
                                   }
                                 </div>
                             </div>
                          
                            <div className="text-center p-1.5 rounded-md bg-background/50 backdrop-blur-sm border border-border/30">
                              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                                Ramp
                              </div>
                              <div className="text-xs lg:text-sm 4xl:text-base font-bold text-foreground leading-tight">
                                {truck.ramp_number ? `#${truck.ramp_number}` : 'TBD'}
                              </div>
                            </div>
                            
                            <div className="text-center p-1.5 rounded-md bg-background/50 backdrop-blur-sm border border-border/30">
                              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">
                                Pallets
                              </div>
                              <div className="text-xs lg:text-sm 4xl:text-base font-bold text-foreground leading-tight">
                                {truck.pallet_count}
                              </div>
                            </div>
                          </div>

                          {/* Staff Avatars/Initials */}
                          <div className="flex gap-2 items-center mb-2">
                            {truck.handled_by_name && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-900 font-bold text-xs" aria-label={`Handled by ${truck.handled_by_name}`}>
                                <UserCircle className="w-4 h-4 mr-1" />
                                {getInitials(truck.handled_by_name)}
                              </div>
                            )}
                            {truck.created_by_profile && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-900 font-bold text-xs" aria-label={`Created by ${truck.created_by_profile.display_name || truck.created_by_profile.email}`}> 
                                <UserCircle className="w-4 h-4 mr-1" />
                                {getInitials(truck.created_by_profile.display_name || truck.created_by_profile.email)}
                              </div>
                            )}
                          </div>

                          {/* Progress Indicator - Compact */}
                          {truck.status === 'IN_PROGRESS' && (
                            <div className="px-2 py-1.5 rounded bg-orange-500/10 border border-orange-400/30">
                              <div className="flex justify-between text-xs text-orange-700 font-semibold mb-1">
                                <span>🚛 Processing</span>
                                <span>{formatElapsedTime(truck)}</span>
                              </div>
                              <div className="relative w-full bg-orange-200/50 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-1000 ease-out"
                                  style={{ 
                                    width: `${calculateProgress(truck)}%`
                                  }} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-slide-in-right" 
                                     style={{ animationDuration: '2s', animationIterationCount: 'infinite' }} />
                              </div>
                              <div className="flex justify-between text-xs text-orange-600 mt-1">
                                <span>{Math.round(calculateProgress(truck))}% done</span>
                                <span>{Math.max(0, 50 - Math.floor((new Date().getTime() - new Date(truck.started_at).getTime()) / (1000 * 60)))}min left</span>
                                {/* Estimated done time */}
                                <span className="ml-2 text-green-700 font-bold">Est. done: {getEstimatedDoneTime(truck)}</span>
                              </div>
                            </div>
                          )}
                          {/* Expandable Details */}
                          {isExpanded && (
                            <div className="mt-3 p-3 rounded bg-background/80 border border-border/30 shadow-inner transition-all duration-300" aria-label="Truck details">
                              <div className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Cargo:</span> {truck.cargo_description}</div>
                              {truck.late_arrival_reason && (
                                <div className="mb-2 text-sm text-red-700"><span className="font-semibold">Late Reason:</span> {truck.late_arrival_reason}</div>
                              )}
                              {truck.exception_type && (
                                <div className="mb-2 text-sm text-red-700"><span className="font-semibold">Exception:</span> {truck.exception_type}</div>
                              )}
                              {truck.notes && (
                                <div className="mb-2 text-sm"><span className="font-semibold">Notes:</span> {truck.notes}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Secondary Info Column */}
        <div className="xl:col-span-1 flex flex-col gap-2 lg:gap-4 4xl:gap-6">
          {/* Urgent Tasks - Smaller */}
          <Card className="flex flex-col min-h-0 flex-1 bg-card/90 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-1 lg:pb-2 flex-shrink-0">
              <CardTitle className="text-lg lg:text-xl 4xl:text-2xl">Tasks</CardTitle>
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
                      <div className="font-semibold">
                        {task.status === 'IN_PROGRESS' && task.assigned_to_name 
                          ? `Started by: ${task.assigned_to_name}` 
                          : task.status === 'IN_PROGRESS' && !task.assigned_to_name
                          ? 'Started by: Unknown User'
                          : task.assigned_to_name || 'Unassigned'
                        }
                      </div>
                      {task.created_by_profile && (
                        <div className="text-muted-foreground">
                          Scheduled by: {task.created_by_profile.display_name || task.created_by_profile.email}
                        </div>
                      )}
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
      <div className="fixed bottom-2 right-2 text-foreground text-sm lg:text-base 4xl:text-lg bg-background/90 backdrop-blur px-3 py-2 rounded z-20 border border-border/30 mr-2 mb-16">
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