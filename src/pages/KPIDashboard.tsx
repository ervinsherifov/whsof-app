import { useState } from 'react';
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
import { AlertTriangle, TrendingUp, Clock, CheckCircle, BarChart2, Users, Trophy, Filter } from 'lucide-react';

const chartConfig = {
  completed: {
    label: "Completed",
    color: "hsl(var(--primary))",
  },
  inProgress: {
    label: "In Progress", 
    color: "hsl(var(--secondary))",
  },
  arrived: {
    label: "Arrived",
    color: "hsl(var(--accent))",
  },
  scheduled: {
    label: "Scheduled",
    color: "hsl(var(--muted))",
  },
  urgent: {
    label: "Urgent",
    color: "hsl(var(--destructive))",
  },
  high: {
    label: "High",
    color: "hsl(var(--secondary))",
  },
  normal: {
    label: "Normal", 
    color: "hsl(var(--primary))",
  },
  low: {
    label: "Low",
    color: "hsl(var(--muted))",
  },
};

const CHART_COLORS = [
  'hsl(var(--primary))',     // DHL Red
  'hsl(var(--secondary))',   // DHL Yellow  
  'hsl(var(--accent))',      // DHL Yellow (accent)
  'hsl(var(--muted))'        // Gray
];

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
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const { kpiMetrics, userKPIs, warehouseUsers, exceptions, loading, updateExceptionStatus } = useKPIData(selectedUserId, selectedPeriod);
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
    { name: 'Completed', value: kpiMetrics.completed_trucks, color: CHART_COLORS[0] },
    { name: 'In Progress', value: kpiMetrics.in_progress_trucks, color: CHART_COLORS[1] },
    { name: 'Arrived', value: kpiMetrics.arrived_trucks, color: CHART_COLORS[2] },
    { name: 'Scheduled', value: kpiMetrics.scheduled_trucks, color: CHART_COLORS[3] },
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
      {/* Header with Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-display">KPI Dashboard</h1>
            <p className="text-muted-foreground mt-1">Real-time warehouse operations overview</p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Last {selectedPeriod} Days
          </Badge>
        </div>
        
        {/* Filter Controls */}
        <Card className="card-professional">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Filters:</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Warehouse Staff</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-[200px] bg-background border-border">
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg z-50">
                      <SelectItem value="all">All Warehouse Staff</SelectItem>
                      {warehouseUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.display_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Time Period</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-[150px] bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg z-50">
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
            <AlertTriangle className="h-4 w-4 text-destructive" />
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
            <CardTitle className="text-sm font-medium text-foreground">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-display">{kpiMetrics.completed_trucks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last {selectedPeriod} days
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
          <CardContent className="p-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    outerRadius={85}
                    innerRadius={25}
                    fill="#8884d8"
                    dataKey="value"
                    label={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: any, name: any) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {statusData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-foreground">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
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
          <CardContent className="p-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="value" 
                    radius={[6, 6, 0, 0]}
                    className="transition-all duration-200 hover:opacity-80"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.name === 'Urgent' ? 'hsl(var(--destructive))' :
                          entry.name === 'High' ? 'hsl(var(--secondary))' :
                          entry.name === 'Normal' ? 'hsl(var(--primary))' :
                          'hsl(var(--muted))'
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-User Performance */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {selectedUserId === 'all' ? 'Top Performers' : 'Selected User Performance'}
          </CardTitle>
          <CardDescription>
            {selectedUserId === 'all' 
              ? `Individual warehouse staff KPIs for last ${selectedPeriod} days` 
              : `KPI metrics for selected user over last ${selectedPeriod} days`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userKPIs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-muted" />
              <p>No user activity recorded for this period</p>
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

      {/* Recent Exceptions */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Recent Exceptions
          </CardTitle>
          <CardDescription>Latest reported issues and delays</CardDescription>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
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
                        <SelectContent className="bg-background border-border shadow-lg z-50">
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