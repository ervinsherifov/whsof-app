import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/dateUtils';

const calculateProcessingHours = (startedAt?: string, completedAt?: string) => {
  if (!startedAt) return null;
  
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  
  return {
    hours: Math.floor(hours),
    minutes: Math.floor((hours - Math.floor(hours)) * 60),
    totalHours: hours.toFixed(1)
  };
};

interface TruckListProps {
  trucks: any[];
  loading: boolean;
  onAssignRamp: (truck: any) => void;
  onUpdateStatus: (truckId: string, status: string) => void;
  onDeleteTruck: (truckId: string, licensePlate: string) => void;
}

export const TruckList: React.FC<TruckListProps> = ({
  trucks,
  loading,
  onAssignRamp,
  onUpdateStatus,
  onDeleteTruck
}) => {
  const { user } = useAuth();

  const getStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <Card className="mx-2 sm:mx-0">
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading trucks...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-2 sm:mx-0">
      <CardHeader>
        <CardTitle>Scheduled Trucks</CardTitle>
        <CardDescription>
          Today's truck schedule and status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden">
          <ScrollArea className="h-[400px] w-full">
            <div className="block sm:hidden space-y-4">
              {/* Mobile card layout */}
              {trucks.map((truck) => (
                <Card key={truck.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-lg">{truck.license_plate}</div>
                      <Badge variant={getStatusColor(truck.status)}>
                        {truck.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Arrival:</span>
                        <div className="font-medium">{formatDate(truck.arrival_date)}</div>
                        <div className="font-medium">{truck.arrival_time}</div>
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
                          className="text-xs"
                          onClick={() => onAssignRamp(truck)}
                        >
                          Assign Ramp
                        </Button>
                      )}
                      {truck.status === 'SCHEDULED' && truck.ramp_number && user?.role === 'WAREHOUSE_STAFF' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs"
                          onClick={() => onUpdateStatus(truck.id, 'ARRIVED')}
                        >
                          Mark Arrived
                        </Button>
                      )}
                      {truck.status === 'ARRIVED' && user?.role === 'WAREHOUSE_STAFF' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs"
                          onClick={() => onUpdateStatus(truck.id, 'IN_PROGRESS')}
                        >
                          Start Work
                        </Button>
                      )}
                      {truck.status === 'IN_PROGRESS' && user?.role === 'WAREHOUSE_STAFF' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs"
                          onClick={() => onUpdateStatus(truck.id, 'DONE')}
                        >
                          Mark Done
                        </Button>
                      )}
                      {user?.role === 'SUPER_ADMIN' && (
                        <Button 
                          size="sm" 
                          variant="destructive"
                          className="text-xs"
                          onClick={() => onDeleteTruck(truck.id, truck.license_plate)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Desktop table layout */}
            <div className="hidden sm:block min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Arrival Date/Time</TableHead>
                    <TableHead>Ramp</TableHead>
                    <TableHead>Pallets</TableHead>
                    <TableHead>Processing Time</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Handler</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trucks.map((truck) => (
                    <TableRow key={truck.id}>
                      <TableCell className="font-medium">
                        {truck.license_plate}
                      </TableCell>
                      <TableCell>
                        {formatDate(truck.arrival_date)} {truck.arrival_time}
                      </TableCell>
                      <TableCell>
                        {truck.ramp_number ? `Ramp ${truck.ramp_number}` : 'Not assigned'}
                      </TableCell>
                      <TableCell>{truck.pallet_count}</TableCell>
                      <TableCell>
                        {(() => {
                          const processingTime = calculateProcessingHours(truck.started_at, truck.completed_at);
                          if (!processingTime) return 'Not started';
                          return truck.completed_at 
                            ? `${processingTime.totalHours}h` 
                            : `${processingTime.totalHours}h (ongoing)`;
                        })()}
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
                              onClick={() => onAssignRamp(truck)}
                            >
                              Assign Ramp
                            </Button>
                          )}
                          {truck.status === 'SCHEDULED' && truck.ramp_number && user?.role === 'WAREHOUSE_STAFF' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onUpdateStatus(truck.id, 'ARRIVED')}
                            >
                              Mark Arrived
                            </Button>
                          )}
                          {truck.status === 'ARRIVED' && user?.role === 'WAREHOUSE_STAFF' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onUpdateStatus(truck.id, 'IN_PROGRESS')}
                            >
                              Start Work
                            </Button>
                          )}
                          {truck.status === 'IN_PROGRESS' && user?.role === 'WAREHOUSE_STAFF' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onUpdateStatus(truck.id, 'DONE')}
                            >
                              Mark Done
                            </Button>
                          )}
                          {user?.role === 'SUPER_ADMIN' && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => onDeleteTruck(truck.id, truck.license_plate)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};