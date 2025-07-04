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
import { formatDate, formatTime, parseDate } from '@/lib/dateUtils';

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
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
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

    // Validate date format (DD/MM/YYYY)
    const parsedDate = parseDate(newDate);
    if (!parsedDate) {
      toast({
        title: 'Invalid date format',
        description: 'Please enter the date in DD/MM/YYYY format.',
        variant: 'destructive',
      });
      return;
    }

    // Validate time format (HH:mm 24h)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(newTime)) {
      toast({
        title: 'Invalid time format',
        description: 'Please enter the time in HH:mm 24-hour format.',
        variant: 'destructive',
      });
      return;
    }

    // Combine date and time for past check
    const newDateTime = new Date(parsedDate);
    const [hours, minutes] = newTime.split(':').map(Number);
    newDateTime.setHours(hours, minutes, 0, 0);
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
      // Convert parsedDate to YYYY-MM-DD for DB
      const isoDate = parsedDate.toISOString().split('T')[0];
      // Call the database function to handle rescheduling
      const { data, error } = await supabase.rpc('reschedule_overdue_truck', {
        p_truck_id: truck.id,
        p_new_date: isoDate,
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
    setNewDate('');
    setNewTime('');
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
            Reschedule Truck
          </DialogTitle>
          <DialogDescription>
            Reschedule truck {truck.license_plate}
            {isOverdue && (
              <div className="flex items-center gap-1 mt-2 text-orange-600">
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
                <span>Originally: {formatDate(originalDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Time: {formatTime(truck.arrival_time)}</span>
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
                type="text"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newTime">New Arrival Time</Label>
              <Input
                id="newTime"
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="HH:mm"
                autoComplete="off"
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