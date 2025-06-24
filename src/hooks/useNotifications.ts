import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Truck } from '@/types';
import type { Task } from '@/hooks/useTaskData';

interface NotificationOptions {
  enableSound?: boolean;
  soundVolume?: number;
}

export const useNotifications = (options: NotificationOptions = {}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { enableSound = false, soundVolume = 0.5 } = options;
  
  // Use refs to store audio instances
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const urgentSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enableSound) return;

    // Create audio instances (using data URLs for simple notification sounds)
    notificationSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmcoB0CA0PjNfDgGHF2m6eJ9Qw4KRajiuVkZCzvr4I6X1qxdVYMqJgAKAE4AVQBxAIYAmAW+4Yr6MQIUHSgb/hQVB+Hb0C5y/gR1n+b6vhEBANLfUYwUAg3m2fqT/fI=' );
    urgentSoundRef.current = new Audio('data:audio/wav;base64,UklGRswBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YcgBAAC+3/mh/v8Bb/7/BrD9/w68+/8U3vn/HRj4/yco9v80Xfb/PKL2/z883v86QOH/NkXh/zVC3/8xR+D/LUze/ylR3v8lUtf/IVXn/x5Y7P8bbNv/GXTk/xZ67v8Tgun/EYrr/w+P1P8NltL/DBGm/wvF/gqr/cqR/sC3/bmo/rCb/rWV/ruN/sGF/sV+/sl2/s1u/tFm/tVe/tle/t1W/eFO/eNH/eQ//eY7/eVA/eVH/eNO/eFV/d1c/dpj/ddq/dNy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy/tJy');
    
    // Set volume
    if (notificationSoundRef.current) {
      notificationSoundRef.current.volume = soundVolume;
    }
    if (urgentSoundRef.current) {
      urgentSoundRef.current.volume = soundVolume;
    }

    return () => {
      // Cleanup audio instances
      if (notificationSoundRef.current) {
        notificationSoundRef.current = null;
      }
      if (urgentSoundRef.current) {
        urgentSoundRef.current = null;
      }
    };
  }, [enableSound, soundVolume]);

  const playNotificationSound = (isUrgent: boolean = false) => {
    if (!enableSound) return;
    
    const audio = isUrgent ? urgentSoundRef.current : notificationSoundRef.current;
    if (audio) {
      // Reset and play
      audio.currentTime = 0;
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscriptions for trucks
    const trucksChannel = supabase
      .channel('trucks-notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'trucks' }, 
        (payload) => {
          const newTruck = payload.new as Truck;
          const isUrgent = newTruck.priority === 'URGENT';
          
          toast({
            title: `${isUrgent ? '🚨 URGENT' : '🚛'} New Truck Scheduled`,
            description: `${newTruck.license_plate} - ${newTruck.cargo_description}`,
            variant: isUrgent ? 'destructive' : 'default',
          });
          
          playNotificationSound(isUrgent);
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'trucks' }, 
        (payload) => {
          const updatedTruck = payload.new as Truck;
          const oldTruck = payload.old as Truck;
          
          // Only notify on status changes
          if (updatedTruck.status !== oldTruck.status) {
            toast({
              title: '📋 Truck Status Updated',
              description: `${updatedTruck.license_plate} is now ${updatedTruck.status}`,
            });
            
            playNotificationSound(false);
          }
        }
      )
      .subscribe();

    // Set up real-time subscriptions for tasks
    const tasksChannel = supabase
      .channel('tasks-notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'tasks' }, 
        (payload) => {
          const newTask = payload.new as Task;
          const isUrgent = newTask.priority === 'URGENT';
          
          // Only show notifications for tasks assigned to current user or if user is admin
          if (newTask.assigned_to_user_id === user.id || user.role === 'SUPER_ADMIN' || user.role === 'OFFICE_ADMIN') {
            toast({
              title: `${isUrgent ? '🚨 URGENT' : '📋'} New Task Assigned`,
              description: newTask.title,
              variant: isUrgent ? 'destructive' : 'default',
            });
            
            playNotificationSound(isUrgent);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trucksChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [user, toast, enableSound]);

  return {
    playNotificationSound,
  };
};