import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Truck as TruckType } from '@/types';

export const useMobileTruckInterface = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [processingTruckId, setProcessingTruckId] = useState<string | null>(null);
  const [assigningRamp, setAssigningRamp] = useState<string | null>(null);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [selectedTruckForCompletion, setSelectedTruckForCompletion] = useState<TruckType | null>(null);
  const [warehouseStaff, setWarehouseStaff] = useState<any[]>([]);

  // Fetch warehouse staff on hook initialization
  useEffect(() => {
    const fetchWarehouseStaff = async () => {
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
        setWarehouseStaff(data || []);
      } catch (error) {
        console.error('Error fetching warehouse staff:', error);
      }
    };

    fetchWarehouseStaff();
  }, []);

  const updateTruckStatus = async (truckId: string, newStatus: string, onRefresh: () => void) => {
    if (!user?.id || processingTruckId) return;

    setProcessingTruckId(truckId);

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'ARRIVED') {
        // Call the backend function to handle actual arrival
        const { error: rpcError } = await supabase.rpc('handle_truck_arrival', {
          p_truck_id: truckId,
          p_user_id: user.id
        });
        
        if (rpcError) throw rpcError;
        
        // Refresh KPI metrics after truck arrival
        await supabase.rpc('refresh_user_kpi_metrics', {
          target_date: new Date().toISOString().split('T')[0]
        });
        
        toast({
          title: 'Status Updated! ✅',
          description: 'Truck marked as arrived',
        });
        
        onRefresh();
        return;
      } else if (newStatus === 'IN_PROGRESS') {
        updateData.handled_by_user_id = user.id;
        updateData.handled_by_name = user.email;
        updateData.started_at = new Date().toISOString();
      } else if (newStatus === 'DONE') {
        updateData.completed_at = new Date().toISOString();
      }

      // Only update if not ARRIVED (ARRIVED is handled by RPC)
      const { error } = await supabase
        .from('trucks')
        .update(updateData)
        .eq('id', truckId);

      if (error) throw error;

      // Refresh KPI metrics after status change
      await supabase.rpc('refresh_user_kpi_metrics', {
        target_date: new Date().toISOString().split('T')[0]
      });

      toast({
        title: 'Status Updated! ✅',
        description: `Truck marked as ${newStatus.replace('_', ' ').toLowerCase()}`,
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingTruckId(null);
    }
  };

  const assignRamp = async (truckId: string, rampNumber: number, onRefresh: () => void) => {
    if (!user?.id || assigningRamp) return;

    setAssigningRamp(truckId);

    try {
      const { error } = await supabase
        .from('trucks')
        .update({ ramp_number: rampNumber })
        .eq('id', truckId);

      if (error) throw error;

      toast({
        title: 'Ramp Assigned! ✅',
        description: `Truck assigned to ramp #${rampNumber}`,
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAssigningRamp(null);
    }
  };

  const openCompletionDialog = (truck: TruckType) => {
    setSelectedTruckForCompletion(truck);
    setCompletionDialogOpen(true);
  };

  const closeCompletionDialog = () => {
    setCompletionDialogOpen(false);
    setSelectedTruckForCompletion(null);
  };

  return {
    processingTruckId,
    assigningRamp,
    completionDialogOpen,
    selectedTruckForCompletion,
    warehouseStaff,
    updateTruckStatus,
    assignRamp,
    openCompletionDialog,
    closeCompletionDialog
  };
};