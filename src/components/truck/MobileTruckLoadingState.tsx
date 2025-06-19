import React from 'react';

export const MobileTruckLoadingState: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-lg text-muted-foreground">Loading trucks...</p>
      </div>
    </div>
  );
};