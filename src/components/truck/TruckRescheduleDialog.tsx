import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Calendar, Clock } from 'lucide-react';

interface TruckRescheduleDialogProps {
  truck: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TruckRescheduleDialog: React.FC<TruckRescheduleDialogProps> = ({
  truck,
  isOpen,
  onOpenChange,
  onSuccess
}) => {
  const [newDate, setNewDate] = useState(truck?.arrival_date || '');
  const [newTime, setNewTime] = useState(truck?.arrival_time || '');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const handleReschedule = async () => {
    if (!truck || !user?.id) return;
    
    if (!newDate || !newTime) {
      toast({
        title: 'Missing information',
        description: 'Please provide both new date and time',
        variant: 'destructive',
      });
      return;
    }

    // Defensive: check for valid date/time
    const newDateTime = new Date(`${newDate}T${newTime}`);
    if (isNaN(newDateTime.getTime())) {
      toast({
        title: 'Invalid date/time',
        description: `Please enter a valid date and time.\nDate: ${newDate} Time: ${newTime}`,
        variant: 'destructive',
      });
      return;
    }

    // Validate that new date is not in the past
    const now = new Date();
    
    if (newDateTime < now) {
      toast({
        title: 'Invalid date/time',
        description: 'Cannot reschedule to a past date and time',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Call the database function to handle rescheduling
      const { data, error } = await supabase.rpc('reschedule_overdue_truck', {
        p_truck_id: truck.id,
        p_new_date: newDate,
        p_new_time: newTime,
        p_reason: reason || null,
        p_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: 'Truck rescheduled successfully',
        description: `Truck ${truck.license_plate} has been rescheduled to ${newDate} at ${newTime}`,
      });

      onOpenChange(false);
      onSuccess();
      setReason('');
    } catch (error: any) {
      toast({
        title: 'Error rescheduling truck',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewDate(truck?.arrival_date || '');
    setNewTime(truck?.arrival_time || '');
    setReason('');
  };

  // Reset form when truck changes or dialog opens
  React.useEffect(() => {
    if (isOpen && truck) {
      // Debug: log the initial date/time values
      console.log('TruckRescheduleDialog: truck.arrival_date', truck.arrival_date);
      console.log('TruckRescheduleDialog: truck.arrival_time', truck.arrival_time);
      resetForm();
    }
  }, [isOpen, truck]);

  if (!truck) return null;

  const isOverdue = truck.is_overdue || false;
  const originalDate = truck.original_arrival_date || truck.arrival_date;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reschedule Truck
          </DialogTitle>
          <DialogDescription>
            Reschedule truck {truck.license_plate}
            {isOverdue && (
              <div className="flex items-center gap-1 mt-2 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">This truck is overdue</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current schedule info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Current Schedule</h4>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Originally: {originalDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>Time: {truck.arrival_time}</span>
              </div>
              {truck.reschedule_count > 0 && (
                <div className="text-xs text-muted-foreground">
                  Rescheduled {truck.reschedule_count} time(s)
                </div>
              )}
            </div>
          </div>

          {/* New schedule form */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="newDate">New Arrival Date</Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newTime">New Arrival Time</Label>
              <Input
                id="newTime"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Rescheduling (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Traffic delay, mechanical issue, customer request..."
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground">
                {reason.length}/500 characters
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2 pt-4">
            <Button 
              onClick={handleReschedule} 
              className="flex-1"
              disabled={isLoading || !newDate || !newTime}
            >
              {isLoading ? 'Rescheduling...' : 'Reschedule Truck'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};