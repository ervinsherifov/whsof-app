import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  completed_by_user_id: string | null;
  created_by_user_id: string;
  truck_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  completion_comment: string | null;
  created_at: string;
  updated_at: string;
  created_by_profile?: {
    display_name: string | null;
    email: string | null;
  };
}

export const useTaskData = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          created_by_profile:profiles!tasks_created_by_user_id_fkey(
            display_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTasks((data as any) || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      console.log('Starting task update:', { taskId, newStatus });
      
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Get current user data for setting assigned_to_name
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Current user:', currentUser?.id);
      
      // If starting the task, set assignment details
      if (newStatus === 'IN_PROGRESS' && currentUser) {
        updates.assigned_to_user_id = currentUser.id;
        // Get user profile for display name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        
        console.log('Profile data:', profileData);
        updates.assigned_to_name = profileData?.display_name || profileData?.email || 'Unknown User';
        console.log('Setting assigned_to_name to:', updates.assigned_to_name);
      }

      // If completing the task, set completion details
      if (newStatus === 'COMPLETED') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by_user_id = (await supabase.auth.getUser()).data.user?.id;
      }

      console.log('Updates to apply:', updates);

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, ...updates }
          : task
      ));

      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTasks();

    // Set up real-time subscription
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          fetchTasks(); // Refresh tasks when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    tasks,
    loading,
    refreshTasks: fetchTasks,
    updateTaskStatus,
  };
};