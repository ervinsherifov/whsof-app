import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, PlayCircle } from 'lucide-react';
import { Truck as TruckType } from '@/types';

interface MobileTruckStatsProps {
  trucks: TruckType[];
}

export const MobileTruckStats: React.FC<MobileTruckStatsProps> = ({ trucks }) => {
  return (
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
  );
};