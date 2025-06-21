import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/dateUtils';
import { formatProcessingTime } from '@/lib/truckUtils';
import { TruckTableRowProps, TruckStatus } from '@/types';

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

export const TruckTableRow: React.FC<TruckTableRowProps> = React.memo(({
  truck,
  onAssignRamp,
  onUpdateStatus,
  onDeleteTruck
}) => {
  const { user } = useAuth();

  return (
    <TableRow className="animate-fade-in">
      <TableCell className="font-medium">
        {truck.license_plate}
      </TableCell>
      <TableCell>
        {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE'
          ? (truck.actual_arrival_date && truck.actual_arrival_time
              ? `${formatDate(truck.actual_arrival_date)} ${truck.actual_arrival_time.substring(0, 5)}`
              : `${formatDate(truck.arrival_date)} ${truck.arrival_time}`
            )
          : `${formatDate(truck.arrival_date)} ${truck.arrival_time}`
        }
      </TableCell>
      <TableCell>
        {truck.ramp_number ? `Ramp ${truck.ramp_number}` : 'Not assigned'}
      </TableCell>
      <TableCell>{truck.pallet_count}</TableCell>
      <TableCell>
        {formatProcessingTime(truck.started_at, truck.completed_at)}
      </TableCell>
      <TableCell className="max-w-xs truncate">
        {truck.cargo_description}
      </TableCell>
      <TableCell>{truck.handled_by_name || '-'}</TableCell>
      <TableCell>
        <Badge variant={getStatusColor(truck.status)}>
          {truck.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
          {truck.status === 'SCHEDULED' && user?.role === 'WAREHOUSE_STAFF' && !truck.ramp_number && (
            <Button 
              size="sm" 
              variant="outline"
              className="hover-scale"
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
              className="hover-scale"
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
              className="hover-scale"
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
              className="hover-scale"
              onClick={() => onUpdateStatus(truck.id, 'DONE')}
              aria-label={`Mark truck ${truck.license_plate} as done`}
            >
              Mark Done
            </Button>
          )}
          {user?.role === 'SUPER_ADMIN' && (
            <Button 
              size="sm" 
              variant="destructive"
              className="hover-scale"
              onClick={() => onDeleteTruck(truck.id, truck.license_plate)}
              aria-label={`Delete truck ${truck.license_plate}`}
            >
              Delete
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

TruckTableRow.displayName = 'TruckTableRow';