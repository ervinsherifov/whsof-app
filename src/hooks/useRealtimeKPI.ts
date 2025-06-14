import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useRealtimeKPI = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

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
          setLastUpdate(new Date());
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New Truck Scheduled',
              description: `Truck ${payload.new.license_plate} has been added`,
              duration: 3000,
            });
          } else if (payload.eventType === 'UPDATE' && payload.new.status === 'COMPLETED') {
            toast({
              title: 'Truck Completed',
              description: `Truck ${payload.new.license_plate} has been completed`,
              duration: 3000,
            });
          }
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
          setLastUpdate(new Date());
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New Exception Reported',
              description: 'A new truck exception has been reported',
              variant: 'destructive',
              duration: 5000,
            });
          }
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
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trucksSubscription);
      supabase.removeChannel(exceptionsSubscription);
      supabase.removeChannel(kpiSubscription);
    };
  }, [toast]);

  return { lastUpdate };
};