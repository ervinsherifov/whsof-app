import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CheckInStatus {
  isCheckedIn: boolean;
  currentEntry: any | null;
  isLoading: boolean;
}

export const useCheckInStatus = (): CheckInStatus => {
  const { user } = useAuth();
  const [status, setStatus] = useState<CheckInStatus>({
    isCheckedIn: false,
    currentEntry: null,
    isLoading: true
  });

  const fetchCurrentStatus = async () => {
    if (!user?.id) {
      setStatus({ isCheckedIn: false, currentEntry: null, isLoading: false });
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: currentEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in_time', `${today}T00:00:00.000Z`)
        .is('check_out_time', null)
        .maybeSingle();

      setStatus({
        isCheckedIn: !!currentEntry,
        currentEntry,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching check-in status:', error);
      setStatus({ isCheckedIn: false, currentEntry: null, isLoading: false });
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    fetchCurrentStatus();

    // Set up real-time subscription
    const channel = supabase
      .channel('check-in-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Re-fetch status when time entries change
          fetchCurrentStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return status;
};