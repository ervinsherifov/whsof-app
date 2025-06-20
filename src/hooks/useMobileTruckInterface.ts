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
        console.log('Fetching warehouse staff...');
        
        // Use a direct join query to get warehouse staff with profiles
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            user_id, 
            display_name, 
            email,
            user_roles!inner(role)
          `)
          .eq('user_roles.role', 'WAREHOUSE_STAFF');
        
        if (error) {
          console.error('Warehouse staff query error:', error);
          throw error;
        }
        
        console.log('Warehouse staff found:', data);
        setWarehouseStaff(data || []);
      } catch (error) {
        console.error('Error fetching warehouse staff:', error);
        setWarehouseStaff([]);
      }
    };

    fetchWarehouseStaff();
  }, []);

  const updateTruckStatus = async (truckId: string, newStatus: string, onRefresh: () => void) => {
    if (!user?.id || processingTruckId) return;

    setProcessingTruckId(truckId);

    try {
      // Use the database function for all status changes to ensure proper Bulgaria timezone
      const { error: rpcError } = await supabase.rpc('handle_truck_status_change', {
        p_truck_id: truckId,
        p_new_status: newStatus,
        p_user_id: user.id
      });
      
      if (rpcError) throw rpcError;
      
      // Refresh KPI metrics after status change
      await supabase.rpc('refresh_user_kpi_metrics', {
        target_date: new Date().toISOString().split('T')[0]
      });

      const statusDescriptions = {
        'ARRIVED': 'arrived',
        'IN_PROGRESS': 'in progress',
        'DONE': 'completed',
        'SCHEDULED': 'scheduled'
      };

      toast({
        title: 'Status Updated! ✅',
        description: `Truck marked as ${statusDescriptions[newStatus as keyof typeof statusDescriptions] || newStatus.replace('_', ' ').toLowerCase()}`,
      });
      
      onRefresh();
    } catch (error: any) {
      console.error('Error updating truck status:', error);
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