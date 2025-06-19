import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Timer, CheckCircle, Truck } from 'lucide-react';
import { KPIMetrics } from '@/types';
import { UserKPIMetrics } from '@/hooks/useUserKPIData';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatTotalHours } from '@/lib/timeUtils';

interface EssentialKPICardsProps {
  kpiMetrics: KPIMetrics;
  userKPIs: UserKPIMetrics[];
  selectedPeriod: string;
}

interface TimeMetrics {
  totalWorkingHours: number;
  totalOvertimeHours: number;
  totalRegularHours: number;
}

export function EssentialKPICards({ kpiMetrics, userKPIs, selectedPeriod }: EssentialKPICardsProps) {
  const [timeMetrics, setTimeMetrics] = useState<TimeMetrics>({
    totalWorkingHours: 0,
    totalOvertimeHours: 0,
    totalRegularHours: 0
  });

  useEffect(() => {
    const fetchTimeMetrics = async () => {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));
        
        const { data, error } = await supabase
          .from('time_entries')
          .select('total_hours, regular_hours, overtime_hours')
          .gte('check_in_time', startDate.toISOString())
          .not('check_out_time', 'is', null); // Only completed time entries

        if (error) {
          console.error('Error fetching time metrics:', error);
          return;
        }

        const totals = (data || []).reduce(
          (acc, entry) => ({
            totalWorkingHours: acc.totalWorkingHours + (entry.total_hours || 0),
            totalOvertimeHours: acc.totalOvertimeHours + (entry.overtime_hours || 0),
            totalRegularHours: acc.totalRegularHours + (entry.regular_hours || 0)
          }),
          { totalWorkingHours: 0, totalOvertimeHours: 0, totalRegularHours: 0 }
        );

        setTimeMetrics(totals);
      } catch (error) {
        console.error('Error calculating time metrics:', error);
      }
    };

    fetchTimeMetrics();
  }, [selectedPeriod]);

  const totalTasksCompleted = userKPIs.reduce((sum, user) => sum + (user.tasks_completed || 0), 0);
  const totalTrucksCompleted = kpiMetrics.completed_trucks;

  const essentialMetrics = [
    {
      title: 'Total Working Hours',
      value: formatTotalHours(timeMetrics.totalWorkingHours),
      unit: '',
      icon: Clock,
      description: `Total hours worked in last ${selectedPeriod} days`,
      color: 'text-blue-600'
    },
    {
      title: 'Total Overtime Hours',
      value: formatTotalHours(timeMetrics.totalOvertimeHours),
      unit: '',
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