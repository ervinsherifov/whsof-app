import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Camera } from 'lucide-react';

interface TruckCompletionPhotosProps {
  truckId: string;
  onPhotosUploaded: () => void;
}

export const TruckCompletionPhotos: React.FC<TruckCompletionPhotosProps> = ({ 
  truckId, 
  onPhotosUploaded 
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

  const uploadPhotos = async () => {
    if (!user?.id) {
      toast({
        title: 'Authentication error',
        description: 'You must be logged in to upload photos',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one photo to upload',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const timestamp = new Date().getTime();
        const fileName = `${user.id}/${truckId}_${timestamp}_${index + 1}.${file.name.split('.').pop()}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('truck-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('truck-photos')
          .getPublicUrl(fileName);

        // Save record to database
        const { error: dbError } = await supabase
          .from('truck_completion_photos')
          .insert({
            truck_id: truckId,
            photo_url: publicUrl,
            uploaded_by_user_id: user.id,
          });

        if (dbError) throw dbError;

        return uploadData;
      });

      await Promise.all(uploadPromises);

      toast({
        title: 'Photos uploaded successfully',
        description: `${selectedFiles.length} photo(s) uploaded for truck completion`,
      });

      setSelectedFiles([]);
      onPhotosUploaded();

    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Completion Photos
        </CardTitle>
        <CardDescription>
          Upload up to 3 photos to document truck completion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="photos">Select Photos (max 3)</Label>
          <Input
            id="photos"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            capture="environment"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label>Selected files:</Label>
            <ul className="text-sm text-muted-foreground">
              {selectedFiles.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}

        <Button 
          onClick={uploadPhotos} 
          disabled={uploading || selectedFiles.length === 0}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Upload Photos'}
        </Button>
      </CardContent>
    </Card>
  );
};