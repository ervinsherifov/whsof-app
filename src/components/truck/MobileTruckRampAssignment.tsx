import React from 'react';
import { Button } from '@/components/ui/button';
import { Hash } from 'lucide-react';

interface MobileTruckRampAssignmentProps {
  truckId: string;
  assigningRamp: string | null;
  onAssignRamp: (truckId: string, rampNumber: number) => void;
}

export const MobileTruckRampAssignment: React.FC<MobileTruckRampAssignmentProps> = ({
  truckId,
  assigningRamp,
  onAssignRamp
}) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Assign Ramp:</p>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 13 }, (_, i) => i + 1).map((rampNum) => (
          <Button
            key={rampNum}
            onClick={() => onAssignRamp(truckId, rampNum)}
            disabled={assigningRamp === truckId}
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
  );
};