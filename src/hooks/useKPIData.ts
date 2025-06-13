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

interface UserKPIMetrics {
  id: string;
  user_id: string;
  metric_date: string;
  total_trucks_handled: number;
  completed_trucks: number;
  avg_processing_hours: number;
  tasks_completed: number;
  exceptions_reported: number;
  exceptions_resolved: number;
  display_name: string;
  email: string;
}

interface WarehouseUser {
  user_id: string;
  display_name: string;
  email: string;
}

export const useKPIData = (selectedUserId?: string, selectedPeriod: string = '30') => {
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [userKPIs, setUserKPIs] = useState<UserKPIMetrics[]>([]);
  const [warehouseUsers, setWarehouseUsers] = useState<WarehouseUser[]>([]);
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

      // Fetch user KPIs based on filters
      let userKPIQuery = supabase
        .from('user_kpi_with_profiles')
        .select('*')
        .order('total_trucks_handled', { ascending: false });

      // Apply date filter
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(selectedPeriod));
      userKPIQuery = userKPIQuery.gte('metric_date', daysAgo.toISOString().split('T')[0]);

      // Apply user filter if specified
      if (selectedUserId && selectedUserId !== 'all') {
        userKPIQuery = userKPIQuery.eq('user_id', selectedUserId);
      }

      const { data: userKPIData, error: userKPIError } = await userKPIQuery.limit(10);

      if (userKPIError) throw userKPIError;

      // Fetch warehouse users for dropdown (only warehouse staff)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          user_id, 
          display_name, 
          email,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'WAREHOUSE_STAFF')
        .order('display_name');

      if (usersError) throw usersError;

      setKpiMetrics(kpiData);
      setUserKPIs(userKPIData || []);
      setWarehouseUsers(usersData || []);
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
  }, [toast, selectedUserId, selectedPeriod]);

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
    userKPIs,
    warehouseUsers,
    exceptions,
    loading,
    refreshData: fetchKPIData,
    updateExceptionStatus
  };
};