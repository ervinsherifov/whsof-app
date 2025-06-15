import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrendData {
  date: string;
  total_trucks: number;
  completed_trucks: number;
  avg_processing_hours: number;
  total_pallets: number;
  avg_efficiency: number;
}

export const useHistoricalTrends = (days: number = 30, refreshTrigger?: number) => {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      console.log('📈 Fetching trends from:', startDate.toISOString().split('T')[0], 'to:', new Date().toISOString().split('T')[0]);

      const { data, error } = await supabase
        .from('performance_trends')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      console.log('📈 Trends data received:', data?.length || 0, 'records');
      console.log('📈 Sample trend data:', data?.[0]);

      // Use actual data or empty array if no data exists
      setTrends(data || []);
    } catch (error: any) {
      console.error('📈 Error fetching trends:', error);
      toast({
        title: 'Error fetching trends',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [days, toast, refreshTrigger]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends, refreshTrigger]);

  return {
    trends,
    loading,
    refreshTrends: fetchTrends
  };
};