import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Timer, CheckCircle, Truck } from 'lucide-react';
import { KPIMetrics } from '@/types';
import { UserKPIMetrics } from '@/hooks/useUserKPIData';

interface EssentialKPICardsProps {
  kpiMetrics: KPIMetrics;
  userKPIs: UserKPIMetrics[];
  selectedPeriod: string;
}

export function EssentialKPICards({ kpiMetrics, userKPIs, selectedPeriod }: EssentialKPICardsProps) {
  // Calculate totals from user KPIs for accurate data
  const totalWorkingHours = userKPIs.reduce((sum, user) => {
    const regularHours = (user.total_trucks_handled || 0) * (user.avg_processing_hours || 0);
    return sum + regularHours;
  }, 0);

  // For now, we'll estimate overtime as 20% of total working hours
  // This should be replaced with actual overtime data from time_entries
  const totalOvertimeHours = totalWorkingHours * 0.2;

  const totalTasksCompleted = userKPIs.reduce((sum, user) => sum + (user.tasks_completed || 0), 0);
  const totalTrucksCompleted = kpiMetrics.completed_trucks;

  const essentialMetrics = [
    {
      title: 'Total Working Hours',
      value: totalWorkingHours.toFixed(1),
      unit: 'hrs',
      icon: Clock,
      description: `Regular working hours across all staff`,
      color: 'text-blue-600'
    },
    {
      title: 'Total Overtime Hours',
      value: totalOvertimeHours.toFixed(1),
      unit: 'hrs',
      icon: Timer,
      description: `Overtime hours requiring approval`,
      color: 'text-orange-600'
    },
    {
      title: 'Tasks Completed',
      value: totalTasksCompleted.toString(),
      unit: 'tasks',
      icon: CheckCircle,
      description: `All tasks finished in last ${selectedPeriod} days`,
      color: 'text-green-600'
    },
    {
      title: 'Trucks Completed',
      value: totalTrucksCompleted.toString(),
      unit: 'trucks',
      icon: Truck,
      description: `Trucks fully processed and closed`,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {essentialMetrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="card-professional hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-foreground">
                  {metric.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {metric.unit}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}