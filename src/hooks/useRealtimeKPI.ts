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
    console.log('🔄 Setting up KPI real-time subscriptions');
    
    // Use a single channel for all subscriptions to avoid conflicts
    const channel = supabase
      .channel('kpi-realtime-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trucks'
        },
        (payload) => {
          console.log('🚛 Truck data changed:', payload.eventType, (payload.new as any)?.license_plate || (payload.old as any)?.license_plate);
          triggerRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'truck_exceptions'
        },
        (payload) => {
          console.log('⚠️ Exception data changed:', payload.eventType);
          triggerRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_kpi_metrics'
        },
        (payload) => {
          console.log('📊 KPI metrics changed:', payload.eventType);
          triggerRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performance_trends'
        },
        (payload) => {
          console.log('📈 Performance trends changed:', payload.eventType);
          triggerRefresh();
        }
      )
      .subscribe((status) => {
        console.log('🔄 KPI subscription status:', status);
      });

    return () => {
      console.log('🔄 Cleaning up KPI subscriptions');
      supabase.removeChannel(channel);
    };
  }, [triggerRefresh]);

  return { lastUpdate, refreshTrigger };
};