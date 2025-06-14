import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Trophy } from 'lucide-react';
import { UserKPIMetrics } from '@/hooks/useUserKPIData';

interface EnhancedUserPerformanceProps {
  userKPIs: UserKPIMetrics[];
  selectedUserId: string;
  selectedPeriod: string;
}

export function EnhancedUserPerformance({ userKPIs, selectedUserId, selectedPeriod }: EnhancedUserPerformanceProps) {
  return (
    <Card className="card-professional">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {selectedUserId === 'all' ? 'Enhanced User Performance' : 'Selected User Performance'}
        </CardTitle>
        <CardDescription>
          {selectedUserId === 'all' 
            ? `Comprehensive performance metrics for all warehouse staff in last ${selectedPeriod} days` 
            : `Detailed performance metrics for selected user over last ${selectedPeriod} days`
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
          <div className="space-y-4">
            {userKPIs.map((userKPI, index) => (
              <div key={userKPI.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 bg-accent/5 rounded-lg border border-border">
                {/* User Info */}
                <div className="lg:col-span-3 flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{userKPI.display_name || userKPI.email}</p>
                    <p className="text-xs text-muted-foreground">{userKPI.email}</p>
                  </div>
                </div>

                {/* Core Metrics */}
                <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
                  <div>
                    <p className="font-semibold text-display text-lg">{userKPI.total_trucks_handled || 0}</p>
                    <p className="text-xs text-muted-foreground">Trucks</p>
                  </div>
                  <div>
                    <p className="font-semibold text-display text-lg">{userKPI.completed_trucks || 0}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="font-semibold text-display text-lg">{userKPI.total_pallets_handled || 0}</p>
                    <p className="text-xs text-muted-foreground">Pallets</p>
                  </div>
                  <div>
                    <p className="font-semibold text-display text-lg">{userKPI.avg_pallets_per_truck?.toFixed(1) || '0.0'}</p>
                    <p className="text-xs text-muted-foreground">Avg Pallets/Truck</p>
                  </div>
                  <div>
                    <p className="font-semibold text-display text-lg">{userKPI.avg_processing_hours?.toFixed(1) || '0.0'}h</p>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                  </div>
                  <div>
                    <p className="font-semibold text-secondary text-lg">{userKPI.avg_unloading_speed_pallets_per_hour?.toFixed(1) || '0.0'}</p>
                    <p className="text-xs text-muted-foreground">Pallets/Hour</p>
                  </div>
                  <div>
                    <p className="font-semibold text-display text-lg">{userKPI.tasks_completed || 0}</p>
                    <p className="text-xs text-muted-foreground">Tasks</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}