import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { KPIMetrics } from '@/types';

interface KPIChartsProps {
  kpiMetrics: KPIMetrics;
}

const chartConfig = {
  completed: { label: "Completed", color: "hsl(var(--primary))" },
  inProgress: { label: "In Progress", color: "hsl(var(--secondary))" },
  arrived: { label: "Arrived", color: "hsl(var(--accent))" },
  scheduled: { label: "Scheduled", color: "hsl(var(--muted))" },
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))'
];

export function KPICharts({ kpiMetrics }: KPIChartsProps) {
  const statusData = [
    { name: 'Completed', value: kpiMetrics.completed_trucks, color: CHART_COLORS[0] },
    { name: 'In Progress', value: kpiMetrics.in_progress_trucks, color: CHART_COLORS[1] },
    { name: 'Arrived', value: kpiMetrics.arrived_trucks, color: CHART_COLORS[2] },
    { name: 'Scheduled', value: kpiMetrics.scheduled_trucks, color: CHART_COLORS[3] },
  ];

  return (
    <Card className="card-professional">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          Truck Status Distribution
        </CardTitle>
        <CardDescription>Current status of all trucks</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
  );
}