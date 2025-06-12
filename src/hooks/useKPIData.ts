import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { KPIMetrics, TruckException } from '@/types';

interface ExceptionWithTruck extends TruckException {
  trucks: {
    license_plate: string;
    cargo_description: string;
  };
}

export const useKPIData = () => {
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [exceptions, setExceptions] = useState<ExceptionWithTruck[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchKPIData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch KPI metrics
      const { data: kpiData, error: kpiError } = await supabase
        .from('kpi_metrics')
        .select('*')
        .single();

      if (kpiError) throw kpiError;

      // Fetch recent exceptions
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('truck_exceptions')
        .select(`
          *,
          trucks!inner(license_plate, cargo_description)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (exceptionsError) throw exceptionsError;

      setKpiMetrics(kpiData);
      setExceptions(exceptionsData as ExceptionWithTruck[] || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching KPI data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateExceptionStatus = async (exceptionId: string, status: string, resolvedByUserId?: string) => {
    try {
      const updateData: any = { 
        status,
        ...(status === 'RESOLVED' && { 
          actual_resolution_time: new Date().toISOString(),
          resolved_by_user_id: resolvedByUserId 
        })
      };

      const { error } = await supabase
        .from('truck_exceptions')
        .update(updateData)
        .eq('id', exceptionId);

      if (error) throw error;

      // Refresh data
      await fetchKPIData();

      toast({
        title: 'Exception Updated',
        description: `Exception status updated to ${status.toLowerCase()}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error updating exception',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchKPIData();
  }, [fetchKPIData]);

  return {
    kpiMetrics,
    exceptions,
    loading,
    refreshData: fetchKPIData,
    updateExceptionStatus
  };
};