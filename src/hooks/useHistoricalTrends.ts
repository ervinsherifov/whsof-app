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

      // If no data exists, generate sample data for last 30 days
      if (!data || data.length === 0) {
        const sampleData: TrendData[] = [];
        for (let i = days; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          sampleData.push({
            date: date.toISOString().split('T')[0],
            total_trucks: Math.floor(Math.random() * 20) + 10,
            completed_trucks: Math.floor(Math.random() * 15) + 8,
            avg_processing_hours: Math.random() * 3 + 2,
            total_pallets: Math.floor(Math.random() * 200) + 100,
            avg_efficiency: Math.random() * 20 + 15
          });
        }
        setTrends(sampleData);
      } else {
        setTrends(data);
      }
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