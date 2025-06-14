import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useKPIMetrics } from '@/hooks/useKPIMetrics';
import { useUserKPIData } from '@/hooks/useUserKPIData';
import { useExceptionData } from '@/hooks/useExceptionData';
import { useRealtimeKPI } from '@/hooks/useRealtimeKPI';
import { useHistoricalTrends } from '@/hooks/useHistoricalTrends';
import { useAuth } from '@/contexts/AuthContext';
import { KPIMetricsCards } from '@/components/kpi/KPIMetricsCards';
import { KPICharts } from '@/components/kpi/KPICharts';
import { EnhancedUserPerformance } from '@/components/kpi/EnhancedUserPerformance';
import { KPIFilters } from '@/components/kpi/KPIFilters';
import { ExceptionsSection } from '@/components/kpi/ExceptionsSection';
import { TrendChart } from '@/components/kpi/TrendChart';
import { PerformanceTargets } from '@/components/kpi/PerformanceTargets';
import { KPINotifications } from '@/components/kpi/KPINotifications';
import { ExportReports } from '@/components/kpi/ExportReports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Zap } from 'lucide-react';


export default function KPIDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  
  const { kpiMetrics, loading: kpiLoading } = useKPIMetrics(selectedUserId, selectedPeriod);
  const { userKPIs, warehouseUsers, loading: userLoading } = useUserKPIData(selectedUserId, selectedPeriod);
  const { exceptions, updateExceptionStatus, loading: exceptionsLoading } = useExceptionData();
  const { trends, loading: trendsLoading } = useHistoricalTrends(parseInt(selectedPeriod));
  const { lastUpdate } = useRealtimeKPI();
  const { user } = useAuth();

  const loading = kpiLoading || userLoading || exceptionsLoading || trendsLoading;

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

  const handleStatusChange = (exception: any, newStatus: string) => {
    updateExceptionStatus(exception.id, newStatus, user?.id);
  };

  const exportData = {
    userKPIs,
    kpiMetrics,
    exceptions,
    trends
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header with Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-display">KPI Dashboard</h1>
              <KPINotifications />
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Live
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Real-time warehouse operations overview • Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Last {selectedPeriod} Days
          </Badge>
        </div>
        
        <KPIFilters
          selectedUserId={selectedUserId}
          selectedPeriod={selectedPeriod}
          warehouseUsers={warehouseUsers}
          onUserChange={setSelectedUserId}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {/* Key Metrics Cards */}
      <KPIMetricsCards kpiMetrics={kpiMetrics} selectedPeriod={selectedPeriod} />

      {/* Charts and Trends */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <KPICharts kpiMetrics={kpiMetrics} />
        <TrendChart 
          data={trends}
          title="Daily Completed Trucks"
          description="Truck completion trend over time"
          metricKey="completed_trucks"
          color="hsl(var(--primary))"
        />
      </div>

      {/* Historical Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <TrendChart 
          data={trends}
          title="Processing Efficiency"
          description="Average processing hours per truck"
          metricKey="avg_processing_hours"
          color="hsl(var(--secondary))"
        />
        <TrendChart 
          data={trends}
          title="Pallet Volume"
          description="Total pallets processed daily"
          metricKey="total_pallets"
          color="hsl(var(--accent))"
        />
        <TrendChart 
          data={trends}
          title="Operational Efficiency"
          description="Overall efficiency metric"
          metricKey="avg_efficiency"
          color="hsl(var(--chart-1))"
        />
      </div>

      {/* Performance Management Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PerformanceTargets userKPIs={userKPIs} />
        <ExportReports data={exportData} />
      </div>

      {/* Real-time Status */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            System Status
          </CardTitle>
          <CardDescription>Real-time system performance and connectivity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <div>
                <p className="text-sm font-medium">Real-time Updates</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
              <div>
                <p className="text-sm font-medium">Data Sync</p>
                <p className="text-xs text-muted-foreground">{lastUpdate.toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced User Performance */}
      <EnhancedUserPerformance 
        userKPIs={userKPIs} 
        selectedUserId={selectedUserId} 
        selectedPeriod={selectedPeriod} 
      />

      {/* Recent Exceptions */}
      <ExceptionsSection 
        exceptions={exceptions} 
        onStatusChange={handleStatusChange} 
        currentUser={user} 
      />
    </div>
  );
}