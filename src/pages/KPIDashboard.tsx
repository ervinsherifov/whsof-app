import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useKPIMetrics } from '@/hooks/useKPIMetrics';
import { useUserKPIData } from '@/hooks/useUserKPIData';
import { useRealtimeKPI } from '@/hooks/useRealtimeKPI';
import { useHistoricalTrends } from '@/hooks/useHistoricalTrends';
import { useAuth } from '@/contexts/AuthContext';
import { EssentialKPICards } from '@/components/kpi/EssentialKPICards';
import { KPIFilters } from '@/components/kpi/KPIFilters';
import { TrendChart } from '@/components/kpi/TrendChart';
import { EnhancedUserPerformance } from '@/components/kpi/EnhancedUserPerformance';
import { Activity } from 'lucide-react';


export default function KPIDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  
  const { kpiMetrics, loading: kpiLoading } = useKPIMetrics(selectedUserId, selectedPeriod);
  const { userKPIs, warehouseUsers, loading: userLoading } = useUserKPIData(selectedUserId, selectedPeriod);
  const { trends, loading: trendsLoading } = useHistoricalTrends(parseInt(selectedPeriod));
  const { lastUpdate } = useRealtimeKPI();
  const { user } = useAuth();

  const loading = kpiLoading || userLoading || trendsLoading;

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


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Header with Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-display">KPI Dashboard</h1>
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Live
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Essential warehouse metrics • Last updated: {lastUpdate.toLocaleTimeString()}
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

      {/* Essential KPI Metrics */}
      <EssentialKPICards 
        kpiMetrics={kpiMetrics} 
        userKPIs={userKPIs}
        selectedPeriod={selectedPeriod} 
      />

      {/* Single Trend Chart */}
      <TrendChart 
        data={trends}
        title="Daily Completed Trucks"
        description="Truck completion trend over time"
        metricKey="completed_trucks"
        color="hsl(var(--primary))"
      />

      {/* Enhanced User Performance */}
      <EnhancedUserPerformance 
        userKPIs={userKPIs} 
        selectedUserId={selectedUserId} 
        selectedPeriod={selectedPeriod} 
      />
    </div>
  );
}