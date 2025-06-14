import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useKPIMetrics } from '@/hooks/useKPIMetrics';
import { useUserKPIData } from '@/hooks/useUserKPIData';
import { useExceptionData } from '@/hooks/useExceptionData';
import { useAuth } from '@/contexts/AuthContext';
import { KPIMetricsCards } from '@/components/kpi/KPIMetricsCards';
import { KPICharts } from '@/components/kpi/KPICharts';
import { EnhancedUserPerformance } from '@/components/kpi/EnhancedUserPerformance';
import { KPIFilters } from '@/components/kpi/KPIFilters';
import { ExceptionsSection } from '@/components/kpi/ExceptionsSection';


export default function KPIDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  
  const { kpiMetrics, loading: kpiLoading } = useKPIMetrics(selectedUserId, selectedPeriod);
  const { userKPIs, warehouseUsers, loading: userLoading } = useUserKPIData(selectedUserId, selectedPeriod);
  const { exceptions, updateExceptionStatus, loading: exceptionsLoading } = useExceptionData();
  const { user } = useAuth();

  const loading = kpiLoading || userLoading || exceptionsLoading;

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

      {/* Charts */}
      <KPICharts kpiMetrics={kpiMetrics} />

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