import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/dateUtils';
import { Users, UserPlus, Shield, Trash2, RefreshCw, Search, Filter } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  role: 'WAREHOUSE_STAFF' | 'OFFICE_ADMIN' | 'SUPER_ADMIN';
  last_active?: string;
  is_active?: boolean;
  is_creator?: boolean;
}

interface UserStats {
  total: number;
  active_today: number;
  super_admins: number;
  office_admins: number;
  warehouse_staff: number;
}

export const UserManagement: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: ''
  });

  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active_today: 0,
    super_admins: 0,
    office_admins: 0,
    warehouse_staff: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch profiles with recent activity
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, 
          user_id, 
          display_name, 
          email, 
          created_at
        `);

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get recent activity (check-ins today)
      const today = new Date().toISOString().split('T')[0];
      const { data: activeUsers, error: activityError } = await supabase
        .from('time_entries')
        .select('user_id')
        .gte('check_in_time', `${today}T00:00:00.000Z`)
        .lt('check_in_time', `${today}T23:59:59.999Z`);

      if (activityError) console.warn('Could not fetch activity data:', activityError);

      const activeUserIds = new Set(activeUsers?.map(entry => entry.user_id) || []);

      // Combine data
      const usersWithRoles = profiles?.map((profile: any) => {
        const userRole = roles?.find((role: any) => role.user_id === profile.user_id);
        const isCreator = profile.email?.toLowerCase() === 'ervin.sherifov@dhl.com';
        console.log('Profile email:', profile.email, 'Is Creator:', isCreator); // Debug log
        return {
          ...profile,
          role: (userRole?.role || 'WAREHOUSE_STAFF') as 'WAREHOUSE_STAFF' | 'OFFICE_ADMIN' | 'SUPER_ADMIN',
          is_active: activeUserIds.has(profile.user_id),
          is_creator: isCreator
        };
      }) || [];

      // Sort users: Creator first, then by role hierarchy, then by name
      const sortedUsers = usersWithRoles.sort((a, b) => {
        // Creator always first
        if (a.is_creator && !b.is_creator) return -1;
        if (!a.is_creator && b.is_creator) return 1;
        
        // Role hierarchy
        const roleOrder = { 'SUPER_ADMIN': 1, 'OFFICE_ADMIN': 2, 'WAREHOUSE_STAFF': 3 };
        const aOrder = roleOrder[a.role];
        const bOrder = roleOrder[b.role];
        
        if (aOrder !== bOrder) return aOrder - bOrder;
        
        // Then by name
        const aName = a.display_name || a.email || '';
        const bName = b.display_name || b.email || '';
        return aName.localeCompare(bName);
      });

      setUsers(sortedUsers);
      
      // Calculate stats
      const newStats: UserStats = {
        total: sortedUsers.length,
        active_today: activeUserIds.size,
        super_admins: sortedUsers.filter(u => u.role === 'SUPER_ADMIN').length,
        office_admins: sortedUsers.filter(u => u.role === 'OFFICE_ADMIN').length,
        warehouse_staff: sortedUsers.filter(u => u.role === 'WAREHOUSE_STAFF').length
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string, isCreator?: boolean) => {
    if (isCreator) return 'default';
    switch (role) {
      case 'SUPER_ADMIN': return 'destructive';
      case 'OFFICE_ADMIN': return 'default';
      case 'WAREHOUSE_STAFF': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string, isCreator?: boolean) => {
    if (isCreator) return 'System Owner';
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'OFFICE_ADMIN': return 'Office Admin';
      case 'WAREHOUSE_STAFF': return 'Warehouse Staff';
      default: return role;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Password too weak',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);

      // Use the create-user Edge Function to avoid session interference
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'User created successfully',
        description: `${formData.name} has been added to the system`,
      });

      setFormData({ name: '', email: '', role: '', password: '', confirmPassword: '' });
      setIsDialogOpen(false);
      fetchUsers();

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error creating user',
        description: error.message || 'An error occurred while creating the user',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string, userName: string, userEmail?: string) => {
    if (userEmail?.toLowerCase() === 'ervin.sherifov@dhl.com') {
      toast({
        title: 'Cannot modify app creator',
        description: 'The app creator\'s role cannot be changed',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Role updated',
        description: `${userName}'s role has been updated to ${getRoleLabel(newRole)}`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error updating role',
        description: error.message || 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const deleteUser = async (userId: string, userName: string, userEmail?: string) => {
    if (userEmail?.toLowerCase() === 'ervin.sherifov@dhl.com') {
      toast({
        title: 'Cannot delete app creator',
        description: 'The app creator account cannot be deleted',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Use the Edge Function to properly delete the user from auth.users
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'User deleted',
        description: `${userName} has been completely removed from the system`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error deleting user',
        description: error.message || 'Failed to delete user completely',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-display text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="text-caption mt-2">
            Manage system users, roles, and permissions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchUsers} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with role-based permissions
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                  <Label className="form-label">Full Name</Label>
                  <Input
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Smith"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div className="form-group">
                  <Label className="form-label">Email Address</Label>
                  <Input
                    className="form-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john.smith@company.com"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div className="form-group">
                  <Label className="form-label">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData({...formData, role: value})}
                    disabled={isCreating}
                  >
                    <SelectTrigger className="form-input">
                      <SelectValue placeholder="Select user role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAREHOUSE_STAFF">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Warehouse Staff
                        </div>
                      </SelectItem>
                      <SelectItem value="OFFICE_ADMIN">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Office Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="SUPER_ADMIN">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Super Admin
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-group">
                  <Label className="form-label">Password</Label>
                  <Input
                    className="form-input"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Minimum 8 characters"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div className="form-group">
                  <Label className="form-label">Confirm Password</Label>
                  <Input
                    className="form-input"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    placeholder="Confirm password"
                    required
                    disabled={isCreating}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create User'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <Card className="card-elevated">
          <CardContent className="p-6 text-center flex flex-col justify-center min-h-[120px]">
            <div className="text-3xl font-bold font-mono text-foreground mb-2">{stats.total}</div>
            <div className="text-sm text-muted-foreground font-medium">Total Users</div>
          </CardContent>
        </Card>
        
        <Card className="card-elevated">
          <CardContent className="p-6 text-center flex flex-col justify-center min-h-[120px]">
            <div className="text-3xl font-bold font-mono text-green-600 mb-2">{stats.active_today}</div>
            <div className="text-sm text-muted-foreground font-medium">Active Today</div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6 text-center flex flex-col justify-center min-h-[120px]">
            <div className="text-3xl font-bold font-mono text-red-600 mb-2">{stats.super_admins}</div>
            <div className="text-sm text-muted-foreground font-medium">Super Admins</div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6 text-center flex flex-col justify-center min-h-[120px]">
            <div className="text-3xl font-bold font-mono text-blue-600 mb-2">{stats.office_admins}</div>
            <div className="text-sm text-muted-foreground font-medium">Office Admins</div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6 text-center flex flex-col justify-center min-h-[120px]">
            <div className="text-3xl font-bold font-mono text-green-600 mb-2">{stats.warehouse_staff}</div>
            <div className="text-sm text-muted-foreground font-medium">Warehouse Staff</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            All Users ({users.length})
          </CardTitle>
          <CardDescription>
            Manage user accounts and role-based permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          user.is_creator 
                            ? 'bg-primary/10 border-2 border-primary/30' 
                            : 'bg-primary/10'
                        }`}>
                          <span className="text-sm font-medium text-primary">
                            {(user.display_name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.display_name || 'No Name'}</span>
                          </div>
                          <div className="text-caption">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={user.role} 
                          onValueChange={(newRole) => updateUserRole(user.user_id, newRole, user.display_name || user.email || 'User', user.email)}
                          disabled={user.is_creator}
                        >
                           <SelectTrigger className="w-44 h-9">
                             <Badge variant={getRoleBadgeVariant(user.role, user.is_creator)} className="text-xs font-medium w-full justify-center">
                               {getRoleLabel(user.role, user.is_creator)}
                             </Badge>
                           </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WAREHOUSE_STAFF">Warehouse Staff</SelectItem>
                            <SelectItem value="OFFICE_ADMIN">Office Admin</SelectItem>
                            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                          </SelectContent>
                         </Select>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`status-dot ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm">
                          {user.is_active ? 'Active Today' : 'Inactive'}
                        </span>
                      </div>
                     </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Reset
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="gap-1 text-destructive hover:text-destructive"
                              disabled={user.is_creator}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {user.display_name || user.email}? 
                                This action cannot be undone and will remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser(user.user_id, user.display_name || user.email || 'User', user.email)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-caption">
                Get started by adding your first user
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
