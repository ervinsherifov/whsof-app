import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const TVDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(timer);
  }, []);

  // Mock data
  const trucks = [
    {
      id: '1',
      licensePlate: 'ABC-123',
      arrivalTime: '09:30',
      rampNumber: 3,
      status: 'ARRIVED',
      palletCount: 24,
      cargoDescription: 'Electronics',
      assignedStaff: 'John Smith'
    },
    {
      id: '2',
      licensePlate: 'XYZ-789',
      rampNumber: 8,
      status: 'DONE',
      palletCount: 18,
      cargoDescription: 'Furniture',
      assignedStaff: 'Mike Johnson'
    },
    {
      id: '3',
      licensePlate: 'DEF-456',
      arrivalTime: '14:00',
      rampNumber: 5,
      status: 'SCHEDULED',
      palletCount: 32,
      cargoDescription: 'Clothing',
      assignedStaff: 'Sarah Wilson'
    }
  ];

  const urgentTasks = [
    {
      id: '1',
      title: 'Unload Truck ABC-123',
      priority: 'URGENT',
      assignedTo: 'John Smith',
      dueTime: '10:00'
    },
    {
      id: '2',
      title: 'Emergency inventory check',
      priority: 'HIGH',
      assignedTo: 'Team A',
      dueTime: '11:30'
    },
    {
      id: '3',
      title: 'Prepare outbound shipment',
      priority: 'URGENT',
      assignedTo: 'Mike Johnson',
      dueTime: '15:00'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-500';
      case 'ARRIVED':
        return 'bg-green-500';
      case 'DONE':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold mb-4">Warehouse Operations</h1>
        <div className="text-4xl font-mono text-muted-foreground">
          {currentTime.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        <div className="text-2xl text-muted-foreground">
          {currentTime.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Trucks Status */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl">Truck Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trucks.map((truck) => (
                <div 
                  key={truck.id}
                  className="border rounded-lg p-4 bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold">{truck.licensePlate}</div>
                    <Badge 
                      className={`text-white text-lg px-3 py-1 ${getStatusColor(truck.status)}`}
                    >
                      {truck.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-lg">
                    <div>
                      <span className="text-muted-foreground">Ramp:</span>
                      <div className="font-bold text-2xl">#{truck.rampNumber}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pallets:</span>
                      <div className="font-bold text-2xl">{truck.palletCount}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-lg">
                    <span className="text-muted-foreground">Cargo:</span> {truck.cargoDescription}
                  </div>
                  <div className="mt-2 text-lg">
                    <span className="text-muted-foreground">Staff:</span> {truck.assignedStaff}
                  </div>
                  {truck.arrivalTime && (
                    <div className="mt-2 text-lg">
                      <span className="text-muted-foreground">ETA:</span> {truck.arrivalTime}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Tasks */}
        <Card className="h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl">Urgent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {urgentTasks.map((task) => (
                <div 
                  key={task.id}
                  className="border rounded-lg p-4 bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xl font-bold">{task.title}</div>
                    <Badge 
                      className={`text-white text-lg px-3 py-1 ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-lg">
                    <div>
                      <span className="text-muted-foreground">Assigned to:</span>
                      <div className="font-semibold">{task.assignedTo}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due time:</span>
                      <div className="font-bold text-xl">{task.dueTime}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ramp Status Grid */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl">Ramp Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, i) => {
              const rampNumber = i + 1;
              const isUnloading = rampNumber <= 6;
              const isOccupied = [3, 5, 8].includes(rampNumber);
              
              return (
                <div 
                  key={rampNumber}
                  className={`
                    aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-center p-4
                    ${isOccupied 
                      ? 'bg-red-100 border-red-500 text-red-700' 
                      : 'bg-green-100 border-green-500 text-green-700'
                    }
                  `}
                >
                  <div className="text-3xl font-bold">#{rampNumber}</div>
                  <div className="text-sm font-medium">
                    {isUnloading ? 'Unloading' : 'Loading'}
                  </div>
                  <div className="text-lg font-bold mt-1">
                    {isOccupied ? 'BUSY' : 'FREE'}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-center space-x-8 text-lg">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Available</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 text-muted-foreground text-lg">
        Auto-refresh: 30s
      </div>
    </div>
  );
};