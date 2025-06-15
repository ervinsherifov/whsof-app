import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeKPI = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const triggerRefresh = useCallback(() => {
    setLastUpdate(new Date());
    setRefreshTrigger(prev => prev + 1);
    console.log('🔄 KPI Refresh triggered at:', new Date().toISOString());
  }, []);

  useEffect(() => {
    // Subscribe to real-time changes in trucks table
    const trucksSubscription = supabase
      .channel('kpi-trucks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trucks'
        },
        (payload) => {
          console.log('🚛 Truck data changed:', payload);
          triggerRefresh();
        }
      )
      .subscribe();

    // Subscribe to real-time changes in truck_exceptions table
    const exceptionsSubscription = supabase
      .channel('kpi-exceptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'truck_exceptions'
        },
        (payload) => {
          console.log('⚠️ Exception data changed:', payload);
          triggerRefresh();
        }
      )
      .subscribe();

    // Subscribe to real-time changes in user_kpi_metrics table
    const kpiSubscription = supabase
      .channel('kpi-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_kpi_metrics'
        },
        (payload) => {
          console.log('📊 KPI metrics changed:', payload);
          triggerRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trucksSubscription);
      supabase.removeChannel(exceptionsSubscription);
      supabase.removeChannel(kpiSubscription);
    };
  }, [triggerRefresh]);

  return { lastUpdate, refreshTrigger };
};