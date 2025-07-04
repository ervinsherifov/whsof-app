import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, X, Users } from 'lucide-react';

interface MobileTruckCompletionDialogProps {
  truckId: string;
  truckLicensePlate: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  warehouseStaff: Array<{
    user_id: string;
    display_name?: string;
    email: string;
  }>;
}

export const MobileTruckCompletionDialog: React.FC<MobileTruckCompletionDialogProps> = ({
  truckId,
  truckLicensePlate,
  isOpen,
  onClose,
  onComplete,
  warehouseStaff
}) => {
  const [selectedHelper, setSelectedHelper] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: 'Authentication error',
        description: 'You must be logged in to complete trucks',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Use the database function to properly handle status change with Bulgaria timezone
      const { error: statusError } = await supabase.rpc('handle_truck_status_change', {
        p_truck_id: truckId,
        p_new_status: 'DONE',
        p_user_id: user.id
      });

      if (statusError) throw statusError;

      // Save truck handlers - always include the person marking it as done
      const handlersToSave = [
        {
          truck_id: truckId,
          handler_user_id: user.id,
          handler_name: user.email
        }
      ];

      // Add the selected helper if one was chosen
      if (selectedHelper) {
        const helperStaff = warehouseStaff.find(s => s.user_id === selectedHelper);
        if (helperStaff) {
          handlersToSave.push({
            truck_id: truckId,
            handler_user_id: selectedHelper,
            handler_name: helperStaff.display_name || 'Unknown'
          });
        }
      }

      const { error: handlersError } = await supabase
        .from('truck_handlers')
        .insert(handlersToSave);

      if (handlersError) throw handlersError;

      // CRITICAL: Refresh KPI metrics AFTER saving handlers to ensure proper credit allocation
      await supabase.rpc('refresh_user_kpi_metrics', {
        target_date: new Date().toISOString().split('T')[0]
      });

      toast({
        title: 'Truck completed ✅',
        description: `Truck ${truckLicensePlate} has been marked as completed`,
      });

      setSelectedHelper('');
      onComplete();
      onClose();

    } catch (error: any) {
      toast({
        title: 'Error completing truck',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedHelper('');
      onClose();
    }
  };

  // Filter out the current user from the helper selection
  const availableHelpers = warehouseStaff.filter(staff => staff.user_id !== user?.id);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="mx-4 max-w-sm rounded-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg">Complete Truck</DialogTitle>
          <DialogDescription className="text-sm">
            {truckLicensePlate}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="helper" className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Select helper (optional)
            </Label>
            <Select value={selectedHelper} onValueChange={setSelectedHelper} disabled={submitting || availableHelpers.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={availableHelpers.length === 0 ? "No other staff available" : "No helper selected"} />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-background border shadow-lg max-h-[200px] overflow-y-auto">
                {availableHelpers.map((staff) => (
                  <SelectItem 
                    key={staff.user_id} 
                    value={staff.user_id}
                    className="cursor-pointer hover:bg-accent focus:bg-accent"
                  >
                    {staff.display_name || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a warehouse staff member who helped with this truck
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={submitting}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Completing...</span>
              </div>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};