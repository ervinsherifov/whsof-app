import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export const UserManagement: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Mock user data
  const users = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@warehouse.com',
      role: 'WAREHOUSE_STAFF',
      isActive: true,
      createdAt: '2024-01-15T09:00:00Z',
      lastLogin: '2024-06-07T08:30:00Z',
    },
    {
      id: '2',
      name: 'Mike Johnson',
      email: 'mike.johnson@warehouse.com',
      role: 'WAREHOUSE_STAFF',
      isActive: true,
      createdAt: '2024-02-01T10:00:00Z',
      lastLogin: '2024-06-07T08:15:00Z',
    },
    {
      id: '3',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@warehouse.com',
      role: 'OFFICE_ADMIN',
      isActive: true,
      createdAt: '2024-01-10T08:00:00Z',
      lastLogin: '2024-06-07T07:45:00Z',
    },
    {
      id: '4',
      name: 'David Brown',
      email: 'david.brown@warehouse.com',
      role: 'WAREHOUSE_STAFF',
      isActive: false,
      createdAt: '2024-03-15T11:00:00Z',
      lastLogin: '2024-06-05T16:30:00Z',
    },
    {
      id: '5',
      name: 'Lisa Davis',
      email: 'lisa.davis@warehouse.com',
      role: 'SUPER_ADMIN',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      lastLogin: '2024-06-07T09:00:00Z',
    }
  ];

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: ''
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'OFFICE_ADMIN':
        return 'default';
      case 'WAREHOUSE_STAFF':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'OFFICE_ADMIN':
        return 'Office Admin';
      case 'WAREHOUSE_STAFF':
        return 'Warehouse Staff';
      default:
        return role;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'User created successfully',
      description: `User ${formData.name} has been added to the system`,
    });

    setFormData({
      name: '',
      email: '',
      role: '',
      password: '',
      confirmPassword: ''
    });
    setIsDialogOpen(false);
  };

  const toggleUserStatus = (userId: string, currentStatus: boolean) => {
    toast({
      title: 'User status updated',
      description: `User ${currentStatus ? 'deactivated' : 'activated'}`,
    });
  };

  const resetPassword = (userId: string, userName: string) => {
    toast({
      title: 'Password reset',
      description: `Password has been reset for ${userName}`,
    });
  };

  const deleteUser = (userId: string, userName: string) => {
    toast({
      title: 'User deleted',
      description: `User ${userName} has been removed from the system`,
      variant: 'destructive',
    });
  };

  const getRoleStats = () => {
    const stats = {
      SUPER_ADMIN: 0,
      OFFICE_ADMIN: 0,
      WAREHOUSE_STAFF: 0,
      ACTIVE: 0,
      INACTIVE: 0
    };

    users.forEach(user => {
      stats[user.role as keyof typeof stats]++;
      if (user.isActive) {
        stats.ACTIVE++;
      } else {
        stats.INACTIVE++;
      }
    });

    return stats;
  };

  const stats = getRoleStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users and permissions
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add New User</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Smith"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="john.smith@warehouse.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WAREHOUSE_STAFF">Warehouse Staff</SelectItem>
                    <SelectItem value="OFFICE_ADMIN">Office Admin</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="Confirm password"
                  required
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">Create User</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Statistics */}
      <div className="grid gap-6 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.SUPER_ADMIN}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Office Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.OFFICE_ADMIN}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Warehouse Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.WAREHOUSE_STAFF}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ACTIVE}</div>
            <p className="text-xs text-muted-foreground">{stats.INACTIVE} inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => toggleUserStatus(user.id, user.isActive)}
                      />
                      <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resetPassword(user.id, user.name)}
                      >
                        Reset Password
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteUser(user.id, user.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};