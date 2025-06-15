import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { captureError } from '@/lib/sentry';
import { measureDataFetch } from '@/lib/performance';

export const useTruckData = () => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [warehouseStaff, setWarehouseStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWarehouseStaff = async () => {
    try {
      // Optimized: Use join to fetch profiles and roles in single query
      const { data: userData, error } = await supabase
        .from('profiles')
        .select(`
          user_id, 
          display_name, 
          email,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'WAREHOUSE_STAFF');

      if (error) throw error;
      setWarehouseStaff(userData || []);
    } catch (error) {
      console.error('Error fetching warehouse staff:', error);
    }
  };

  const fetchTrucks = async () => {
    try {
      await measureDataFetch('trucks', async () => {
        let query = supabase
          .from('trucks')
          .select(`
            *,
            created_by_profile:profiles!trucks_created_by_user_id_fkey(
              display_name,
              email
            )
          `);

        if (user?.role === 'WAREHOUSE_STAFF') {
          query = query.neq('status', 'DONE');
        }

        const { data, error } = await query
          .order('arrival_date', { ascending: true })
          .order('arrival_time', { ascending: true });

        if (error) throw error;
        setTrucks(data || []);
      });
    } catch (error: any) {
      captureError(error, {
        context: 'fetchTrucks',
        userRole: user?.role,
        userId: user?.id
      });
      toast({
        title: 'Error fetching trucks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      // Optimized: Use join to fetch profiles and roles in single query
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id, 
          display_name, 
          email,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'WAREHOUSE_STAFF');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching staff',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const refreshData = () => {
    fetchTrucks();
    fetchProfiles();
    fetchWarehouseStaff();
  };

  useEffect(() => {
    refreshData();
  }, []);

  return {
    trucks,
    profiles,
    warehouseStaff,
    loading,
    refreshData,
    fetchTrucks
  };
};