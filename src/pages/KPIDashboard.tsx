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