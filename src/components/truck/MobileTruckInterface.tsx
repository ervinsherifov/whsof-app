import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/dateUtils';
import { formatDateMobile } from '@/lib/mobileDateUtils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Truck, 
  Clock, 
  Package, 
  CheckCircle, 
  PlayCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Hash,
  UserPlus
} from 'lucide-react';
import { Truck as TruckType } from '@/types';
import { TruckCompletionPhotos } from '@/components/TruckCompletionPhotos';

interface MobileTruckInterfaceProps {
  trucks: TruckType[];
  loading: boolean;
  onRefresh: () => void;
}

export const MobileTruckInterface: React.FC<MobileTruckInterfaceProps> = ({
  trucks,
  loading,
  onRefresh
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [processingTruckId, setProcessingTruckId] = useState<string | null>(null);
  const [assigningRamp, setAssigningRamp] = useState<string | null>(null);

  // Filter trucks relevant for warehouse staff
  const relevantTrucks = trucks.filter(truck => 
    truck.status !== 'DONE'
  );

  const updateTruckStatus = async (truckId: string, newStatus: string) => {
    if (!user?.id || processingTruckId) return;

    setProcessingTruckId(truckId);

    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'ARRIVED') {
        // Call the backend function to handle actual arrival
        await supabase.rpc('handle_truck_arrival', {
          p_truck_id: truckId,
          p_user_id: user.id
        });
        // Don't update here, the RPC function handles it
        onRefresh();
        return;
      } else if (newStatus === 'IN_PROGRESS') {
        updateData.handled_by_user_id = user.id;
        updateData.handled_by_name = user.email;
        updateData.started_at = new Date().toISOString();
      } else if (newStatus === 'DONE') {
        updateData.completed_at = new Date().toISOString();
      }

      // Only update if not ARRIVED (ARRIVED is handled by RPC)
      const { error } = await supabase
        .from('trucks')
        .update(updateData)
        .eq('id', truckId);

      if (error) throw error;

      toast({
        title: 'Status Updated! ✅',
        description: `Truck marked as ${newStatus.replace('_', ' ').toLowerCase()}`,
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingTruckId(null);
    }
  };

  const assignRamp = async (truckId: string, rampNumber: number) => {
    if (!user?.id || assigningRamp) return;

    setAssigningRamp(truckId);

    try {
      const { error } = await supabase
        .from('trucks')
        .update({ ramp_number: rampNumber })
        .eq('id', truckId);

      if (error) throw error;

      toast({
        title: 'Ramp Assigned! ✅',
        description: `Truck assigned to ramp #${rampNumber}`,
      });
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAssigningRamp(null);
    }
  };

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

  const getNextAction = (truck: TruckType) => {
    if (truck.status === 'SCHEDULED') {
      return {
        label: 'Mark Arrived',
        action: () => updateTruckStatus(truck.id, 'ARRIVED'),
        variant: 'default' as const,
        icon: MapPin
      };
    } else if (truck.status === 'ARRIVED') {
      return {
        label: 'Start Work',
        action: () => updateTruckStatus(truck.id, 'IN_PROGRESS'),
        variant: 'default' as const,
        icon: PlayCircle
      };
    } else if (truck.status === 'IN_PROGRESS') {
      return {
        label: 'Mark Done',
        action: () => updateTruckStatus(truck.id, 'DONE'),
        variant: 'default' as const,
        icon: CheckCircle
      };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading trucks...</p>
        </div>
      </div>
    );
  }

  if (relevantTrucks.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <Truck className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-xl font-semibold mb-2">No Active Trucks</h3>
            <p className="text-muted-foreground">
              All trucks are either completed or not yet arrived
            </p>
            <div className="flex items-center justify-center space-x-2 mt-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Auto-refresh active</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600 font-medium">Scheduled</p>
                <p className="text-xl font-bold text-blue-700">
                  {trucks.filter(t => t.status === 'SCHEDULED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-green-600 font-medium">Arrived</p>
                <p className="text-xl font-bold text-green-700">
                  {trucks.filter(t => t.status === 'ARRIVED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <PlayCircle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-orange-600 font-medium">Working</p>
                <p className="text-xl font-bold text-orange-700">
                  {trucks.filter(t => t.status === 'IN_PROGRESS').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Truck Cards */}
      <div className="space-y-4">
        {relevantTrucks.map((truck) => {
          const statusInfo = getStatusInfo(truck.status);
          const nextAction = getNextAction(truck);
          const StatusIcon = statusInfo.icon;
          const isProcessing = processingTruckId === truck.id;

          return (
            <Card key={truck.id} className="overflow-hidden">
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

                   {/* Key Info Grid */}
                   <div className="grid grid-cols-3 gap-4">
                     <div className="text-center">
                       <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                       <p className="text-xs text-muted-foreground">Arrival</p>
                       <p className="font-semibold text-sm">{truck.arrival_time.substring(0, 5)}</p>
                       <p className="text-xs text-muted-foreground">{formatDateMobile(truck.arrival_date)}</p>
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

                  {/* Ramp Assignment for Scheduled Trucks */}
                  {truck.status === 'SCHEDULED' && !truck.ramp_number && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Assign Ramp:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 13 }, (_, i) => i + 1).map((rampNum) => (
                          <Button
                            key={rampNum}
                            onClick={() => assignRamp(truck.id, rampNum)}
                            disabled={assigningRamp === truck.id}
                            variant="outline"
                            size="sm"
                            className="h-10"
                          >
                            <Hash className="h-3 w-3 mr-1" />
                            {rampNum}
                          </Button>
                        ))}
                      </div>
                    </div>
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
        })}
      </div>
    </div>
  );
};