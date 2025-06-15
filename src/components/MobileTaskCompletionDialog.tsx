import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, X } from 'lucide-react';

interface MobileTaskCompletionDialogProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const MobileTaskCompletionDialog: React.FC<MobileTaskCompletionDialogProps> = ({
  taskId,
  taskTitle,
  isOpen,
  onClose,
  onComplete
}) => {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: 'Authentication error',
        description: 'You must be logged in to complete tasks',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Update task with completion info
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'COMPLETED',
          completed_by_user_id: user.id,
          completed_at: new Date().toISOString(),
          completion_comment: comment.trim() || null // Make comment optional
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      toast({
        title: 'Task completed',
        description: `"${taskTitle}" has been marked as completed`,
      });

      setComment('');
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
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="mx-4 max-w-sm rounded-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg">Complete Task</DialogTitle>
          <DialogDescription className="text-sm">
            {taskTitle}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm">
              Add a comment (optional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Any notes about the completed work..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              rows={3}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={submitting}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Completing...</span>
              </div>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};