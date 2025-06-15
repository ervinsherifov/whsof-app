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

export const useHistoricalTrends = (days: number = 30) => {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('performance_trends')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      // Use actual data or empty array if no data exists
      setTrends(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching trends',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [days, toast]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return {
    trends,
    loading,
    refreshTrends: fetchTrends
  };
};