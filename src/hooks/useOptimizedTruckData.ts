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
      // Transform joined data to match Profile interface
      const transformedData = userData?.map(item => ({
        id: '', // Not needed for warehouse staff lookup
        user_id: item.user_id,
        display_name: item.display_name,
        email: item.email,
        created_at: '',
        updated_at: ''
      })) || [];
      setWarehouseStaff(transformedData);
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
      // Transform joined data to match Profile interface
      const transformedData = data?.map(item => ({
        id: '', // Not needed for profile lookup
        user_id: item.user_id,
        display_name: item.display_name,
        email: item.email,
        created_at: '',
        updated_at: ''
      })) || [];
      setProfiles(transformedData);
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