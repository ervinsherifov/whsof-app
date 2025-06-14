import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getGlobalCache } from './useDataCache';
import { Truck, Profile } from '@/types';

interface SearchFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

export const useCachedTruckData = () => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [warehouseStaff, setWarehouseStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  
  const { user } = useAuth();
  const { toast } = useToast();
  const cache = getGlobalCache();

  const fetchWarehouseStaff = useCallback(async (): Promise<Profile[]> => {
    const cacheKey = 'warehouse_staff';
    const cached = cache.get<Profile[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data: userData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id, 
          display_name, 
          email,
          created_at,
          updated_at,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'WAREHOUSE_STAFF');

      if (error) throw error;
      
      const transformedData = userData?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        display_name: item.display_name,
        email: item.email,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) || [];

      // Cache for 10 minutes (staff data changes infrequently)
      cache.set(cacheKey, transformedData, 600000);
      return transformedData;
    } catch (error) {
      console.error('Error fetching warehouse staff:', error);
      return [];
    }
  }, [cache]);

  const fetchTrucks = useCallback(async () => {
    try {
      setLoading(true);
      
      // Generate cache key based on filters
      const filterKey = JSON.stringify({
        role: user?.role,
        ...searchFilters
      });
      const cacheKey = `trucks_${filterKey}`;
      const cached = cache.get<Truck[]>(cacheKey);
      
      if (cached) {
        setTrucks(cached);
        setLoading(false);
        return;
      }

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
      if (searchFilters.searchTerm) {
        query = query.or(`license_plate.ilike.%${searchFilters.searchTerm}%,cargo_description.ilike.%${searchFilters.searchTerm}%`);
      }

      const { data, error } = await query
        .order('arrival_date', { ascending: true })
        .order('arrival_time', { ascending: true });

      if (error) throw error;
      
      const trucksData = data as Truck[] || [];
      
      // Cache for 2 minutes (truck data changes more frequently)
      cache.set(cacheKey, trucksData, 120000);
      setTrucks(trucksData);
    } catch (error: any) {
      toast({
        title: 'Error fetching trucks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.role, searchFilters, cache, toast]);

  const refreshData = useCallback(async () => {
    // Invalidate relevant caches when refreshing
    cache.invalidatePattern('trucks_');
    cache.invalidate('warehouse_staff');
    
    const [staffData] = await Promise.all([
      fetchWarehouseStaff(),
      fetchTrucks()
    ]);
    
    setWarehouseStaff(staffData);
    setProfiles(staffData); // Same data for both
  }, [fetchWarehouseStaff, fetchTrucks, cache]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  // Refetch when search filters change
  useEffect(() => {
    fetchTrucks();
  }, [searchFilters]);

  // Real-time subscription for truck updates
  useEffect(() => {
    const trucksSubscription = supabase
      .channel('trucks-cache-invalidation')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trucks'
        },
        () => {
          // Invalidate truck caches when data changes
          cache.invalidatePattern('trucks_');
          fetchTrucks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trucksSubscription);
    };
  }, [cache, fetchTrucks]);

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