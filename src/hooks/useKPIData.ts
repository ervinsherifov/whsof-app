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
      
      // Fetch KPI metrics - filter by user if selected
      let kpiMetricsData;
      if (selectedUserId && selectedUserId !== 'all') {
        // Get user-specific KPI metrics by aggregating their data
        const { data: userSpecificData, error: userKpiError } = await supabase
          .from('user_kpi_with_profiles')
          .select('*')
          .eq('user_id', selectedUserId)
          .gte('metric_date', new Date(Date.now() - parseInt(selectedPeriod) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        
        if (userKpiError) throw userKpiError;
        
        // Aggregate user-specific data
        if (userSpecificData && userSpecificData.length > 0) {
          kpiMetricsData = {
            total_trucks: userSpecificData.reduce((sum, item) => sum + (item.total_trucks_handled || 0), 0),
            completed_trucks: userSpecificData.reduce((sum, item) => sum + (item.completed_trucks || 0), 0),
            in_progress_trucks: 0, // Will calculate from trucks table
            arrived_trucks: 0, // Will calculate from trucks table
            scheduled_trucks: 0, // Will calculate from trucks table
            urgent_trucks: 0,
            high_priority_trucks: 0,
            normal_priority_trucks: 0,
            low_priority_trucks: 0,
            avg_processing_hours: userSpecificData.reduce((sum, item) => sum + (item.avg_processing_hours || 0), 0) / userSpecificData.length,
            pending_exceptions: userSpecificData.reduce((sum, item) => sum + (item.exceptions_reported || 0), 0),
            resolved_exceptions: userSpecificData.reduce((sum, item) => sum + (item.exceptions_resolved || 0), 0),
            metric_date: new Date().toISOString().split('T')[0]
          };
          
          // Get actual truck status counts for the user
          const { data: userTrucks } = await supabase
            .from('trucks')
            .select('status, priority')
            .eq('handled_by_user_id', selectedUserId);
            
          if (userTrucks) {
            kpiMetricsData.in_progress_trucks = userTrucks.filter(t => t.status === 'IN_PROGRESS').length;
            kpiMetricsData.arrived_trucks = userTrucks.filter(t => t.status === 'ARRIVED').length;
            kpiMetricsData.scheduled_trucks = userTrucks.filter(t => t.status === 'SCHEDULED').length;
            kpiMetricsData.urgent_trucks = userTrucks.filter(t => t.priority === 'URGENT').length;
            kpiMetricsData.high_priority_trucks = userTrucks.filter(t => t.priority === 'HIGH').length;
            kpiMetricsData.normal_priority_trucks = userTrucks.filter(t => t.priority === 'NORMAL').length;
            kpiMetricsData.low_priority_trucks = userTrucks.filter(t => t.priority === 'LOW').length;
          }
        } else {
          // No data for this user
          kpiMetricsData = {
            total_trucks: 0,
            completed_trucks: 0,
            in_progress_trucks: 0,
            arrived_trucks: 0,
            scheduled_trucks: 0,
            urgent_trucks: 0,
            high_priority_trucks: 0,
            normal_priority_trucks: 0,
            low_priority_trucks: 0,
            avg_processing_hours: 0,
            pending_exceptions: 0,
            resolved_exceptions: 0,
            metric_date: new Date().toISOString().split('T')[0]
          };
        }
      } else {
        // Fetch overall KPI metrics
        const { data: kpiData, error: kpiError } = await supabase
          .from('kpi_metrics')
          .select('*')
          .single();

        if (kpiError) throw kpiError;
        kpiMetricsData = kpiData;
      }

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

      setKpiMetrics(kpiMetricsData);
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