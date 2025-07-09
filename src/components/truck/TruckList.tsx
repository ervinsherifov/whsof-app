import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatTime, formatDateTime, formatTimeString } from '@/lib/dateUtils';
import { formatProcessingTime } from '@/lib/truckUtils';
import { SearchHighlight } from '@/components/ui/search-highlight';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Pencil, Trash2 } from 'lucide-react';
import { TRUCK_STATUSES } from '@/types';

interface TruckListProps {
  trucks: any[];
  loading: boolean;
  onAssignRamp: (truck: any) => void;
  onUpdateStatus: (truckId: string, status: string) => void;
  onDeleteTruck: (truckId: string, licensePlate: string) => void;
  onReschedule?: (truck: any) => void;
  searchTerm?: string;
  onClearFilters?: () => void;
}

export const TruckList: React.FC<TruckListProps> = ({
  trucks,
  loading,
  onAssignRamp,
  onUpdateStatus,
  onDeleteTruck,
  onReschedule,
  searchTerm = '',
  onClearFilters
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
        <CardTitle>Truck List</CardTitle>
        <CardDescription>Overview of all trucks and their statuses</CardDescription>
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
                      <div className="font-medium text-lg">
                        <SearchHighlight text={truck.license_plate} searchTerm={searchTerm} />
                      </div>
                      <Badge variant={getStatusColor(truck.status)}>
                        {truck.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE' 
                            ? 'Actual Arrival:' : 'Arrival:'}
                        </span>
                        <div className="font-medium">
                          {(() => {
                            // Prefer actual arrival if available
                            const date = truck.actual_arrival_date || truck.arrival_date;
                            const time = truck.actual_arrival_time || truck.arrival_time;
                            const formattedDate = date ? formatDate(date) : '--';
                            const formattedTime = time ? formatTimeString(time) : '--';
                            if (
                              !date ||
                              !time ||
                              formattedDate === 'Invalid Date' ||
                              formattedTime === 'Invalid Time' ||
                              formattedTime === '--'
                            ) {
                              return '--';
                            }
                            return `${formattedDate} ${formattedTime}`;
                          })()}
                        </div>
                        <div className="font-medium">
                          {(() => {
                            const time = truck.actual_arrival_time ? formatTimeString(truck.actual_arrival_time) : formatTimeString(truck.arrival_time);
                            return time;
                          })()}
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
                            {formatProcessingTime(truck.started_at, truck.completed_at)}
                          </div>
                        </div>
                       )}
                     </div>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="text-muted-foreground text-xs">Cargo:</span>
                        <div className="text-sm break-words">
                          <SearchHighlight text={truck.cargo_description} searchTerm={searchTerm} />
                        </div>
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
                      
                      {/* Reschedule button for overdue trucks or admins */}
                      {((truck.is_overdue || truck.status === 'SCHEDULED') && (user?.role === 'OFFICE_ADMIN' || user?.role === 'SUPER_ADMIN')) && onReschedule && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="text-xs"
                          onClick={() => onReschedule(truck)}
                        >
                          Reschedule
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
                    <TableHead>Arrival</TableHead>
                    <TableHead>Ramp</TableHead>
                    <TableHead>Pallets</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Handled By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trucks.map((truck) => (
                    <TableRow key={truck.id}>
                      <TableCell className="font-medium">
                        <SearchHighlight text={truck.license_plate} searchTerm={searchTerm} />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Prefer actual arrival if available
                          const date = truck.actual_arrival_date || truck.arrival_date;
                          const time = truck.actual_arrival_time || truck.arrival_time;
                          const formattedDate = date ? formatDate(date) : '--';
                          const formattedTime = time ? formatTimeString(time) : '--';
                          if (
                            !date ||
                            !time ||
                            formattedDate === 'Invalid Date' ||
                            formattedTime === 'Invalid Time' ||
                            formattedTime === '--'
                          ) {
                            return '--';
                          }
                          return `${formattedDate} ${formattedTime}`;
                        })()}
                      </TableCell>
                      <TableCell>
                        {truck.ramp_number ? `Ramp ${truck.ramp_number}` : 'Not assigned'}
                      </TableCell>
                      <TableCell>{truck.pallet_count}</TableCell>
                       <TableCell>
                        {formatProcessingTime(truck.started_at, truck.completed_at)}
                      </TableCell>
                       <TableCell className="max-w-xs truncate">
                        <SearchHighlight text={truck.cargo_description} searchTerm={searchTerm} />
                      </TableCell>
                      <TableCell>
                        {Array.isArray(truck.handled_by_name) ? truck.handled_by_name.filter(Boolean).join(', ') : (truck.handled_by_name || '--')}
                      </TableCell>
                      <TableCell>
                        <span className={
                          truck.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold' :
                          truck.status === 'ARRIVED' ? 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold' :
                          truck.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold' :
                          'bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs font-semibold'
                        }>
                          {TRUCK_STATUSES[truck.status] || truck.status}
                        </span>
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
                          
                          {/* Reschedule button for overdue trucks or admins */}
                          {((truck.is_overdue || truck.status === 'SCHEDULED') && (user?.role === 'OFFICE_ADMIN' || user?.role === 'SUPER_ADMIN')) && onReschedule && (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => onReschedule(truck)}
                            >
                              Reschedule
                            </Button>
                          )}
                          
                          {user?.role === 'SUPER_ADMIN' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDeleteTruck(truck.id, truck.license_plate)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {trucks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                        No trucks found for the selected filters.
                        {onClearFilters && (
                          <Button variant="outline" size="sm" className="ml-2" onClick={onClearFilters}>Clear Filters</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};