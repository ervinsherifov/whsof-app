import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserKPIMetrics {
  id: string;
  user_id: string;
  metric_date: string;
  total_trucks_handled: number;
  completed_trucks: number;
  avg_processing_hours: number;
  tasks_completed: number;
  exceptions_reported: number;
  exceptions_resolved: number;
  total_pallets_handled: number;
  avg_pallets_per_truck: number;
  avg_unloading_speed_pallets_per_hour: number;
  display_name: string;
  email: string;
}

export interface WarehouseUser {
  user_id: string;
  display_name: string;
  email: string;
}

export const useUserKPIData = (selectedUserId?: string, selectedPeriod: string = '30') => {
  const [userKPIs, setUserKPIs] = useState<UserKPIMetrics[]>([]);
  const [warehouseUsers, setWarehouseUsers] = useState<WarehouseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserKPIData = useCallback(async () => {
    try {
      setLoading(true);

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

      setUserKPIs((userKPIData || []).map((item: any) => ({
        ...item,
        total_pallets_handled: item.total_pallets_handled || 0,
        avg_pallets_per_truck: item.avg_pallets_per_truck || 0,
        avg_unloading_speed_pallets_per_hour: item.avg_unloading_speed_pallets_per_hour || 0
      })));
      setWarehouseUsers(usersData || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching user KPI data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedUserId, selectedPeriod]);

  useEffect(() => {
    fetchUserKPIData();
  }, [fetchUserKPIData]);

  return {
    userKPIs,
    warehouseUsers,
    loading,
    refreshData: fetchUserKPIData
  };
};