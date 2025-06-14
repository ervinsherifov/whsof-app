import React from 'react';
import { EnhancedTruckPhotos } from './truck/EnhancedTruckPhotos';

interface TruckCompletionPhotosProps {
  truckId: string;
  onPhotosUploaded: () => void;
}

export const TruckCompletionPhotos: React.FC<TruckCompletionPhotosProps> = ({ 
  truckId, 
  onPhotosUploaded 
}) => {

  return (
    <EnhancedTruckPhotos 
      truckId={truckId} 
      onPhotosUpdated={onPhotosUploaded} 
    />
  );
};