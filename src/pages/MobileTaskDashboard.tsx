import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  User,
  Calendar,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTaskData, Task } from '@/hooks/useTaskData';
import { MobileTaskCompletionDialog } from '@/components/MobileTaskCompletionDialog';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'in_progress':
      return 'bg-blue-500';
    case 'pending':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'in_progress':
      return <Clock className="h-4 w-4" />;
    case 'pending':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <ClipboardList className="h-4 w-4" />;
  }
};

export const MobileTaskDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tasks, loading, refreshTasks, updateTaskStatus } = useTaskData();
  const [filter, setFilter] = useState('all');
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleRefresh = async () => {
    await refreshTasks();
    toast({
      title: "Tasks Updated",
      description: "Task list has been refreshed",
    });
  };

  const handleTaskAction = async (taskId: string, action: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let newStatus = task.status;
    let actionText = '';

    switch (action) {
      case 'start':
        newStatus = 'IN_PROGRESS';
        actionText = 'started';
        break;
      case 'complete':
        // Open completion dialog instead of directly completing
        setSelectedTask(task);
        setCompletionDialogOpen(true);
        return;
      case 'pause':
        newStatus = 'PENDING';
        actionText = 'paused';
        break;
    }

    const success = await updateTaskStatus(taskId, newStatus);
    if (success) {
      toast({
        title: `Task ${actionText}`,
        description: `"${task.title}" has been ${actionText}`,
      });
    }
  };

  const filteredTasks = tasks
    .filter(task => {
      if (filter === 'all') return true;
      return task.status.toLowerCase() === filter.toLowerCase();
    })
    .sort((a, b) => {
      // Priority order: IN_PROGRESS (active), PENDING (scheduled), COMPLETED (done)
      const statusOrder = { 'IN_PROGRESS': 1, 'PENDING': 2, 'COMPLETED': 3 };
      const aOrder = statusOrder[a.status as keyof typeof statusOrder] || 999;
      const bOrder = statusOrder[b.status as keyof typeof statusOrder] || 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Within same status, sort by due date, with null dates at the end
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const getTaskCounts = () => {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status.toLowerCase() === 'pending').length,
      in_progress: tasks.filter(t => t.status.toLowerCase() === 'in_progress').length,
      completed: tasks.filter(t => t.status.toLowerCase() === 'completed').length,
    };
  };

  const counts = getTaskCounts();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Tasks</h1>
              <p className="text-xs text-muted-foreground">Mobile Dashboard</p>
            </div>
          </div>
          
          <Button 
            onClick={handleRefresh} 
            variant="ghost" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Task Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{counts.total}</div>
              <div className="text-xs text-muted-foreground">Total Tasks</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{counts.in_progress}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-2 overflow-x-auto">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-shrink-0"
          >
            All ({counts.total})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className="flex-shrink-0"
          >
            Pending ({counts.pending})
          </Button>
          <Button
            variant={filter === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('in_progress')}
            className="flex-shrink-0"
          >
            Active ({counts.in_progress})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('completed')}
            className="flex-shrink-0"
          >
            Done ({counts.completed})
          </Button>
        </div>

        {/* Tasks List */}
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="space-y-3">
                  {/* Task Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{task.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority.toUpperCase()}
                      </Badge>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                    </div>
                  </div>

                   {/* Task Details */}
                   <div className="grid grid-cols-2 gap-2 text-xs">
                     {task.assigned_to_name && (
                       <div className="flex items-center space-x-1 text-muted-foreground">
                         <User className="h-3 w-3" />
                         <span>{task.assigned_to_name}</span>
                       </div>
                     )}
                     {task.due_date && (
                       <div className="flex items-center space-x-1 text-muted-foreground">
                         <Calendar className="h-3 w-3" />
                         <span>{new Date(task.due_date).toLocaleDateString()}</span>
                       </div>
                     )}
                     {task.truck_id && (
                       <div className="flex items-center space-x-1 text-muted-foreground">
                         <ClipboardList className="h-3 w-3" />
                         <span>Truck: {task.truck_id}</span>
                       </div>
                     )}
                     <div className="flex items-center space-x-1 text-muted-foreground">
                       <Calendar className="h-3 w-3" />
                       <span>{new Date(task.created_at).toLocaleDateString()}</span>
                     </div>
                   </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    {task.status.toLowerCase() === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTaskAction(task.id, 'start')}
                        className="flex-1 text-xs"
                      >
                        Start Task
                      </Button>
                    )}
                    {task.status.toLowerCase() === 'in_progress' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTaskAction(task.id, 'pause')}
                          className="flex-1 text-xs"
                        >
                          Pause
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleTaskAction(task.id, 'complete')}
                          className="flex-1 text-xs"
                        >
                          Complete
                        </Button>
                      </>
                    )}
                    {task.status.toLowerCase() === 'completed' && (
                      <div className="flex items-center space-x-1 text-green-600 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* User Info Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-muted-foreground">Logged in as:</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString('en-GB', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>

      <MobileTaskCompletionDialog
        taskId={selectedTask?.id || ''}
        taskTitle={selectedTask?.title || ''}
        isOpen={completionDialogOpen}
        onClose={() => {
          setCompletionDialogOpen(false);
          setSelectedTask(null);
        }}
        onComplete={() => {
          refreshTasks();
          setCompletionDialogOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};

export default MobileTaskDashboard;