import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { KPIMetrics } from '@/types';
import { formatHoursDisplay } from '@/lib/timeUtils';

interface KPIMetricsCardsProps {
  kpiMetrics: KPIMetrics;
  selectedPeriod: string;
}

export function KPIMetricsCards({ kpiMetrics, selectedPeriod }: KPIMetricsCardsProps) {
  const completionRate = kpiMetrics.total_trucks > 0 
    ? Math.round((kpiMetrics.completed_trucks / kpiMetrics.total_trucks) * 100) 
    : 0;

  return (
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
            {formatHoursDisplay(kpiMetrics.avg_processing_hours || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Per truck completion
          </p>
        </CardContent>
      </Card>

      <Card className="card-professional">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">In Progress</CardTitle>
          <AlertTriangle className="h-4 w-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-display">{kpiMetrics.in_progress_trucks}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Currently processing
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
  );
}