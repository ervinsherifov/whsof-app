import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/dateUtils';
import { formatHoursDisplay } from '@/lib/timeUtils';
import { CheckCircle, XCircle, Clock, Users } from 'lucide-react';

interface PendingOvertimeEntry {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  is_weekend: boolean;
  is_holiday: boolean;
  overtime_reason: string[] | null;
  approval_status: string;
  created_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
}

export const OvertimeApproval: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingEntries, setPendingEntries] = useState<PendingOvertimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchPendingEntries = async () => {
    try {
      // Fetch time entries
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          id,
          user_id,
          check_in_time,
          check_out_time,
          total_hours,
          regular_hours,
          overtime_hours,
          is_weekend,
          is_holiday,
          overtime_reason,
          approval_status,
          created_at
        `)
        .eq('approval_status', 'pending')
        .gt('overtime_hours', 0)
        .order('created_at', { ascending: false });

      if (timeError) throw timeError;

      if (!timeEntries || timeEntries.length === 0) {
        setPendingEntries([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(timeEntries.map(entry => entry.user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      // Create a map of user_id to profile
      const profileMap = new Map();
      profiles?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Merge time entries with profile data
      const entriesWithProfiles = timeEntries.map(entry => ({
        ...entry,
        profiles: profileMap.get(entry.user_id) || null
      }));

      setPendingEntries(entriesWithProfiles);
    } catch (error) {
      console.error('Error fetching pending entries:', error);
      toast({
        title: "Error",
        description: "Failed to load pending overtime requests",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEntries();
  }, []);

  const handleApproval = async (entryId: string, status: 'approved' | 'rejected') => {
    if (!user?.id) return;
    
    setIsProcessing(true);
    try {
      console.log('Attempting to update time entry:', { entryId, status, userId: user.id });
      
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          approval_status: status,
          approved_by_user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .select('id, approval_status, approved_by_user_id');

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log('Update successful:', data);

      toast({
        title: status === 'approved' ? "Overtime Approved" : "Overtime Rejected",
        description: `Successfully ${status} the overtime request`,
        variant: status === 'approved' ? "default" : "destructive",
      });

      // Refresh the list
      await fetchPendingEntries();
      setSelectedEntry(null);
      setComment('');
    } catch (error) {
      console.error('Error updating approval status:', error);
      toast({
        title: "Error",
        description: "Failed to update approval status",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOvertimeReasonBadge = (reasons: string[] | null | undefined) => {
    if (!reasons || reasons.length === 0) {
      return <span className="mr-1"><Badge>No reason specified</Badge></span>;
    }
    
    return reasons.map((reason, index) => {
      let colorClass = "";
      switch (reason) {
        case 'weekend':
          colorClass = "bg-orange-100 text-orange-800 border-orange-200";
          break;
        case 'holiday':
          colorClass = "bg-red-100 text-red-800 border-red-200";
          break;
        case 'daily_excess':
          colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
          break;
      }
      return (
        <span className={`mr-1 ${colorClass}`} key={index}><Badge>{reason.replace('_', ' ')}</Badge></span>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Overtime Approval</h1>
        <p className="text-muted-foreground">
          Review and approve overtime requests from warehouse staff
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEntries.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(pendingEntries.map(e => e.user_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">With pending overtime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Overtime Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatHoursDisplay(pendingEntries.reduce((sum, entry) => sum + entry.overtime_hours, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Overtime Requests</CardTitle>
          <CardDescription>
            Review and approve overtime requests that require super admin approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium">All caught up!</h3>
              <p>No pending overtime requests to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobile: Card Layout */}
              <div className="block lg:hidden space-y-4">
                {pendingEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 bg-card">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{entry.profiles?.display_name || 'Unknown User'}</h4>
                          <p className="text-sm text-muted-foreground">{entry.profiles?.email}</p>
                        </div>
                        <span className="bg-yellow-100 text-yellow-800"><Badge>Pending</Badge></span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <div>{formatDate(entry.check_in_time)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Hours:</span>
                          <div className="font-medium text-orange-600">
                            {formatHoursDisplay(entry.overtime_hours)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Time:</span>
                          <div>{formatTime(entry.check_in_time)} - {formatTime(entry.check_out_time)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reason:</span>
                          <div>{getOvertimeReasonBadge(entry.overtime_reason)}</div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproval(entry.id, 'approved')}
                          disabled={isProcessing}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproval(entry.id, 'rejected')}
                          disabled={isProcessing}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time Period</TableHead>
                      <TableHead>Overtime Hours</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{entry.profiles?.display_name || 'Unknown User'}</div>
                            <div className="text-sm text-muted-foreground">{entry.profiles?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(entry.check_in_time)}
                        </TableCell>
                        <TableCell>
                          {formatTime(entry.check_in_time)} - {formatTime(entry.check_out_time)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-orange-600">
                            {formatHoursDisplay(entry.overtime_hours)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getOvertimeReasonBadge(entry.overtime_reason)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproval(entry.id, 'approved')}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproval(entry.id, 'rejected')}
                              disabled={isProcessing}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};