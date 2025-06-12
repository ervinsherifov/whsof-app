import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TaskCompletionDialog } from '@/components/TaskCompletionDialog';


export const TaskManagement: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignedTo: '',
    dueDate: '',
    dueTime: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchTrucks();
    fetchProfiles();
  }, []);

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tasks')
        .select('*');

      // Filter out COMPLETED tasks for warehouse staff
      if (user?.role === 'WAREHOUSE_STAFF') {
        query = query.neq('status', 'COMPLETED');
      }

      const { data: tasksData, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      let enrichedTasksData = tasksData || [];

      // Fetch related data separately to avoid foreign key conflicts
      if (tasksData && tasksData.length > 0) {
        // Get unique truck IDs
        const truckIds = [...new Set(tasksData.filter(task => task.truck_id).map(task => task.truck_id))];
        
        // Fetch trucks data
        let trucksData: any[] = [];
        if (truckIds.length > 0) {
          const { data: trucks } = await supabase
            .from('trucks')
            .select('id, license_plate')
            .in('id', truckIds);
          trucksData = trucks || [];
        }

        // Fetch task completion photos
        const taskIds = tasksData.map(task => task.id);
        const { data: photosData } = await supabase
          .from('task_completion_photos')
          .select('id, photo_url, created_at, task_id')
          .in('task_id', taskIds);

        // Attach related data to tasks
        enrichedTasksData = tasksData.map(task => ({
          ...task,
          trucks: task.truck_id ? trucksData.find(truck => truck.id === task.truck_id) : null,
          task_completion_photos: photosData?.filter(photo => photo.task_id === task.id) || []
        }));

        // Fetch user profiles for assigned and completed users
        const userIds = [
          ...new Set([
            ...enrichedTasksData.filter(task => task.assigned_to_user_id).map(task => task.assigned_to_user_id),
            ...enrichedTasksData.filter(task => task.completed_by_user_id).map(task => task.completed_by_user_id)
          ])
        ];

        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, display_name, email')
            .in('user_id', userIds);

          // Attach profile data to tasks
          enrichedTasksData = enrichedTasksData.map(task => ({
            ...task,
            assigned_profile: task.assigned_to_user_id ? profilesData?.find(p => p.user_id === task.assigned_to_user_id) : null,
            completed_profile: task.completed_by_user_id ? profilesData?.find(p => p.user_id === task.completed_by_user_id) : null
          }));
        }
      }

      setTasks(enrichedTasksData);
    } catch (error: any) {
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrucks = async () => {
    try {
      const { data, error } = await supabase
        .from('trucks')
        .select('id, license_plate, arrival_date, arrival_time, status')
        .in('status', ['SCHEDULED', 'ARRIVED'])
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
    }
  };

  const fetchProfiles = async () => {
    try {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'outline';
      case 'IN_PROGRESS':
        return 'default';
      case 'COMPLETED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Authentication error',
        description: 'You must be logged in to create tasks',
        variant: 'destructive',
      });
      return;
    }

    try {
      const selectedStaff = profiles.find(p => p.user_id === formData.assignedTo);
      
      let dueDateTime = null;
      if (formData.dueDate && formData.dueTime) {
        const taskDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`);
        const now = new Date();
        
        if (taskDateTime < now) {
          toast({
            title: 'Invalid due date',
            description: 'Cannot schedule tasks in the past',
            variant: 'destructive',
          });
          return;
        }
        
        dueDateTime = taskDateTime.toISOString();
      } else if (formData.dueDate) {
        const taskDate = new Date(formData.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (taskDate < today) {
          toast({
            title: 'Invalid due date',
            description: 'Cannot schedule tasks in the past',
            variant: 'destructive',
          });
          return;
        }
        
        dueDateTime = taskDate.toISOString();
      }
      
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          assigned_to_user_id: formData.assignedTo === 'unassigned' ? null : formData.assignedTo || null,
          assigned_to_name: selectedStaff?.display_name || selectedStaff?.email,
          due_date: dueDateTime,
          created_by_user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Task created successfully',
        description: `Task "${formData.title}" created successfully`,
      });

      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        assignedTo: '',
        dueDate: '',
        dueTime: ''
      });
      setIsDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error creating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    if (!user?.id) return;

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'COMPLETED') {
        updateData.completed_by_user_id = user.id;
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Task status updated',
        description: `Status changed to ${newStatus}`,
      });
      
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error updating task status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteTask = async (taskId: string, taskTitle: string) => {
    if (!user?.id || user.role !== 'SUPER_ADMIN') return;

    if (!confirm(`Are you sure you want to delete the task "${taskTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Task deleted',
        description: `Task "${taskTitle}" has been deleted`,
      });
      
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error deleting task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getPriorityCount = (priority: string) => {
    return tasks.filter(task => task.priority === priority && task.status !== 'COMPLETED').length;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  return (
    <div className="w-full max-w-none overflow-hidden space-y-4 sm:space-y-6 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Task Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Create and assign tasks to warehouse staff
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-full sm:w-auto">Create New Task</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Assign a task to warehouse staff
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Unload truck, inventory check, etc."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Detailed task description..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (DD/MM/YYYY)</Label>
                  <Input
                    id="dueDate"
                    type="text"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    placeholder="12/06/2025"
                    pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$"
                    title="Please enter date in DD/MM/YYYY format"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueTime">Due Time (24h format)</Label>
                  <Input
                    id="dueTime"
                    type="text"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({...formData, dueTime: e.target.value})}
                    placeholder="14:30"
                    pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
                    title="Please enter time in 24-hour format (HH:MM)"
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">Create Task</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Priority Overview */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Urgent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getPriorityCount('URGENT')}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{getPriorityCount('HIGH')}</div>
            <p className="text-xs text-muted-foreground">Important tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Medium Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{getPriorityCount('MEDIUM')}</div>
            <p className="text-xs text-muted-foreground">Standard tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Low Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getPriorityCount('LOW')}</div>
            <p className="text-xs text-muted-foreground">When time permits</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div>Loading tasks...</div>
      ) : (
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No tasks found. Create your first task!
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <div className="flex space-x-2">
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge variant={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Assigned to:</span>
                        <div>{task.assigned_profile?.display_name || task.assigned_profile?.email || task.assigned_to_name || 'Unassigned'}</div>
                      </div>
                      <div>
                        <span className="font-medium">Related truck:</span>
                        <div>{task.trucks?.license_plate || 'None'}</div>
                      </div>
                      <div>
                        <span className="font-medium">Due date:</span>
                        <div>{task.due_date ? formatDate(task.due_date) : 'No deadline'}</div>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>
                        <div>{formatDate(task.created_at)}</div>
                      </div>
                      {task.status === 'IN_PROGRESS' && task.assigned_profile && (
                        <div>
                          <span className="font-medium">Working on it:</span>
                          <div className="text-blue-600 font-semibold">{task.assigned_profile.display_name || task.assigned_profile.email}</div>
                        </div>
                      )}
                      {task.status === 'COMPLETED' && task.completed_profile && (
                        <div>
                          <span className="font-medium">Completed by:</span>
                          <div className="text-green-600 font-semibold">{task.completed_profile.display_name || task.completed_profile.email}</div>
                        </div>
                      )}
                    </div>

                    {task.status === 'COMPLETED' && task.completion_comment && (
                      <div className="space-y-2 p-3 bg-muted rounded-lg">
                        <div>
                          <span className="font-medium text-sm">Completion Comment:</span>
                          <p className="text-sm text-muted-foreground mt-1">{task.completion_comment}</p>
                        </div>
                        
                        {task.task_completion_photos && task.task_completion_photos.length > 0 && (
                          <div className="space-y-2">
                            <span className="font-medium text-sm">Completion Photos:</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {task.task_completion_photos.map((photo: any, index: number) => (
                                <img
                                  key={photo.id}
                                  src={photo.photo_url}
                                  alt={`Task completion photo ${index + 1}`}
                                  className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(photo.photo_url, '_blank')}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      {task.status === 'PENDING' && (user?.role === 'WAREHOUSE_STAFF' || user?.role === 'SUPER_ADMIN') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                        >
                          Start Task
                        </Button>
                      )}
                      {task.status === 'IN_PROGRESS' && (user?.role === 'WAREHOUSE_STAFF' || user?.role === 'SUPER_ADMIN') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedTask(task);
                            setCompletionDialogOpen(true);
                          }}
                        >
                          Mark Complete
                        </Button>
                      )}
                      {user?.role === 'SUPER_ADMIN' && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteTask(task.id, task.title)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <TaskCompletionDialog
        taskId={selectedTask?.id || ''}
        taskTitle={selectedTask?.title || ''}
        isOpen={completionDialogOpen}
        onClose={() => {
          setCompletionDialogOpen(false);
          setSelectedTask(null);
        }}
        onComplete={fetchTasks}
      />
    </div>
  );
};