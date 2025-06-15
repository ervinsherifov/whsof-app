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

export const useUserKPIData = (selectedUserId?: string, selectedPeriod: string = '30', refreshTrigger?: number) => {
  const [userKPIs, setUserKPIs] = useState<UserKPIMetrics[]>([]);
  const [warehouseUsers, setWarehouseUsers] = useState<WarehouseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserKPIData = useCallback(async () => {
    try {
      setLoading(true);

      // Always use the detailed user_kpi_metrics table for accurate data
      let userKPIQuery = supabase
        .from('user_kpi_with_profiles')
        .select('*')
        .order('completed_trucks', { ascending: false });

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

      // Aggregate data by user if multiple metrics exist for the same user
      const aggregatedData = (userKPIData || []).reduce((acc: any[], item: any) => {
        const existingUser = acc.find(u => u.user_id === item.user_id);
        if (existingUser) {
          // Sum the metrics
          existingUser.total_trucks_handled += item.total_trucks_handled || 0;
          existingUser.completed_trucks += item.completed_trucks || 0;
          existingUser.tasks_completed += item.tasks_completed || 0;
          existingUser.total_pallets_handled += item.total_pallets_handled || 0;
          existingUser.exceptions_reported += item.exceptions_reported || 0;
          existingUser.exceptions_resolved += item.exceptions_resolved || 0;
          // Average the time-based metrics
          const count = existingUser._count + 1;
          existingUser.avg_processing_hours = (existingUser.avg_processing_hours * existingUser._count + (item.avg_processing_hours || 0)) / count;
          existingUser.avg_pallets_per_truck = (existingUser.avg_pallets_per_truck * existingUser._count + (item.avg_pallets_per_truck || 0)) / count;
          existingUser.avg_unloading_speed_pallets_per_hour = (existingUser.avg_unloading_speed_pallets_per_hour * existingUser._count + (item.avg_unloading_speed_pallets_per_hour || 0)) / count;
          existingUser._count = count;
        } else {
          acc.push({
            ...item,
            _count: 1
          });
        }
        return acc;
      }, []);

      setUserKPIs(aggregatedData);
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
  }, [toast, selectedUserId, selectedPeriod, refreshTrigger]);

  useEffect(() => {
    fetchUserKPIData();
  }, [fetchUserKPIData, refreshTrigger]);

  return {
    userKPIs,
    warehouseUsers,
    loading,
    refreshData: fetchUserKPIData
  };
};