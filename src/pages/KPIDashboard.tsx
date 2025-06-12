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
import { AlertTriangle, TrendingUp, Clock, CheckCircle, BarChart2 } from 'lucide-react';

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
  const { kpiMetrics, exceptions, loading, updateExceptionStatus } = useKPIData();
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">KPI Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          Last 30 Days
        </Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trucks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiMetrics.total_trucks}</div>
            <p className="text-xs text-muted-foreground">
              {completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiMetrics.avg_processing_hours?.toFixed(1) || '0.0'}h
            </div>
            <p className="text-xs text-muted-foreground">
              Per truck completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Exceptions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiMetrics.pending_exceptions}</div>
            <p className="text-xs text-muted-foreground">
              {kpiMetrics.resolved_exceptions} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiMetrics.completed_trucks}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Truck Status Distribution</CardTitle>
            <CardDescription>Current status of all trucks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
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
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Trucks by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Exceptions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Exceptions</CardTitle>
          <CardDescription>Latest reported issues and delays</CardDescription>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No exceptions reported</p>
          ) : (
            <div className="space-y-4">
              {exceptions.map((exception: any) => (
                <div key={exception.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(exception.priority)}>
                        {exception.priority}
                      </Badge>
                      <Badge variant={getStatusColor(exception.status)}>
                        {EXCEPTION_STATUSES[exception.status as keyof typeof EXCEPTION_STATUSES]}
                      </Badge>
                      <span className="font-medium">{exception.trucks.license_plate}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(exception.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm">{exception.reason}</p>
                  {exception.status === 'PENDING' && user && (
                    <div className="flex space-x-2">
                      <Select
                        value={exception.status}
                        onValueChange={(value) => handleStatusChange(exception, value)}
                      >
                        <SelectTrigger className="w-[180px]">
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