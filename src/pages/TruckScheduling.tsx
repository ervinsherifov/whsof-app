import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export const TruckScheduling: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Mock truck data
  const trucks = [
    {
      id: '1',
      licensePlate: 'ABC-123',
      arrivalTime: '09:30',
      rampNumber: 3,
      palletCount: 24,
      cargoDescription: 'Electronics - TVs and computers',
      assignedStaffId: '1',
      assignedStaffName: 'John Smith',
      status: 'ARRIVED',
      createdAt: '2024-06-07T08:00:00Z',
    },
    {
      id: '2',
      licensePlate: 'XYZ-789',
      arrivalTime: '11:00',
      rampNumber: 8,
      palletCount: 18,
      cargoDescription: 'Furniture - Office chairs and desks',
      assignedStaffId: '2',
      assignedStaffName: 'Mike Johnson',
      status: 'SCHEDULED',
      createdAt: '2024-06-07T07:30:00Z',
    },
    {
      id: '3',
      licensePlate: 'DEF-456',
      arrivalTime: '14:00',
      rampNumber: 5,
      palletCount: 32,
      cargoDescription: 'Clothing - Winter collection',
      assignedStaffId: '3',
      assignedStaffName: 'Sarah Wilson',
      status: 'SCHEDULED',
      createdAt: '2024-06-07T09:15:00Z',
    }
  ];

  const [formData, setFormData] = useState({
    licensePlate: '',
    arrivalDate: '',
    arrivalTime: '',
    rampNumber: '',
    palletCount: '',
    cargoDescription: '',
    assignedStaffId: ''
  });

  const availableRamps = [
    { number: 1, type: 'Unloading', available: true },
    { number: 2, type: 'Unloading', available: true },
    { number: 3, type: 'Unloading', available: false },
    { number: 4, type: 'Unloading', available: true },
    { number: 5, type: 'Unloading', available: false },
    { number: 6, type: 'Unloading', available: true },
    { number: 8, type: 'Loading', available: false },
    { number: 9, type: 'Loading', available: true },
    { number: 10, type: 'Loading', available: true },
    { number: 11, type: 'Loading', available: true },
    { number: 12, type: 'Loading', available: true },
    { number: 13, type: 'Loading', available: true },
  ];

  const warehouseStaff = [
    { id: '1', name: 'John Smith' },
    { id: '2', name: 'Mike Johnson' },
    { id: '3', name: 'Sarah Wilson' },
    { id: '4', name: 'David Brown' },
    { id: '5', name: 'Lisa Davis' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'default';
      case 'ARRIVED':
        return 'secondary';
      case 'DONE':
        return 'outline';
      default:
        return 'default';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate time format (24-hour)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.arrivalTime)) {
      toast({
        title: 'Invalid time format',
        description: 'Please use 24-hour format (e.g., 14:30)',
        variant: 'destructive',
      });
      return;
    }

    // Check ramp availability
    const selectedRamp = availableRamps.find(r => r.number.toString() === formData.rampNumber);
    if (!selectedRamp?.available) {
      toast({
        title: 'Ramp not available',
        description: 'The selected ramp is already occupied',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Truck scheduled successfully',
      description: `Truck ${formData.licensePlate} scheduled for ${formData.arrivalTime} at ramp ${formData.rampNumber}`,
    });

    setFormData({
      licensePlate: '',
      arrivalDate: '',
      arrivalTime: '',
      rampNumber: '',
      palletCount: '',
      cargoDescription: '',
      assignedStaffId: ''
    });
    setIsDialogOpen(false);
  };

  const updateTruckStatus = (truckId: string, newStatus: string) => {
    toast({
      title: 'Truck status updated',
      description: `Status changed to ${newStatus}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Truck Scheduling</h1>
          <p className="text-muted-foreground">
            Manage truck arrivals and ramp assignments
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Schedule New Truck</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Truck</DialogTitle>
              <DialogDescription>
                Enter truck details and assign a ramp
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="licensePlate">License Plate</Label>
                <Input
                  id="licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({...formData, licensePlate: e.target.value})}
                  placeholder="ABC-123"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalDate">Arrival Date</Label>
                <Input
                  id="arrivalDate"
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalTime">Arrival Time (24h format)</Label>
                <Input
                  id="arrivalTime"
                  type="time"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rampNumber">Ramp Number</Label>
                <Select value={formData.rampNumber} onValueChange={(value) => setFormData({...formData, rampNumber: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ramp" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRamps
                      .filter(ramp => ramp.available)
                      .map((ramp) => (
                      <SelectItem key={ramp.number} value={ramp.number.toString()}>
                        Ramp {ramp.number} ({ramp.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="palletCount">Number of Pallets</Label>
                <Input
                  id="palletCount"
                  type="number"
                  value={formData.palletCount}
                  onChange={(e) => setFormData({...formData, palletCount: e.target.value})}
                  placeholder="24"
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargoDescription">Cargo Description</Label>
                <Textarea
                  id="cargoDescription"
                  value={formData.cargoDescription}
                  onChange={(e) => setFormData({...formData, cargoDescription: e.target.value})}
                  placeholder="Electronics, furniture, etc."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedStaffId">Assigned Staff</Label>
                <Select value={formData.assignedStaffId} onValueChange={(value) => setFormData({...formData, assignedStaffId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseStaff.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" className="flex-1">Schedule Truck</Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ramp Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Ramp Status Overview</CardTitle>
          <CardDescription>
            Current availability of loading and unloading ramps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {availableRamps.map((ramp) => (
              <div 
                key={ramp.number}
                className={`
                  p-4 rounded-lg border text-center
                  ${ramp.available 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-red-50 border-red-200 text-red-700'
                  }
                `}
              >
                <div className="font-bold text-lg">#{ramp.number}</div>
                <div className="text-sm">{ramp.type}</div>
                <div className="text-xs font-medium mt-1">
                  {ramp.available ? 'Available' : 'Occupied'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Trucks */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Trucks</CardTitle>
          <CardDescription>
            Today's truck schedule and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License Plate</TableHead>
                <TableHead>Arrival Time</TableHead>
                <TableHead>Ramp</TableHead>
                <TableHead>Pallets</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.map((truck) => (
                <TableRow key={truck.id}>
                  <TableCell className="font-medium">
                    {truck.licensePlate}
                  </TableCell>
                  <TableCell>{truck.arrivalTime}</TableCell>
                  <TableCell>
                    Ramp {truck.rampNumber}
                  </TableCell>
                  <TableCell>{truck.palletCount}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {truck.cargoDescription}
                  </TableCell>
                  <TableCell>{truck.assignedStaffName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(truck.status)}>
                      {truck.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {truck.status === 'SCHEDULED' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateTruckStatus(truck.id, 'ARRIVED')}
                        >
                          Mark Arrived
                        </Button>
                      )}
                      {truck.status === 'ARRIVED' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateTruckStatus(truck.id, 'DONE')}
                        >
                          Mark Done
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};