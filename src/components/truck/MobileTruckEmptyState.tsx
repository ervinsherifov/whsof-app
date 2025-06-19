import React from 'react';
import { Truck } from 'lucide-react';

export const MobileTruckEmptyState: React.FC = () => {
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
};