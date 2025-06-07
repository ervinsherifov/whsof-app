import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const TruckScheduling: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRampDialogOpen, setIsRampDialogOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<any>(null);
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
  }, []);

  const fetchTrucks = async () => {
    try {
      const { data, error } = await supabase
        .from('trucks')
        .select('*')
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
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          email,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'WAREHOUSE_STAFF');

      if (error) throw error;
      setProfiles(data || []);
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

    try {
      const { error } = await supabase
        .from('trucks')
        .insert({
          license_plate: formData.licensePlate.trim(),
          arrival_date: formData.arrivalDate,
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

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'ARRIVED') {
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
        description: `Status changed to ${newStatus}`,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Truck Scheduling</h1>
          <p className="text-muted-foreground">
            Manage truck arrivals and ramp assignments
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Schedule New Truck</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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
                <Label htmlFor="arrivalDate">Arrival Date</Label>
                <Input
                  id="arrivalDate"
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalTime">Arrival Time (24h format)</Label>
                <Input
                  id="arrivalTime"
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})}
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
      <Card>
        <CardHeader>
          <CardTitle>Ramp Status Overview</CardTitle>
          <CardDescription>
            Current availability of loading and unloading ramps (50-minute time slots)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
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
                        ? new Date(new Date(`${currentlyOccupying.arrival_date}T${currentlyOccupying.arrival_time}`).getTime() + 50 * 60 * 1000).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})
                        : 'Now'
                      }
                    </div>
                  )}
                  {!currentlyOccupying && nextTruck && (
                    <div className="text-xs mt-1">
                      Next: {nextTruck.license_plate}
                      <br />
                      At: {new Date(`${nextTruck.arrival_date}T${nextTruck.arrival_time}`).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'})}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Trucks */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Trucks</CardTitle>
          <CardDescription>
            Today's truck schedule and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading trucks...</div>
          ) : (
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
                      {truck.arrival_date} {truck.arrival_time}
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
                      <div className="flex space-x-1">
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
                            onClick={() => updateTruckStatus(truck.id, 'DONE')}
                          >
                            Mark Done
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </div>
  );
};