import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserKPIMetrics {
  user_id: string;
  display_name: string;
  email: string;
  total_working_hours: number;
  total_overtime_hours: number;
  total_tasks_completed: number;
  total_trucks_completed: number;
  avg_processing_hours: number;
  active_days: number;
  last_activity_date: string;
  // Keep these for compatibility with the component
  total_trucks_handled?: number;
  completed_trucks?: number;
  tasks_completed?: number;
  total_pallets_handled?: number;
  avg_pallets_per_truck?: number;
  avg_unloading_speed_pallets_per_hour?: number;
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

      // Fetch user KPIs based on filters - use the materialized view instead
      let userKPIQuery = supabase
        .from('user_performance_summary')
        .select('*')
        .order('total_trucks_completed', { ascending: false });

      // Apply date filter - the materialized view already filters to last 7 days
      // For periods longer than 7 days, we'll need to fall back to the detailed metrics
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(selectedPeriod));
      if (parseInt(selectedPeriod) <= 7) {
        // Use materialized view for recent data
        userKPIQuery = userKPIQuery.gte('last_activity_date', daysAgo.toISOString().split('T')[0]);
      }

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
        // Map new fields to old field names for component compatibility
        total_trucks_handled: item.total_trucks_completed || 0,
        completed_trucks: item.total_trucks_completed || 0,
        tasks_completed: item.total_tasks_completed || 0,
        total_pallets_handled: 0, // Not available in user_performance_summary
        avg_pallets_per_truck: 0, // Not available in user_performance_summary
        avg_unloading_speed_pallets_per_hour: 0 // Not available in user_performance_summary
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