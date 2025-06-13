import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useKPIData } from '@/hooks/useKPIData';
import { useAuth } from '@/contexts/AuthContext';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TruckException, EXCEPTION_STATUSES } from '@/types';

interface ExceptionWithTruck extends TruckException {
  trucks: {
    license_plate: string;
    cargo_description: string;
  };
}
import { format } from 'date-fns';
import { AlertTriangle, TrendingUp, Clock, CheckCircle, BarChart2, Users, Trophy, HelpCircle } from 'lucide-react';

const chartConfig = {
  completed: {
    label: "Completed",
    color: "hsl(var(--chart-1))",
  },
  inProgress: {
    label: "In Progress", 
    color: "hsl(var(--chart-2))",
  },
  arrived: {
    label: "Arrived",
    color: "hsl(var(--chart-3))",
  },
  scheduled: {
    label: "Scheduled",
    color: "hsl(var(--chart-4))",
  },
  urgent: {
    label: "Urgent",
    color: "hsl(var(--destructive))",
  },
  high: {
    label: "High",
    color: "hsl(var(--chart-5))",
  },
  normal: {
    label: "Normal", 
    color: "hsl(var(--chart-1))",
  },
  low: {
    label: "Low",
    color: "hsl(var(--muted))",
  },
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT': return 'destructive';
    case 'HIGH': return 'secondary';
    case 'MEDIUM': return 'default';
    case 'LOW': return 'outline';
    default: return 'default';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'RESOLVED': return 'default';
    case 'IN_PROGRESS': return 'secondary';
    case 'ESCALATED': return 'destructive';
    default: return 'outline';
  }
};

export default function KPIDashboard() {
  const { kpiMetrics, userKPIs, exceptions, loading, updateExceptionStatus } = useKPIData();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Loading KPI Dashboard...</div>
      </div>
    );
  }

  if (!kpiMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">No data available</div>
      </div>
    );
  }

  const statusData = [
    { name: 'Completed', value: kpiMetrics.completed_trucks, color: COLORS[0] },
    { name: 'In Progress', value: kpiMetrics.in_progress_trucks, color: COLORS[1] },
    { name: 'Arrived', value: kpiMetrics.arrived_trucks, color: COLORS[2] },
    { name: 'Scheduled', value: kpiMetrics.scheduled_trucks, color: COLORS[3] },
  ];

  const priorityData = [
    { name: 'Urgent', value: kpiMetrics.urgent_trucks },
    { name: 'High', value: kpiMetrics.high_priority_trucks },
    { name: 'Normal', value: kpiMetrics.normal_priority_trucks },
    { name: 'Low', value: kpiMetrics.low_priority_trucks },
  ];

  const completionRate = kpiMetrics.total_trucks > 0 
    ? Math.round((kpiMetrics.completed_trucks / kpiMetrics.total_trucks) * 100) 
    : 0;

  const handleStatusChange = (exception: ExceptionWithTruck, newStatus: string) => {
    updateExceptionStatus(exception.id, newStatus, user?.id);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-display">KPI Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time warehouse operations overview</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          Last 30 Days
        </Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="card-professional">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Trucks</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-display">{kpiMetrics.total_trucks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="card-professional">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-display">
              {kpiMetrics.avg_processing_hours?.toFixed(1) || '0.0'}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per truck completion
            </p>
          </CardContent>
        </Card>

        <Card className="card-professional">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Active Exceptions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-urgent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-display">{kpiMetrics.pending_exceptions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpiMetrics.resolved_exceptions} resolved
            </p>
          </CardContent>
        </Card>

        <Card className="card-professional">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-status-completed" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-display">{kpiMetrics.completed_trucks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Truck Status Distribution
            </CardTitle>
            <CardDescription>Current status of all trucks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Priority Distribution
            </CardTitle>
            <CardDescription>Trucks by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--chart-1))" 
                      radius={[4, 4, 0, 0]}
                      className="transition-all duration-200 hover:opacity-80"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-User Performance */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Top Performers Today
          </CardTitle>
          <CardDescription>Individual warehouse staff KPIs for today</CardDescription>
        </CardHeader>
        <CardContent>
          {userKPIs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-muted" />
              <p>No user activity recorded for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userKPIs.map((userKPI, index) => (
                <div key={userKPI.id} className="flex items-center justify-between p-3 bg-accent/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{userKPI.display_name || userKPI.email}</p>
                      <p className="text-sm text-muted-foreground">{userKPI.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-display">{userKPI.total_trucks_handled || 0}</p>
                      <p className="text-muted-foreground">Trucks</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-display">{userKPI.completed_trucks || 0}</p>
                      <p className="text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-display">{userKPI.avg_processing_hours?.toFixed(1) || '0.0'}h</p>
                      <p className="text-muted-foreground">Avg Time</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-display">{userKPI.tasks_completed || 0}</p>
                      <p className="text-muted-foreground">Tasks</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How Exceptions Work */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            How Exceptions Work
          </CardTitle>
          <CardDescription>Understanding the exception reporting and resolution process</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Who Can Report Exceptions?</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Warehouse Staff:</strong> Can report issues they encounter during truck processing</li>
                <li>• <strong>Office Admin:</strong> Can report administrative or scheduling issues</li>
                <li>• <strong>Super Admin:</strong> Can report any type of exception</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Exception Types & Priorities</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <Badge variant="destructive" className="mr-1">URGENT</Badge> Critical issues requiring immediate attention</li>
                <li>• <Badge variant="secondary" className="mr-1">HIGH</Badge> Important issues affecting operations</li>
                <li>• <Badge variant="default" className="mr-1">MEDIUM</Badge> Standard operational issues</li>
                <li>• <Badge variant="outline" className="mr-1">LOW</Badge> Minor issues that can wait</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">How to Apply/Report</h4>
              <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
                <li>Navigate to Truck Scheduling page</li>
                <li>Select the truck with issues</li>
                <li>Click "Report Exception" button</li>
                <li>Fill in exception details and priority</li>
                <li>Submit for review and resolution</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Resolution Process</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <Badge variant="outline" className="mr-1">PENDING</Badge> Exception reported, awaiting review</li>
                <li>• <Badge variant="secondary" className="mr-1">IN_PROGRESS</Badge> Being actively worked on</li>
                <li>• <Badge variant="destructive" className="mr-1">ESCALATED</Badge> Requires higher-level intervention</li>
                <li>• <Badge variant="default" className="mr-1">RESOLVED</Badge> Issue has been fixed</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Exceptions */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-urgent" />
            Recent Exceptions
          </CardTitle>
          <CardDescription>Latest reported issues and delays</CardDescription>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-status-completed" />
              <p className="text-lg font-medium">No exceptions reported</p>
              <p className="text-sm">All operations running smoothly</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exceptions.map((exception: any) => (
                <div key={exception.id} className="card-professional p-4 space-y-3 hover:shadow-soft transition-all duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getPriorityColor(exception.priority)} className="font-medium">
                        {exception.priority}
                      </Badge>
                      <Badge variant={getStatusColor(exception.status)} className="font-medium">
                        {EXCEPTION_STATUSES[exception.status as keyof typeof EXCEPTION_STATUSES]}
                      </Badge>
                      <span className="font-semibold text-foreground">{exception.trucks.license_plate}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(exception.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{exception.reason}</p>
                  {exception.status === 'PENDING' && user && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <Select
                        value={exception.status}
                        onValueChange={(value) => handleStatusChange(exception, value)}
                      >
                        <SelectTrigger className="w-[180px] form-professional">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EXCEPTION_STATUSES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {String(label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}