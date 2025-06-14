import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { KPIMetrics } from '@/types';

export const useKPIMetrics = (selectedUserId?: string, selectedPeriod: string = '30') => {
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchKPIMetrics = useCallback(async () => {
    try {
      setLoading(true);
      
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
            in_progress_trucks: 0,
            arrived_trucks: 0,
            scheduled_trucks: 0,
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

      setKpiMetrics(kpiMetricsData);
    } catch (error: any) {
      toast({
        title: 'Error fetching KPI metrics',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedUserId, selectedPeriod]);

  useEffect(() => {
    fetchKPIMetrics();
  }, [fetchKPIMetrics]);

  return {
    kpiMetrics,
    loading,
    refreshData: fetchKPIMetrics
  };
};