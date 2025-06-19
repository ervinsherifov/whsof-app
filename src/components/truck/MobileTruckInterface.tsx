import React from 'react';
import { Truck as TruckType } from '@/types';
import { MobileTruckCompletionDialog } from '@/components/truck/MobileTruckCompletionDialog';
import { MobileTruckStats } from './MobileTruckStats';
import { MobileTruckCard } from './MobileTruckCard';
import { MobileTruckLoadingState } from './MobileTruckLoadingState';
import { MobileTruckEmptyState } from './MobileTruckEmptyState';
import { useMobileTruckInterface } from '@/hooks/useMobileTruckInterface';

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
  const {
    processingTruckId,
    assigningRamp,
    completionDialogOpen,
    selectedTruckForCompletion,
    warehouseStaff,
    updateTruckStatus,
    assignRamp,
    openCompletionDialog,
    closeCompletionDialog
  } = useMobileTruckInterface();

  // Filter trucks relevant for warehouse staff
  const relevantTrucks = trucks.filter(truck => truck.status !== 'DONE');

  const handleUpdateStatus = (truckId: string, newStatus: string) => {
    updateTruckStatus(truckId, newStatus, onRefresh);
  };

  const handleAssignRamp = (truckId: string, rampNumber: number) => {
    assignRamp(truckId, rampNumber, onRefresh);
  };

  const handleCompleteTask = () => {
    onRefresh();
  };

  if (loading) {
    return <MobileTruckLoadingState />;
  }

  if (relevantTrucks.length === 0) {
    return <MobileTruckEmptyState />;
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Quick Stats */}
      <MobileTruckStats trucks={trucks} />

      {/* Truck Cards */}
      <div className="space-y-4">
        {relevantTrucks.map((truck) => (
          <MobileTruckCard
            key={truck.id}
            truck={truck}
            processingTruckId={processingTruckId}
            assigningRamp={assigningRamp}
            onUpdateStatus={handleUpdateStatus}
            onAssignRamp={handleAssignRamp}
            onOpenCompletionDialog={openCompletionDialog}
          />
        ))}
      </div>

      {/* Truck Completion Dialog */}
      {selectedTruckForCompletion && (
        <MobileTruckCompletionDialog
          truckId={selectedTruckForCompletion.id}
          truckLicensePlate={selectedTruckForCompletion.license_plate}
          isOpen={completionDialogOpen}
          onClose={closeCompletionDialog}
          onComplete={handleCompleteTask}
          warehouseStaff={warehouseStaff}
        />
      )}
    </div>
  );
};