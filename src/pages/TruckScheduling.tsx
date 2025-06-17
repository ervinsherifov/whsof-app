import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TruckCompletionPhotos } from '@/components/TruckCompletionPhotos';
import { useTruckData } from '@/hooks/useTruckData';
import { TruckSchedulingForm } from '@/components/truck/TruckSchedulingForm';
import { TruckList } from '@/components/truck/TruckList';
import { RampStatusGrid } from '@/components/truck/RampStatusGrid';
import { TruckRescheduleDialog } from '@/components/truck/TruckRescheduleDialog';

const availableRamps = [
  { number: 1, type: 'Unloading' },
  { number: 2, type: 'Unloading' },
  { number: 3, type: 'Unloading' },
  { number: 4, type: 'Unloading' },
  { number: 5, type: 'Unloading' },
  { number: 6, type: 'Unloading' },
  { number: 7, type: 'Unloading' },
  { number: 8, type: 'Loading' },
  { number: 9, type: 'Loading' },
  { number: 10, type: 'Loading' },
  { number: 11, type: 'Loading' },
  { number: 12, type: 'Loading' },
  { number: 13, type: 'Loading' },
];

export const TruckScheduling: React.FC = () => {
  const [isRampDialogOpen, setIsRampDialogOpen] = useState(false);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<any>(null);
  const [selectedHandlers, setSelectedHandlers] = useState<string[]>([]);
  const [rampFormData, setRampFormData] = useState({
    rampNumber: '',
    assignedStaffId: ''
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const { trucks, profiles, warehouseStaff, loading, refreshData } = useTruckData();

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
        updateData.started_at = new Date().toISOString();
      } else if (newStatus === 'IN_PROGRESS') {
        updateData.handled_by_user_id = user.id;
        updateData.handled_by_name = user.email;
        updateData.started_at = new Date().toISOString();
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
      
      refreshData();
    } catch (error: any) {
      toast({
        title: 'Error updating truck status',
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
      
      refreshData();
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
      refreshData();
    } catch (error: any) {
      toast({
        title: 'Error assigning ramp',
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

      // Mark truck as complete with completion timestamp
      const { error } = await supabase
        .from('trucks')
        .update({ 
          status: 'DONE',
          completed_at: new Date().toISOString()
        })
        .eq('id', selectedTruck.id);

      if (error) throw error;

      toast({
        title: 'Truck marked as complete',
        description: `Truck ${selectedTruck.license_plate} has been completed`,
      });

      setIsCompletionDialogOpen(false);
      setSelectedTruck(null);
      setSelectedHandlers([]);
      refreshData();
    } catch (error: any) {
      toast({
        title: 'Error completing truck',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isRampAvailable = (rampNumber: number, newArrivalDate?: string, newArrivalTime?: string) => {
    if (!newArrivalDate || !newArrivalTime) {
      // If no new schedule provided, check current occupancy for display
      const occupiedRamps = trucks
        .filter(truck => truck.ramp_number && truck.status !== 'DONE')
        .map(truck => truck.ramp_number);
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

  const handleAssignRamp = (truck: any) => {
    setSelectedTruck(truck);
    setIsRampDialogOpen(true);
  };

  const handleReschedule = (truck: any) => {
    setSelectedTruck(truck);
    setIsRescheduleDialogOpen(true);
  };

  // Redirect warehouse staff to mobile interface on small screens
  React.useEffect(() => {
    if (user?.role === 'WAREHOUSE_STAFF' && window.innerWidth < 768) {
      const shouldRedirect = window.confirm(
        'Mobile interface available! Would you like to use the mobile-optimized truck dashboard?'
      );
      if (shouldRedirect) {
        window.location.href = '/mobile-trucks';
      }
    }
  }, [user?.role]);

  return (
    <div className="w-full max-w-none overflow-hidden space-y-4 sm:space-y-6 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Truck Scheduling</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage truck arrivals and ramp assignments
          </p>
        </div>
        
        <TruckSchedulingForm onSuccess={refreshData} />
      </div>

      {/* Ramp Status Grid - Hidden for warehouse staff */}
      {user?.role !== 'WAREHOUSE_STAFF' && <RampStatusGrid trucks={trucks} />}

      <TruckList 
        trucks={trucks}
        loading={loading}
        onAssignRamp={handleAssignRamp}
        onUpdateStatus={updateTruckStatus}
        onDeleteTruck={deleteTruck}
        onReschedule={handleReschedule}
      />

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

      {/* Truck Reschedule Dialog */}
      <TruckRescheduleDialog
        truck={selectedTruck}
        isOpen={isRescheduleDialogOpen}
        onOpenChange={setIsRescheduleDialogOpen}
        onSuccess={() => {
          refreshData();
          setSelectedTruck(null);
        }}
      />
    </div>
  );
};