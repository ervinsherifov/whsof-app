import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Truck, ExceptionType, TaskPriority, EXCEPTION_TYPES, TASK_PRIORITIES } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface ExceptionDialogProps {
  truck: Truck;
  onExceptionCreated?: () => void;
}

export const ExceptionDialog = ({ truck, onExceptionCreated }: ExceptionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    exception_type: '' as ExceptionType,
    reason: '',
    estimated_resolution_time: '',
    priority: 'MEDIUM' as TaskPriority,
    notes: ''
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('truck_exceptions')
        .insert({
          truck_id: truck.id,
          exception_type: formData.exception_type,
          reason: formData.reason,
          estimated_resolution_time: formData.estimated_resolution_time || null,
          priority: formData.priority,
          reported_by_user_id: user.id,
          notes: formData.notes || null
        });

      if (error) throw error;

      toast({
        title: 'Exception Reported',
        description: `Exception for truck ${truck.license_plate} has been reported successfully.`,
      });

      setOpen(false);
      setFormData({
        exception_type: '' as ExceptionType,
        reason: '',
        estimated_resolution_time: '',
        priority: 'MEDIUM' as TaskPriority,
        notes: ''
      });
      onExceptionCreated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Report Exception
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Report Exception for {truck.license_plate}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="exception_type">Exception Type</Label>
            <Select
              value={formData.exception_type}
              onValueChange={(value: ExceptionType) => 
                setFormData(prev => ({ ...prev, exception_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select exception type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXCEPTION_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {String(label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Describe the issue"
              required
            />
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: TaskPriority) => 
                setFormData(prev => ({ ...prev, priority: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_PRIORITIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {String(label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="estimated_resolution_time">Estimated Resolution Time</Label>
            <Input
              id="estimated_resolution_time"
              type="datetime-local"
              value={formData.estimated_resolution_time}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_resolution_time: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.exception_type || !formData.reason}>
              {loading ? 'Reporting...' : 'Report Exception'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};