import React from 'react';
import { Clock, MapPin, Package, UserPlus } from 'lucide-react';
import { formatDateMobile } from '@/lib/mobileDateUtils';
import { Truck as TruckType } from '@/types';

interface MobileTruckInfoProps {
  truck: TruckType;
}

export const MobileTruckInfo: React.FC<MobileTruckInfoProps> = ({ truck }) => {
  return (
    <>
      {/* Key Info Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">
            {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE' 
              ? 'Actual Arrival' : 'Arrival'}
          </p>
          <p className="font-semibold text-sm">
            {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE'
              ? (truck.actual_arrival_time 
                  ? truck.actual_arrival_time.substring(0, 5)
                  : truck.arrival_time.substring(0, 5)
                )
              : truck.arrival_time.substring(0, 5)
            }
          </p>
          <p className="text-xs text-muted-foreground">
            {truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS' || truck.status === 'DONE'
              ? (truck.actual_arrival_date 
                  ? formatDateMobile(truck.actual_arrival_date)
                  : formatDateMobile(truck.arrival_date)
                )
              : formatDateMobile(truck.arrival_date)
            }
          </p>
        </div>
        
        <div className="text-center">
          <MapPin className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Ramp</p>
          <p className="font-semibold text-sm">
            {truck.ramp_number ? `#${truck.ramp_number}` : 'TBD'}
          </p>
        </div>
        
        <div className="text-center">
          <Package className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Pallets</p>
          <p className="font-semibold text-sm">{truck.pallet_count}</p>
        </div>
      </div>

      {/* Cargo Description */}
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-sm text-muted-foreground mb-1">Cargo:</p>
        <p className="text-sm font-medium line-clamp-2">{truck.cargo_description}</p>
      </div>

      {/* Additional Info */}
      <div className="space-y-2 text-sm">
        {(truck as any).created_by_profile && (
          <div className="flex items-center space-x-2">
            <UserPlus className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Scheduled by:</span>
            <span className="font-medium">{(truck as any).created_by_profile?.display_name || (truck as any).created_by_profile?.email || 'Unknown'}</span>
          </div>
        )}
        
        {/* Handler Info */}
        {truck.handled_by_name && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-muted-foreground">Handler:</span>
            <span className="font-medium">{truck.handled_by_name}</span>
          </div>
        )}
      </div>
    </>
  );
};