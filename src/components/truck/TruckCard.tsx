import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/dateUtils';
import { calculateProcessingHours } from '@/lib/truckUtils';
import { TruckCardProps, TruckStatus, TruckPriority, TRUCK_PRIORITIES } from '@/types';

const getStatusColor = (status: TruckStatus) => {
  switch (status) {
    case 'SCHEDULED':
      return 'default';
    case 'ARRIVED':
      return 'secondary';
    case 'IN_PROGRESS':
      return 'default';
    case 'DONE':
      return 'outline';
    default:
      return 'default';
  }
};

const getPriorityColor = (priority: TruckPriority) => {
  switch (priority) {
    case 'URGENT':
      return 'destructive';
    case 'HIGH':
      return 'default';
    case 'NORMAL':
      return 'secondary';
    case 'LOW':
      return 'outline';
    default:
      return 'secondary';
  }
};

export const TruckCard: React.FC<TruckCardProps> = React.memo(({
  truck,
  onAssignRamp,
  onUpdateStatus,
  onDeleteTruck,
  onReschedule
}) => {
  const { user } = useAuth();

  return (
    <Card className="p-4 animate-fade-in">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="font-medium text-lg">{truck.license_plate}</div>
          <div className="flex gap-2">
            <Badge variant={getPriorityColor(truck.priority)} className="text-xs">
              {TRUCK_PRIORITIES[truck.priority]}
            </Badge>
            <Badge variant={getStatusColor(truck.status)}>
              {truck.status}
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">
              {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE' 
                ? 'Actual Arrival:' : 'Arrival:'}
            </span>
            <div className="font-medium">
              {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE'
                ? (truck.actual_arrival_date 
                    ? formatDate(truck.actual_arrival_date)
                    : formatDate(truck.arrival_date)
                  )
                : formatDate(truck.arrival_date)
              }
            </div>
            <div className="font-medium">
              {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE'
                ? (truck.actual_arrival_time 
                    ? truck.actual_arrival_time.substring(0, 5)
                    : truck.arrival_time
                  )
                : truck.arrival_time
              }
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Ramp:</span>
            <div className="font-medium">
              {truck.ramp_number ? `Ramp ${truck.ramp_number}` : 'Not assigned'}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Pallets:</span>
            <div className="font-medium">{truck.pallet_count}</div>
          </div>
          {(truck.started_at || truck.completed_at) && (
            <div>
              <span className="text-muted-foreground">Processing:</span>
              <div className="font-medium">
                {(() => {
                  const processingTime = calculateProcessingHours(truck.started_at, truck.completed_at);
                  if (!processingTime) return 'Not started';
                  return truck.completed_at 
                    ? `${processingTime.totalHours}h` 
                    : `${processingTime.totalHours}h (ongoing)`;
                })()}
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <div>
            <span className="text-muted-foreground text-xs">Cargo:</span>
            <div className="text-sm break-words">{truck.cargo_description}</div>
          </div>
          {truck.handled_by_name && (
            <div>
              <span className="text-muted-foreground text-xs">Handler:</span>
              <div className="text-sm">{truck.handled_by_name}</div>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {truck.status === 'SCHEDULED' && user?.role === 'WAREHOUSE_STAFF' && !truck.ramp_number && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs hover-scale"
              onClick={() => onAssignRamp(truck)}
              aria-label={`Assign ramp to truck ${truck.license_plate}`}
            >
              Assign Ramp
            </Button>
          )}
          {truck.status === 'SCHEDULED' && truck.ramp_number && user?.role === 'WAREHOUSE_STAFF' && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs hover-scale"
              onClick={() => onUpdateStatus(truck.id, 'ARRIVED')}
              aria-label={`Mark truck ${truck.license_plate} as arrived`}
            >
              Mark Arrived
            </Button>
          )}
          {truck.status === 'ARRIVED' && user?.role === 'WAREHOUSE_STAFF' && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs hover-scale"
              onClick={() => onUpdateStatus(truck.id, 'IN_PROGRESS')}
              aria-label={`Start work on truck ${truck.license_plate}`}
            >
              Start Work
            </Button>
          )}
          {truck.status === 'IN_PROGRESS' && user?.role === 'WAREHOUSE_STAFF' && (
            <Button 
              size="sm" 
              variant="outline"
              className="text-xs hover-scale"
              onClick={() => onUpdateStatus(truck.id, 'DONE')}
              aria-label={`Mark truck ${truck.license_plate} as done`}
            >
              Mark Done
            </Button>
          )}
          
          {/* Reschedule button for overdue trucks or admins */}
          {((truck.is_overdue || truck.status === 'SCHEDULED') && (user?.role === 'OFFICE_ADMIN' || user?.role === 'SUPER_ADMIN')) && onReschedule && (
            <Button 
              size="sm" 
              variant="secondary"
              className="text-xs hover-scale"
              onClick={() => onReschedule(truck)}
              aria-label={`Reschedule truck ${truck.license_plate}`}
            >
              Reschedule
            </Button>
          )}
          
          {user?.role === 'SUPER_ADMIN' && (
            <Button 
              size="sm" 
              variant="destructive"
              className="text-xs hover-scale"
              onClick={() => onDeleteTruck(truck.id, truck.license_plate)}
              aria-label={`Delete truck ${truck.license_plate}`}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});

TruckCard.displayName = 'TruckCard';