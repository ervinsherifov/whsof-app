import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export const TaskManagement: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Mock task data
  const tasks = [
    {
      id: '1',
      title: 'Unload Truck ABC-123',
      description: 'Priority unloading of electronics shipment from Truck ABC-123 at Ramp 3',
      priority: 'URGENT',
      assignedUserId: '1',
      assignedUserName: 'John Smith',
      status: 'IN_PROGRESS',
      dueDate: '2024-06-07',
      dueTime: '10:00',
      createdAt: '2024-06-07T08:30:00Z',
    },
    {
      id: '2',
      title: 'Inventory Check - Section A',
      description: 'Complete inventory count for Section A warehouse storage',
      priority: 'MEDIUM',
      assignedUserId: '2',
      assignedUserName: 'Mike Johnson',
      status: 'PENDING',
      dueDate: '2024-06-07',
      dueTime: '15:00',
      createdAt: '2024-06-07T09:00:00Z',
    },
    {
      id: '3',
      title: 'Prepare Outbound Shipment',
      description: 'Load pallets for customer XYZ Corp onto Truck DEF-456',
      priority: 'HIGH',
      assignedUserId: '3',
      assignedUserName: 'Sarah Wilson',
      status: 'PENDING',
      dueDate: '2024-06-07',
      dueTime: '16:30',
      createdAt: '2024-06-07T07:45:00Z',
    },
    {
      id: '4',
      title: 'Equipment Maintenance',
      description: 'Monthly maintenance check on forklift units 1-3',
      priority: 'LOW',
      assignedUserId: '4',
      assignedUserName: 'David Brown',
      status: 'COMPLETED',
      dueDate: '2024-06-07',
      dueTime: '12:00',
      createdAt: '2024-06-07T06:00:00Z',
    }
  ];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: '',
    assignedUserId: '',
    dueDate: '',
    dueTime: ''
  });

  const warehouseStaff = [
    { id: '1', name: 'John Smith' },
    { id: '2', name: 'Mike Johnson' },
    { id: '3', name: 'Sarah Wilson' },
    { id: '4', name: 'David Brown' },
    { id: '5', name: 'Lisa Davis' },
  ];

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate time format (24-hour)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (formData.dueTime && !timeRegex.test(formData.dueTime)) {
      toast({
        title: 'Invalid time format',
        description: 'Please use 24-hour format (e.g., 14:30)',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Task created successfully',
      description: `Task "${formData.title}" has been assigned`,
    });

    setFormData({
      title: '',
      description: '',
      priority: '',
      assignedUserId: '',
      dueDate: '',
      dueTime: ''
    });
    setIsDialogOpen(false);
  };

  const updateTaskStatus = (taskId: string, newStatus: string) => {
    toast({
      title: 'Task status updated',
      description: `Task status changed to ${newStatus}`,
    });
  };

  const getPriorityCount = (priority: string) => {
    return tasks.filter(task => task.priority === priority && task.status !== 'COMPLETED').length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Management</h1>
          <p className="text-muted-foreground">
            Create and assign tasks to warehouse staff
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Task</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
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

              <div className="space-y-2">
                <Label htmlFor="assignedUserId">Assign to Staff</Label>
                <Select value={formData.assignedUserId} onValueChange={(value) => setFormData({...formData, assignedUserId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueTime">Due Time (24h)</Label>
                  <Input
                    id="dueTime"
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({...formData, dueTime: e.target.value})}
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
      <div className="grid gap-6 md:grid-cols-4">
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
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <div className="flex space-x-2">
                  <Badge variant={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  <Badge variant={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {task.description}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Assigned to:</span>
                    <div>{task.assignedUserName}</div>
                  </div>
                  <div>
                    <span className="font-medium">Due date:</span>
                    <div>{new Date(task.dueDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">Due time:</span>
                    <div>{task.dueTime}</div>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <div>{new Date(task.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {task.status === 'PENDING' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                    >
                      Start Task
                    </Button>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                    >
                      Mark Complete
                    </Button>
                  )}
                  <Button size="sm" variant="ghost">
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost">
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};