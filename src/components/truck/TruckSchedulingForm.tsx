import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { parseDate } from '@/lib/dateUtils';
import { 
  sanitizeText, 
  validateLicensePlate, 
  validateCargoDescription, 
  validatePalletCount,
  validateFutureDate,
  validateFutureTime 
} from '@/lib/security';
import { TRUCK_PRIORITIES, TruckPriority } from '@/types';

interface TruckSchedulingFormProps {
  onSuccess: () => void;
}

export const TruckSchedulingForm: React.FC<TruckSchedulingFormProps> = ({ onSuccess }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    licensePlate: '',
    arrivalDate: '',
    arrivalTime: '',
    palletCount: '',
    cargoDescription: '',
    priority: 'NORMAL' as TruckPriority
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: 'Authentication error',
        description: 'You must be logged in to schedule trucks',
        variant: 'destructive',
      });
      return;
    }

    // Sanitize inputs
    const sanitizedLicensePlate = sanitizeText(formData.licensePlate);
    const sanitizedCargoDescription = sanitizeText(formData.cargoDescription);

    // Validate form data with security checks
    if (!sanitizedLicensePlate || !formData.arrivalDate || !formData.arrivalTime || 
        !formData.palletCount || !sanitizedCargoDescription) {
      toast({
        title: 'Validation error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    // Validate license plate format
    if (!validateLicensePlate(sanitizedLicensePlate)) {
      toast({
        title: 'Invalid license plate',
        description: 'License plate must be 1-20 characters, letters, numbers, spaces and hyphens only',
        variant: 'destructive',
      });
      return;
    }

    // Validate cargo description
    if (!validateCargoDescription(sanitizedCargoDescription)) {
      toast({
        title: 'Invalid cargo description',
        description: 'Cargo description must be 1-500 characters and contain no HTML',
        variant: 'destructive',
      });
      return;
    }

    const palletCount = parseInt(formData.palletCount);
    if (!validatePalletCount(palletCount)) {
      toast({
        title: 'Invalid pallet count',
        description: 'Pallet count must be a positive integer between 1 and 100',
        variant: 'destructive',
      });
      return;
    }

    // Parse DD/MM/YYYY date format
    const parsedDate = parseDate(formData.arrivalDate);
    if (!parsedDate) {
      toast({
        title: 'Invalid date format',
        description: 'Please enter date in DD/MM/YYYY format',
        variant: 'destructive',
      });
      return;
    }

    // Format date for validation (avoid timezone issues)
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const localDateString = formatLocalDate(parsedDate);

    // Validate future date
    if (!validateFutureDate(localDateString)) {
      toast({
        title: 'Invalid date',
        description: 'Date must be between today and one year from now',
        variant: 'destructive',
      });
      return;
    }

    // Validate future time for today
    if (!validateFutureTime(localDateString, formData.arrivalTime)) {
      toast({
        title: 'Invalid time',
        description: 'Please select a time at least 2 minutes from now',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('trucks')
        .insert({
          license_plate: sanitizedLicensePlate,
          arrival_date: localDateString,
          arrival_time: formData.arrivalTime,
          pallet_count: palletCount,
          cargo_description: sanitizedCargoDescription,
          priority: formData.priority,
          created_by_user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Truck scheduled successfully',
        description: `Truck ${formData.licensePlate} scheduled for ${formData.arrivalDate} at ${formData.arrivalTime}`,
      });

      setFormData({
        licensePlate: '',
        arrivalDate: '',
        arrivalTime: '',
        palletCount: '',
        cargoDescription: '',
        priority: 'NORMAL' as TruckPriority
      });
      setIsDialogOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error scheduling truck',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full sm:w-auto">Schedule New Truck</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4">
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
            <Label htmlFor="arrivalDate">Arrival Date (DD/MM/YYYY)</Label>
            <Input
              id="arrivalDate"
              type="text"
              value={formData.arrivalDate}
              onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
              placeholder="12/06/2025"
              pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$"
              title="Please enter date in DD/MM/YYYY format"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="arrivalTime">Arrival Time (24h format)</Label>
            <Input
              id="arrivalTime"
              type="text"
              value={formData.arrivalTime}
              onChange={(e) => setFormData({...formData, arrivalTime: e.target.value})}
              placeholder="14:30"
              pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
              title="Please enter time in 24-hour format (HH:MM)"
              required
            />
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
            <Label htmlFor="priority">Priority Level</Label>
            <Select value={formData.priority} onValueChange={(value: TruckPriority) => setFormData({...formData, priority: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRUCK_PRIORITIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {user?.role !== 'OFFICE_ADMIN' && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Note: Ramp and staff assignment will be done by warehouse staff after scheduling.
              </p>
            </div>
          )}

          <div className="flex space-x-2">
            <Button type="submit" className="flex-1">Schedule Truck</Button>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};