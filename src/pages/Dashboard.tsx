import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const Dashboard: React.FC = () => {
  const { user, checkIn, checkOut } = useAuth();

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {getGreeting()}, {user?.name}
        </h1>
        <p className="text-muted-foreground">
          Current time: {getCurrentTime()}
        </p>
      </div>

      {user?.role === 'WAREHOUSE_STAFF' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Time Clock
                <Badge variant="outline">{getCurrentTime()}</Badge>
              </CardTitle>
              <CardDescription>
                Track your work hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex space-x-2">
                <Button onClick={checkIn} className="flex-1">
                  Check In
                </Button>
                <Button onClick={checkOut} variant="outline" className="flex-1">
                  Check Out
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Working hours: 08:00 - 17:00
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Tasks</CardTitle>
              <CardDescription>
                3 tasks assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Unload Truck #1</span>
                  <Badge variant="destructive">Urgent</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Move pallets to storage</span>
                  <Badge variant="default">High</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Inventory check</span>
                  <Badge variant="secondary">Medium</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Trucks</CardTitle>
              <CardDescription>
                2 trucks in progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">ABC-123 (Ramp 3)</span>
                  <Badge variant="outline">Arrived</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">XYZ-789 (Ramp 8)</span>
                  <Badge variant="secondary">Loading</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {user?.role === 'OFFICE_ADMIN' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>
                Trucks and ramps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                trucks scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Tasks</CardTitle>
              <CardDescription>
                Assigned to warehouse staff
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                tasks in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Ramps</CardTitle>
              <CardDescription>
                Unloading & loading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4/12</div>
              <p className="text-xs text-muted-foreground">
                ramps available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff Online</CardTitle>
              <CardDescription>
                Currently checked in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
              <p className="text-xs text-muted-foreground">
                warehouse staff
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {user?.role === 'SUPER_ADMIN' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
              <CardDescription>
                System-wide
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">25</div>
              <p className="text-xs text-muted-foreground">
                active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>
                Overall status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm">All systems operational</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Activity</CardTitle>
              <CardDescription>
                Trucks processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-muted-foreground">
                trucks completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Hours</CardTitle>
              <CardDescription>
                Staff time today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">48</div>
              <p className="text-xs text-muted-foreground">
                hours logged
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for your role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {user?.role === 'WAREHOUSE_STAFF' && (
              <>
                <Button variant="outline">View My Tasks</Button>
                <Button variant="outline">Check Truck Status</Button>
                <Button variant="outline">View TV Dashboard</Button>
              </>
            )}
            {user?.role === 'OFFICE_ADMIN' && (
              <>
                <Button variant="outline">Schedule New Truck</Button>
                <Button variant="outline">Create Task</Button>
                <Button variant="outline">Export Time Report</Button>
                <Button variant="outline">View TV Dashboard</Button>
              </>
            )}
            {user?.role === 'SUPER_ADMIN' && (
              <>
                <Button variant="outline">Add New User</Button>
                <Button variant="outline">System Health</Button>
                <Button variant="outline">View All Reports</Button>
                <Button variant="outline">Backup Data</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};