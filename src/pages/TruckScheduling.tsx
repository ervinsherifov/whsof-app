import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TruckCompletionPhotos } from '@/components/TruckCompletionPhotos';
import { formatDate, parseDate } from '@/lib/dateUtils';


export const TruckScheduling: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRampDialogOpen, setIsRampDialogOpen] = useState(false);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<any>(null);
  const [warehouseStaff, setWarehouseStaff] = useState<any[]>([]);
  const [selectedHandlers, setSelectedHandlers] = useState<string[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    licensePlate: '',
    arrivalDate: '',
    arrivalTime: '',
    palletCount: '',
    cargoDescription: ''
  });

  const [rampFormData, setRampFormData] = useState({
    rampNumber: '',
    assignedStaffId: ''
  });

  const availableRamps = [
    { number: 1, type: 'Unloading' },
    { number: 2, type: 'Unloading' },
    { number: 3, type: 'Unloading' },
    { number: 4, type: 'Unloading' },
    { number: 5, type: 'Unloading' },
    { number: 6, type: 'Unloading' },
    { number: 8, type: 'Loading' },
    { number: 9, type: 'Loading' },
    { number: 10, type: 'Loading' },
    { number: 11, type: 'Loading' },
    { number: 12, type: 'Loading' },
    { number: 13, type: 'Loading' },
  ];

  useEffect(() => {
    fetchTrucks();
    fetchProfiles();
    fetchWarehouseStaff();
  }, []);

  const fetchWarehouseStaff = async () => {
    try {
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
        setWarehouseStaff(userData || []);
      } else {
        setWarehouseStaff([]);
      }
    } catch (error) {
      console.error('Error fetching warehouse staff:', error);
    }
  };

  const fetchTrucks = async () => {
    try {
      let query = supabase
        .from('trucks')
        .select('*');

      // Filter out DONE trucks for warehouse staff
      if (user?.role === 'WAREHOUSE_STAFF') {
        query = query.neq('status', 'DONE');
      }

      const { data, error } = await query
        .order('arrival_date', { ascending: true })
        .order('arrival_time', { ascending: true });

      if (error) throw error;
      setTrucks(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching trucks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      // First get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'WAREHOUSE_STAFF');

      if (rolesError) throw rolesError;

      if (userRoles && userRoles.length > 0) {
        const userIds = userRoles.map(role => role.user_id);
        
        // Then get profiles for those users
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);

        if (error) throw error;
        setProfiles(data || []);
      } else {
        setProfiles([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching staff',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'default';
      case 'ARRIVED':
        return 'secondary';
      case 'IN PROGRESS':
        return 'default';
      case 'DONE':
        return 'outline';
      default:
        return 'default';
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Authentication error',
        description: 'You must be logged in to schedule trucks',
        variant: 'destructive',
      });
      return;
    }

    // Validate form data
    if (!formData.licensePlate.trim() || !formData.arrivalDate || !formData.arrivalTime || 
        !formData.palletCount || !formData.cargoDescription.trim()) {
      toast({
        title: 'Validation error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    const palletCount = parseInt(formData.palletCount);
    if (isNaN(palletCount) || palletCount <= 0) {
      toast({
        title: 'Validation error',
        description: 'Pallet count must be a valid positive number',
        variant: 'destructive',
      });
      return;
    }

    // Parse DD/MM/YYYY date format
    const parsedDate = parseDate(formData.arrivalDate);
    if (!parsedDate) {
      toast({
        title: 'Invalid date format',
        description: 'Please enter date in DD/MM/YYYY format',
        variant: 'destructive',
      });
      return;
    }

    // Check if the scheduled date/time is in the past
    const scheduledDateTime = new Date(`${parsedDate.toISOString().split('T')[0]}T${formData.arrivalTime}`);
    const now = new Date();
    
    // Add 2 minute buffer to account for form filling time
    const bufferTime = new Date(now.getTime() + 2 * 60 * 1000);
    
    if (scheduledDateTime <= bufferTime) {
      toast({
        title: 'Invalid Schedule Time',
        description: 'Please select a future date and time (at least 2 minutes from now)',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('trucks')
        .insert({
          license_plate: formData.licensePlate.trim(),
          arrival_date: parsedDate.toISOString().split('T')[0],
          arrival_time: formData.arrivalTime,
          pallet_count: palletCount,
          cargo_description: formData.cargoDescription.trim(),
          created_by_user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Truck scheduled successfully',
        description: `Truck ${formData.licensePlate} scheduled for ${formData.arrivalDate} at ${formData.arrivalTime}`,
      });

      setFormData({
        licensePlate: '',
        arrivalDate: '',
        arrivalTime: '',
        palletCount: '',
        cargoDescription: ''
      });
      setIsDialogOpen(false);
      fetchTrucks();
    } catch (error: any) {
      toast({
        title: 'Error scheduling truck',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateTruckStatus = async (truckId: string, newStatus: string) => {
    if (!user?.id) return;

    // If marking as done, check for photos first
    if (newStatus === 'DONE') {
      const truck = trucks.find(t => t.id === truckId);
      if (truck) {
        setSelectedTruck(truck);
        setIsCompletionDialogOpen(true);
        return;
      }
    }

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'ARRIVED') {
        updateData.handled_by_user_id = user.id;
        updateData.handled_by_name = user.email;
      } else if (newStatus === 'IN PROGRESS') {
        updateData.handled_by_user_id = user.id;
        updateData.handled_by_name = user.email;
      }

      const { error } = await supabase
        .from('trucks')
        .update(updateData)
        .eq('id', truckId);

      if (error) throw error;

      toast({
        title: 'Truck status updated',
        description: `Status changed to ${newStatus.replace('_', ' ')}`,
      });
      
      fetchTrucks();
    } catch (error: any) {
      toast({
        title: 'Error updating truck status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const checkPhotosAndComplete = async () => {
    if (!selectedTruck) return;

    // Validate handler selection
    if (selectedHandlers.length === 0) {
      toast({
        title: 'Handler selection required',
        description: 'Please select at least one warehouse staff member who handled this truck',
        variant: 'destructive',
      });
      return;
    }

    if (selectedHandlers.length > 2) {
      toast({
        title: 'Too many handlers selected',
        description: 'You can select up to 2 warehouse staff members only',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if photos exist
      const { data: photos, error: photoError } = await supabase
        .from('truck_completion_photos')
        .select('id')
        .eq('truck_id', selectedTruck.id);

      if (photoError) throw photoError;

      if (!photos || photos.length === 0) {
        toast({
          title: 'Photos required',
          description: 'At least one completion photo is required before marking truck as done',
          variant: 'destructive',
        });
        return;
      }

      // Save truck handlers
      const selectedStaffData = selectedHandlers.map(userId => {
        const staff = warehouseStaff.find(s => s.user_id === userId);
        return {
          truck_id: selectedTruck.id,
          handler_user_id: userId,
          handler_name: staff?.display_name || staff?.email || 'Unknown'
        };
      });

      const { error: handlersError } = await supabase
        .from('truck_handlers')
        .insert(selectedStaffData);

      if (handlersError) throw handlersError;

      // Mark truck as complete
      const { error } = await supabase
        .from('trucks')
        .update({ status: 'DONE' })
        .eq('id', selectedTruck.id);

      if (error) throw error;

      toast({
        title: 'Truck marked as complete',
        description: `Truck ${selectedTruck.license_plate} has been completed`,
      });

      setIsCompletionDialogOpen(false);
      setSelectedTruck(null);
      setSelectedHandlers([]);
      fetchTrucks();
    } catch (error: any) {
      toast({
        title: 'Error completing truck',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteTruck = async (truckId: string, licensePlate: string) => {
    if (!user?.id || user.role !== 'SUPER_ADMIN') return;

    if (!confirm(`Are you sure you want to delete truck "${licensePlate}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trucks')
        .delete()
        .eq('id', truckId);

      if (error) throw error;

      toast({
        title: 'Truck deleted',
        description: `Truck "${licensePlate}" has been deleted`,
      });
      
      fetchTrucks();
    } catch (error: any) {
      toast({
        title: 'Error deleting truck',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const assignRamp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTruck || !user?.id || !rampFormData.rampNumber || !rampFormData.assignedStaffId) {
      toast({
        title: 'Missing information',
        description: 'Please select both a ramp and staff member',
        variant: 'destructive',
      });
      return;
    }

    try {
      const selectedStaff = profiles.find(p => p.user_id === rampFormData.assignedStaffId);
      
      const { error } = await supabase
        .from('trucks')
        .update({
          ramp_number: parseInt(rampFormData.rampNumber),
          assigned_staff_id: rampFormData.assignedStaffId || null,
          assigned_staff_name: selectedStaff?.display_name || selectedStaff?.email,
        })
        .eq('id', selectedTruck.id);

      if (error) throw error;

      toast({
        title: 'Ramp assigned successfully',
        description: `Truck ${selectedTruck.license_plate} assigned to ramp ${rampFormData.rampNumber}`,
      });

      setRampFormData({
        rampNumber: '',
        assignedStaffId: ''
      });
      setIsRampDialogOpen(false);
      setSelectedTruck(null);
      fetchTrucks();
    } catch (error: any) {
      toast({
        title: 'Error assigning ramp',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getOccupiedRamps = () => {
    return trucks
      .filter(truck => truck.ramp_number && truck.status !== 'DONE')
      .map(truck => truck.ramp_number);
  };

  const isRampAvailable = (rampNumber: number, newArrivalDate?: string, newArrivalTime?: string) => {
    if (!newArrivalDate || !newArrivalTime) {
      // If no new schedule provided, check current occupancy for display
      const occupiedRamps = getOccupiedRamps();
      return !occupiedRamps.includes(rampNumber);
    }

    // Check for time conflicts with existing trucks (50-minute slots)
    const newStart = new Date(`${newArrivalDate}T${newArrivalTime}`);
    const newEnd = new Date(newStart.getTime() + 50 * 60 * 1000); // 50 minutes later

    const conflictingTrucks = trucks.filter(truck => {
      if (truck.ramp_number !== rampNumber || truck.status === 'DONE') return false;
      
      const existingStart = new Date(`${truck.arrival_date}T${truck.arrival_time}`);
      const existingEnd = new Date(existingStart.getTime() + 50 * 60 * 1000);
      
      // Check if time slots overlap
      return (newStart < existingEnd && newEnd > existingStart);
    });

    return conflictingTrucks.length === 0;
  };

  const getRampOccupancy = (rampNumber: number) => {
    // A ramp is occupied if there's an ARRIVED truck assigned to it
    const currentTruck = trucks.find(truck => {
      return truck.ramp_number === rampNumber && truck.status === 'ARRIVED';
    });
    
    return currentTruck;
  };

  return (
    <div className="w-full max-w-none overflow-hidden space-y-4 sm:space-y-6 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Truck Scheduling</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage truck arrivals and ramp assignments
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-full sm:w-auto">Schedule New Truck</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle>Schedule New Truck</DialogTitle>
              <DialogDescription>
                Enter truck details and assign a ramp
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="licensePlate">License Plate</Label>
                <Input
                  id="licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({...formData, licensePlate: e.target.value})}
                  placeholder="ABC-123"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalDate">Arrival Date (DD/MM/YYYY)</Label>
                <Input
                  id="arrivalDate"
                  type="text"
                  value={formData.arrivalDate}
                  onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
                  placeholder="12/06/2025"
                  pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$"
                  title="Please enter date in DD/MM/YYYY format"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalTime">Arrival Time (24h format)</Label>
                <Input
                  id="arrivalTime"
                  type="text"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})}
                  placeholder="14:30"
                  pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                  title="Please enter time in 24-hour format (HH:MM)"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="palletCount">Number of Pallets</Label>
                <Input
                  id="palletCount"
                  type="number"
                  value={formData.palletCount}
                  onChange={(e) => setFormData({...formData, palletCount: e.target.value})}
                  placeholder="24"
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargoDescription">Cargo Description</Label>
                <Textarea
                  id="cargoDescription"
                  value={formData.cargoDescription}
                  onChange={(e) => setFormData({...formData, cargoDescription: e.target.value})}
                  placeholder="Electronics, furniture, etc."
                  required
                />
              </div>

              {user?.role !== 'OFFICE_ADMIN' && (
                <>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Note: Ramp and staff assignment will be done by warehouse staff after scheduling.
                    </p>
                  </div>
                </>
              )}

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">Schedule Truck</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ramp Status Overview */}
      <Card className="mx-2 sm:mx-0">
        <CardHeader>
          <CardTitle>Ramp Status Overview</CardTitle>
          <CardDescription>
            Current availability of loading and unloading ramps (50-minute time slots)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {availableRamps.map((ramp) => {
              const currentlyOccupying = getRampOccupancy(ramp.number);
              const isCurrentlyBusy = !!currentlyOccupying;
              const nextTruck = trucks.find(t => 
                t.ramp_number === ramp.number && 
                t.status !== 'DONE' && 
                new Date(`${t.arrival_date}T${t.arrival_time}`) > new Date()
              );
              
              return (
                <div 
                  key={ramp.number}
                  className={`
                    p-4 rounded-lg border text-center
                    ${isCurrentlyBusy 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : nextTruck
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                      : 'bg-green-50 border-green-200 text-green-700'
                    }
                  `}
                >
                  <div className="font-bold text-lg">#{ramp.number}</div>
                  <div className="text-sm">{ramp.type}</div>
                  <div className="text-xs font-medium mt-1">
                    {isCurrentlyBusy ? 'Occupied' : nextTruck ? 'Scheduled' : 'Available'}
                  </div>
                  {currentlyOccupying && (
                    <div className="text-xs mt-1">
                      {currentlyOccupying.license_plate}
                      <br />
                      Until: {new Date(`${currentlyOccupying.arrival_date}T${currentlyOccupying.arrival_time}`).getTime() + 50 * 60 * 1000 > Date.now() 
                        ? new Date(new Date(`${currentlyOccupying.arrival_date}T${currentlyOccupying.arrival_time}`).getTime() + 50 * 60 * 1000).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false})
                        : 'Now'
                      }
                    </div>
                  )}
                  {!currentlyOccupying && nextTruck && (
                    <div className="text-xs mt-1">
                      Next: {nextTruck.license_plate}
                      <br />
                      At: {new Date(`${nextTruck.arrival_date}T${nextTruck.arrival_time}`).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false})}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Trucks */}
      <Card className="mx-2 sm:mx-0">
        <CardHeader>
          <CardTitle>Scheduled Trucks</CardTitle>
          <CardDescription>
            Today's truck schedule and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading trucks...</p>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <ScrollArea className="h-[400px] w-full">
                <div className="block sm:hidden space-y-4">
                  {/* Mobile card layout */}
                  {trucks.map((truck) => (
                    <Card key={truck.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="font-medium text-lg">{truck.license_plate}</div>
                          <Badge variant={getStatusColor(truck.status)}>
                            {truck.status}
                          </Badge>
                        </div>
                        
                         <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Arrival:</span>
                            <div className="font-medium">{formatDate(truck.arrival_date)}</div>
                            <div className="font-medium">{truck.arrival_time}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Ramp:</span>
                            <div className="font-medium">
                              {truck.ramp_number ? `Ramp ${truck.ramp_number}` : 'Not assigned'}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pallets:</span>
                            <div className="font-medium">{truck.pallet_count}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Staff:</span>
                            <div className="font-medium text-xs truncate">
                              {truck.assigned_staff_name || 'Not assigned'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <span className="text-muted-foreground text-xs">Cargo:</span>
                            <div className="text-sm break-words">{truck.cargo_description}</div>
                          </div>
                          {truck.handled_by_name && (
                            <div>
                              <span className="text-muted-foreground text-xs">Handler:</span>
                              <div className="text-sm">{truck.handled_by_name}</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {truck.status === 'SCHEDULED' && user?.role === 'WAREHOUSE_STAFF' && !truck.ramp_number && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                setSelectedTruck(truck);
                                setIsRampDialogOpen(true);
                              }}
                            >
                              Assign Ramp
                            </Button>
                          )}
                          {truck.status === 'SCHEDULED' && truck.ramp_number && user?.role === 'WAREHOUSE_STAFF' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              onClick={() => updateTruckStatus(truck.id, 'ARRIVED')}
                            >
                              Mark Arrived
                            </Button>
                          )}
                        {truck.status === 'ARRIVED' && user?.role === 'WAREHOUSE_STAFF' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              onClick={() => updateTruckStatus(truck.id, 'IN PROGRESS')}
                            >
                              Start Work
                            </Button>
                          )}
                          {truck.status === 'IN PROGRESS' && user?.role === 'WAREHOUSE_STAFF' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              onClick={() => updateTruckStatus(truck.id, 'DONE')}
                            >
                              Mark Done
                            </Button>
                          )}
                          {user?.role === 'SUPER_ADMIN' && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="text-xs"
                              onClick={() => deleteTruck(truck.id, truck.license_plate)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                
                {/* Desktop table layout */}
                <div className="hidden sm:block min-w-[800px]">
                  <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Arrival Date/Time</TableHead>
                  <TableHead>Ramp</TableHead>
                  <TableHead>Pallets</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Assigned Staff</TableHead>
                  <TableHead>Handler</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.map((truck) => (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">
                      {truck.license_plate}
                    </TableCell>
                    <TableCell>
                      {formatDate(truck.arrival_date)} {truck.arrival_time}
                    </TableCell>
                    <TableCell>
                      {truck.ramp_number ? `Ramp ${truck.ramp_number}` : 'Not assigned'}
                    </TableCell>
                    <TableCell>{truck.pallet_count}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {truck.cargo_description}
                    </TableCell>
                    <TableCell>{truck.assigned_staff_name || 'Not assigned'}</TableCell>
                    <TableCell>{truck.handled_by_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(truck.status)}>
                        {truck.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
                        {truck.status === 'SCHEDULED' && user?.role === 'WAREHOUSE_STAFF' && !truck.ramp_number && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedTruck(truck);
                              setIsRampDialogOpen(true);
                            }}
                          >
                            Assign Ramp
                          </Button>
                        )}
                        {truck.status === 'SCHEDULED' && truck.ramp_number && user?.role === 'WAREHOUSE_STAFF' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateTruckStatus(truck.id, 'ARRIVED')}
                          >
                            Mark Arrived
                          </Button>
                        )}
                        {truck.status === 'ARRIVED' && user?.role === 'WAREHOUSE_STAFF' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateTruckStatus(truck.id, 'IN PROGRESS')}
                          >
                            Start Work
                          </Button>
                        )}
                        {truck.status === 'IN PROGRESS' && user?.role === 'WAREHOUSE_STAFF' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateTruckStatus(truck.id, 'DONE')}
                          >
                            Mark Done
                          </Button>
                        )}
                        {user?.role === 'SUPER_ADMIN' && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteTruck(truck.id, truck.license_plate)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                 ))}
                </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ramp Assignment Dialog */}
      <Dialog open={isRampDialogOpen} onOpenChange={setIsRampDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Ramp & Staff</DialogTitle>
            <DialogDescription>
              Assign ramp and staff for truck {selectedTruck?.license_plate}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={assignRamp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rampNumber">Ramp Number</Label>
              <Select value={rampFormData.rampNumber} onValueChange={(value) => setRampFormData({...rampFormData, rampNumber: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select available ramp" />
                </SelectTrigger>
                <SelectContent>
                  {availableRamps
                    .filter(ramp => selectedTruck ? isRampAvailable(ramp.number, selectedTruck.arrival_date, selectedTruck.arrival_time) : isRampAvailable(ramp.number))
                    .map((ramp) => (
                    <SelectItem key={ramp.number} value={ramp.number.toString()}>
                      Ramp {ramp.number} ({ramp.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedStaffId">Assigned Staff</Label>
              <Select value={rampFormData.assignedStaffId} onValueChange={(value) => setRampFormData({...rampFormData, assignedStaffId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse staff" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((staff) => (
                    <SelectItem key={staff.user_id} value={staff.user_id}>
                      {staff.display_name || staff.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2">
              <Button type="submit" className="flex-1">Assign Ramp</Button>
              <Button type="button" variant="outline" onClick={() => {
                setIsRampDialogOpen(false);
                setSelectedTruck(null);
                setRampFormData({ rampNumber: '', assignedStaffId: '' });
              }}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Truck Completion Dialog */}
      <Dialog open={isCompletionDialogOpen} onOpenChange={setIsCompletionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Truck Processing</DialogTitle>
            <DialogDescription>
              Upload completion photos and select warehouse staff who handled truck {selectedTruck?.license_plate}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTruck && (
            <div className="space-y-6">
              <TruckCompletionPhotos 
                truckId={selectedTruck.id}
                onPhotosUploaded={() => {
                  // Photos uploaded successfully, now we can allow completion
                }}
              />
              
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">
                    Select Warehouse Staff Who Handled This Truck
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select 1-2 warehouse staff members who unloaded/loaded this truck
                  </p>
                </div>
                
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-1 gap-3 pr-4">
                  {warehouseStaff.map((staff) => (
                    <div key={staff.user_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={staff.user_id}
                        checked={selectedHandlers.includes(staff.user_id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            if (selectedHandlers.length < 2) {
                              setSelectedHandlers([...selectedHandlers, staff.user_id]);
                            }
                          } else {
                            setSelectedHandlers(selectedHandlers.filter(id => id !== staff.user_id));
                          }
                        }}
                        disabled={!selectedHandlers.includes(staff.user_id) && selectedHandlers.length >= 2}
                      />
                      <Label
                        htmlFor={staff.user_id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {staff.display_name || staff.email}
                      </Label>
                    </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {selectedHandlers.length === 0 && (
                  <p className="text-sm text-destructive">
                    Please select at least one warehouse staff member
                  </p>
                )}
                
                {selectedHandlers.length >= 2 && (
                  <p className="text-sm text-muted-foreground">
                    Maximum 2 staff members can be selected
                  </p>
                )}
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={checkPhotosAndComplete}
                  className="flex-1"
                  disabled={selectedHandlers.length === 0}
                >
                  Mark Truck as Complete
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCompletionDialogOpen(false);
                    setSelectedTruck(null);
                    setSelectedHandlers([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};