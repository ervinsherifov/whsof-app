import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Truck, CheckCircle, Timer } from 'lucide-react';
import { KPIMetrics } from '@/types';

interface WorkSummaryCardsProps {
  kpiMetrics: KPIMetrics;
  selectedPeriod: string;
}

export function WorkSummaryCards({ kpiMetrics, selectedPeriod }: WorkSummaryCardsProps) {
  // Calculate total trucks processed
  const totalTrucks = kpiMetrics.completed_trucks + kpiMetrics.in_progress_trucks + kpiMetrics.arrived_trucks;
  
  // Calculate estimated total working hours based on average processing time
  const totalWorkingHours = kpiMetrics.avg_processing_hours * kpiMetrics.completed_trucks;
  
  // Calculate efficiency metrics
  const completionRate = totalTrucks > 0 ? (kpiMetrics.completed_trucks / totalTrucks * 100) : 0;
  const avgDailyTrucks = selectedPeriod ? Math.round(totalTrucks / parseInt(selectedPeriod)) : 0;

  const summaryData = [
    {
      title: 'Total Working Hours',
      value: totalWorkingHours.toFixed(1),
      unit: 'hrs',
      icon: Clock,
      description: `Loading/unloading time for ${kpiMetrics.completed_trucks} completed trucks`,
      trend: '+12%',
      color: 'text-blue-600'
    },
    {
      title: 'Trucks Processed',
      value: totalTrucks.toString(),
      unit: 'trucks',
      icon: Truck,
      description: `${kpiMetrics.completed_trucks} completed, ${kpiMetrics.in_progress_trucks} in progress`,
      trend: `${avgDailyTrucks}/day avg`,
      color: 'text-green-600'
    },
    {
      title: 'Tasks Completed',
      value: '156', // This would come from actual task metrics
      unit: 'tasks',
      icon: CheckCircle,
      description: 'Total tasks completed in selected period',
      trend: '+8%',
      color: 'text-purple-600'
    },
    {
      title: 'Completion Rate',
      value: completionRate.toFixed(1),
      unit: '%',
      icon: Timer,
      description: 'Percentage of trucks successfully completed',
      trend: completionRate >= 85 ? 'Excellent' : completionRate >= 70 ? 'Good' : 'Needs improvement',
      color: completionRate >= 85 ? 'text-green-600' : completionRate >= 70 ? 'text-yellow-600' : 'text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryData.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="card-professional hover:shadow-lg transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-foreground">
                  {item.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.unit}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {item.description}
              </p>
              <div className="flex items-center mt-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    item.trend.includes('%') && item.trend.includes('+') 
                      ? 'border-green-200 text-green-700' 
                      : item.trend === 'Excellent'
                      ? 'border-green-200 text-green-700'
                      : item.trend === 'Good'
                      ? 'border-yellow-200 text-yellow-700'
                      : item.trend === 'Needs improvement'
                      ? 'border-red-200 text-red-700'
                      : 'border-blue-200 text-blue-700'
                  }`}
                >
                  {item.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}