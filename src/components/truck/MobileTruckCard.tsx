import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, CheckCircle, MapPin, PlayCircle, Truck } from 'lucide-react';
import { Truck as TruckType } from '@/types';
import { TruckCompletionPhotos } from '@/components/TruckCompletionPhotos';
import { MobileTruckInfo } from './MobileTruckInfo';
import { MobileTruckRampAssignment } from './MobileTruckRampAssignment';

interface MobileTruckCardProps {
  truck: TruckType;
  processingTruckId: string | null;
  assigningRamp: string | null;
  onUpdateStatus: (truckId: string, status: string) => void;
  onAssignRamp: (truckId: string, rampNumber: number) => void;
  onOpenCompletionDialog: (truck: TruckType) => void;
}

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'SCHEDULED':
      return { 
        color: 'bg-blue-500', 
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        icon: Calendar,
        label: 'Scheduled' 
      };
    case 'ARRIVED':
      return { 
        color: 'bg-green-500', 
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        icon: MapPin,
        label: 'Arrived' 
      };
    case 'IN_PROGRESS':
      return { 
        color: 'bg-orange-500', 
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        icon: PlayCircle,
        label: 'In Progress' 
      };
    default:
      return { 
        color: 'bg-gray-500', 
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-50',
        icon: Truck,
        label: status 
      };
  }
};

const getNextAction = (truck: TruckType, onUpdateStatus: (id: string, status: string) => void, onOpenCompletionDialog: (truck: TruckType) => void) => {
  if (truck.status === 'SCHEDULED') {
    return {
      label: 'Mark Arrived',
      action: () => onUpdateStatus(truck.id, 'ARRIVED'),
      variant: 'default' as const,
      icon: MapPin
    };
  } else if (truck.status === 'ARRIVED') {
    return {
      label: 'Start Work',
      action: () => onUpdateStatus(truck.id, 'IN_PROGRESS'),
      variant: 'default' as const,
      icon: PlayCircle
    };
  } else if (truck.status === 'IN_PROGRESS') {
    return {
      label: 'Mark Done',
      action: () => onOpenCompletionDialog(truck),
      variant: 'default' as const,
      icon: CheckCircle
    };
  }
  return null;
};

export const MobileTruckCard: React.FC<MobileTruckCardProps> = ({
  truck,
  processingTruckId,
  assigningRamp,
  onUpdateStatus,
  onAssignRamp,
  onOpenCompletionDialog
}) => {
  const statusInfo = getStatusInfo(truck.status);
  const nextAction = getNextAction(truck, onUpdateStatus, onOpenCompletionDialog);
  const StatusIcon = statusInfo.icon;
  const isProcessing = processingTruckId === truck.id;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Status Bar */}
        <div className={`h-2 ${statusInfo.color}`} />
        
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                <StatusIcon className={`h-5 w-5 ${statusInfo.textColor}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold">{truck.license_plate}</h3>
                <p className={`text-sm font-medium ${statusInfo.textColor}`}>
                  {statusInfo.label}
                </p>
              </div>
            </div>
            
            {truck.priority === 'URGENT' && (
              <div className="flex items-center space-x-1 bg-red-100 px-2 py-1 rounded-full">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-medium text-red-600">URGENT</span>
              </div>
            )}
          </div>

          <MobileTruckInfo truck={truck} />

          {/* Ramp Assignment for Scheduled Trucks */}
          {truck.status === 'SCHEDULED' && !truck.ramp_number && (
            <MobileTruckRampAssignment
              truckId={truck.id}
              assigningRamp={assigningRamp}
              onAssignRamp={onAssignRamp}
            />
          )}

          {/* Photo Section for In Progress Trucks */}
          {truck.status === 'IN_PROGRESS' && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium text-muted-foreground">Truck Documentation</h4>
              <TruckCompletionPhotos 
                truckId={truck.id}
                onPhotosUploaded={() => {}}
              />
            </div>
          )}

          {/* Action Button */}
          {nextAction && (
            <Button
              onClick={nextAction.action}
              disabled={isProcessing}
              variant={nextAction.variant}
              size="lg"
              className="w-full h-12 text-lg font-semibold"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <nextAction.icon className="h-5 w-5" />
                  <span>{nextAction.label}</span>
                </div>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};