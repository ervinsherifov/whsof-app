import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useTruckData = () => {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [warehouseStaff, setWarehouseStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWarehouseStaff = async () => {
    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'WAREHOUSE_STAFF');

      if (rolesError) throw rolesError;

      if (userRoles && userRoles.length > 0) {
        const userIds = userRoles.map(role => role.user_id);
        
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);

        if (userError) throw userError;
        setWarehouseStaff(userData || []);
      } else {
        setWarehouseStaff([]);
      }
    } catch (error) {
      console.error('Error fetching warehouse staff:', error);
    }
  };

  const fetchTrucks = async () => {
    try {
      let query = supabase
        .from('trucks')
        .select('*');

      if (user?.role === 'WAREHOUSE_STAFF') {
        query = query.neq('status', 'DONE');
      }

      const { data, error } = await query
        .order('arrival_date', { ascending: true })
        .order('arrival_time', { ascending: true });

      if (error) throw error;
      setTrucks(data || []);
    } catch (error: any) {
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
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'WAREHOUSE_STAFF');

      if (rolesError) throw rolesError;

      if (userRoles && userRoles.length > 0) {
        const userIds = userRoles.map(role => role.user_id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', userIds);

        if (error) throw error;
        setProfiles(data || []);
      } else {
        setProfiles([]);
      }
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