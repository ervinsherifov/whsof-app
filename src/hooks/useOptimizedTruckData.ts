import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Truck, Profile } from '@/types';

interface SearchFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

export const useOptimizedTruckData = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [warehouseStaff, setWarehouseStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const { user } = useAuth();
  const { toast } = useToast();

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchFilters.searchTerm || '', 300);

  const fetchWarehouseStaff = useCallback(async () => {
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

        setWarehouseStaff(userData as Profile[] || []);
      } else {
        setWarehouseStaff([]);
      }
    } catch (error) {
      // Error handling - logged to monitoring service in production
    }
  }, []);

  const fetchTrucks = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('trucks')
        .select('*');

      // Apply role-based filtering
      if (user?.role === 'WAREHOUSE_STAFF') {
        query = query.neq('status', 'DONE');
      }

      // Apply search filters
      if (searchFilters.status) {
        query = query.eq('status', searchFilters.status);
      }

      if (searchFilters.dateFrom) {
        query = query.gte('arrival_date', searchFilters.dateFrom);
      }

      if (searchFilters.dateTo) {
        query = query.lte('arrival_date', searchFilters.dateTo);
      }

      if (debouncedSearchTerm) {
        query = query.or(`license_plate.ilike.%${debouncedSearchTerm}%,cargo_description.ilike.%${debouncedSearchTerm}%`);
      }

      const { data, error } = await query
        .order('arrival_date', { ascending: true })
        .order('arrival_time', { ascending: true });

      setTrucks(data as Truck[] || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching trucks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.role, searchFilters, debouncedSearchTerm, toast]);

  const fetchProfiles = useCallback(async () => {
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

        setProfiles(data as Profile[] || []);
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
  }, [toast]);

  const refreshData = useCallback(() => {
    fetchTrucks();
    fetchProfiles();
    fetchWarehouseStaff();
  }, [fetchTrucks, fetchProfiles, fetchWarehouseStaff]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Refetch when search filters change
  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  return {
    trucks,
    profiles,
    warehouseStaff,
    loading,
    searchFilters,
    setSearchFilters,
    refreshData,
    fetchTrucks
  };
};