import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RampStatusGridProps {
  trucks: any[];
}

const availableRamps = [
  { number: 1, type: 'Unloading' },
  { number: 2, type: 'Unloading' },
  { number: 3, type: 'Unloading' },
  { number: 4, type: 'Unloading' },
  { number: 5, type: 'Unloading' },
  { number: 6, type: 'Unloading' },
  { number: 7, type: 'Unloading' },
  { number: 8, type: 'Loading' },
  { number: 9, type: 'Loading' },
  { number: 10, type: 'Loading' },
  { number: 11, type: 'Loading' },
  { number: 12, type: 'Loading' },
  { number: 13, type: 'Loading' },
];

export const RampStatusGrid: React.FC<RampStatusGridProps> = ({ trucks }) => {
  const getRampOccupancy = (rampNumber: number) => {
    const currentTruck = trucks.find(truck => {
      return truck.ramp_number === rampNumber && (truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS');
    });
    
    return currentTruck;
  };

  // Helper to count ramp usage today
  const getRampUsageCount = (rampNumber: number) => {
    const today = new Date().toISOString().split('T')[0];
    return trucks.filter(truck => truck.ramp_number === rampNumber && truck.arrival_date === today).length;
  };

  // Helper to get heatmap color
  const getHeatmapColor = (count: number) => {
    if (count >= 6) return 'bg-red-500/70 border-red-600 text-white';
    if (count >= 4) return 'bg-orange-400/70 border-orange-500 text-white';
    if (count >= 2) return 'bg-yellow-300/70 border-yellow-400 text-yellow-900';
    return 'bg-green-300/70 border-green-400 text-green-900';
  };

  return (
    <Card className="mx-2 sm:mx-0">
      <CardHeader>
        <CardTitle>Ramp Status Overview</CardTitle>
        <CardDescription>
          Current availability of loading and unloading ramps (50-minute time slots)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-2">
          <span className="w-4 h-4 rounded bg-green-300/70 border border-green-400 inline-block mr-1" /> <span className="text-xs">Low</span>
          <span className="w-4 h-4 rounded bg-yellow-300/70 border border-yellow-400 inline-block mx-1" /> <span className="text-xs">Medium</span>
          <span className="w-4 h-4 rounded bg-orange-400/70 border border-orange-500 inline-block mx-1" /> <span className="text-xs">High</span>
          <span className="w-4 h-4 rounded bg-red-500/70 border border-red-600 inline-block mx-1" /> <span className="text-xs">Very High</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {availableRamps.map((ramp) => {
            const currentlyOccupying = getRampOccupancy(ramp.number);
            const isCurrentlyBusy = !!currentlyOccupying;
            const nextTruck = trucks.find(t => 
              t.ramp_number === ramp.number && 
              t.status !== 'DONE' && 
              new Date(`${t.arrival_date}T${t.arrival_time}`) > new Date()
            );
            const usageCount = getRampUsageCount(ramp.number);
            
            return (
              <div 
                key={ramp.number}
                className={`
                  p-4 rounded-lg border text-center
                  ${isCurrentlyBusy 
                    ? 'bg-destructive/10 border-destructive/20 text-destructive' 
                    : nextTruck
                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                  }
                  ${getHeatmapColor(usageCount)}
                `}
              >
                <div className="font-bold text-lg">#{ramp.number}</div>
                <div className="text-sm">{ramp.type}</div>
                <div className="text-xs font-medium mt-1">
                  {isCurrentlyBusy ? 'Occupied' : nextTruck ? 'Scheduled' : 'Available'}
                </div>
                {currentlyOccupying && (
                  <div className="text-xs mt-1">
                    {currentlyOccupying.license_plate}
                    <br />
                    Until: {new Date(`${currentlyOccupying.arrival_date}T${currentlyOccupying.arrival_time}`).getTime() + 50 * 60 * 1000 > Date.now() 
                      ? new Date(new Date(`${currentlyOccupying.arrival_date}T${currentlyOccupying.arrival_time}`).getTime() + 50 * 60 * 1000).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false})
                      : 'Now'
                    }
                  </div>
                )}
                {!currentlyOccupying && nextTruck && (
                  <div className="text-xs mt-1">
                    Next: {nextTruck.license_plate}
                    <br />
                    At: {new Date(`${nextTruck.arrival_date}T${nextTruck.arrival_time}`).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', hour12: false})}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};