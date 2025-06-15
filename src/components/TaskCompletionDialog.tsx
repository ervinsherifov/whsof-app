import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Upload } from 'lucide-react';

interface TaskCompletionDialogProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const TaskCompletionDialog: React.FC<TaskCompletionDialogProps> = ({
  taskId,
  taskTitle,
  isOpen,
  onClose,
  onComplete
}) => {
  const [comment, setComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length > 3) {
      toast({
        title: 'Too many files',
        description: 'You can only upload up to 3 photos',
        variant: 'destructive',
      });
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please select only JPEG or PNG images',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFiles(files);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: 'Authentication error',
        description: 'You must be logged in to complete tasks',
        variant: 'destructive',
      });
      return;
    }

    // Comment is now optional - no validation needed

    setSubmitting(true);

    try {
      // Upload photos first if any
      const photoUrls: string[] = [];
      
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(async (file, index) => {
          const timestamp = new Date().getTime();
          const fileName = `task-photos/${user.id}/${taskId}_${timestamp}_${index + 1}.${file.name.split('.').pop()}`;

          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('truck-photos') // Reusing the same bucket for now
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('truck-photos')
            .getPublicUrl(fileName);

          return publicUrl;
        });

        const urls = await Promise.all(uploadPromises);
        photoUrls.push(...urls);
      }

      // Update task with completion info
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'COMPLETED',
          completed_by_user_id: user.id,
          completed_at: new Date().toISOString(),
          completion_comment: comment.trim() || null
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Save task completion photos to database
      if (photoUrls.length > 0) {
        const photoInserts = photoUrls.map(url => ({
          task_id: taskId,
          photo_url: url,
          uploaded_by_user_id: user.id
        }));

        const { error: photoError } = await supabase
          .from('task_completion_photos')
          .insert(photoInserts);

        if (photoError) throw photoError;
      }

      toast({
        title: 'Task completed',
        description: `Task "${taskTitle}" has been marked as completed`,
      });

      setComment('');
      setSelectedFiles([]);
      onComplete();
      onClose();

    } catch (error: any) {
      toast({
        title: 'Error completing task',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setComment('');
      setSelectedFiles([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
          <DialogDescription>
            Add a completion comment for: {taskTitle}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comment">Completion Comment (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Describe what was completed, any issues encountered, or notes for future reference..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos">Photos (optional, max 3)</Label>
            <Input
              id="photos"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              multiple
              onChange={handleFileSelect}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              You can take photos or upload existing images to document the completed work
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Selected files:</Label>
              <ul className="text-sm text-muted-foreground">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Camera className="h-3 w-3" />
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 animate-spin" />
                Completing...
              </div>
            ) : (
              'Complete Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};