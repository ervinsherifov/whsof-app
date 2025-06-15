import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Camera, 
  Download, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Clock,
  FileImage,
  Grid,
  List
} from 'lucide-react';

interface TruckPhoto {
  id: string;
  photo_url: string;
  file_name?: string;
  file_size_kb?: number;
  mime_type?: string;
  is_primary: boolean;
  capture_timestamp?: string;
  created_at: string;
  uploaded_by_user_id: string;
  annotations?: any[];
}

interface EnhancedTruckPhotosProps {
  truckId: string;
  onPhotosUpdated?: () => void;
}

export const EnhancedTruckPhotos: React.FC<EnhancedTruckPhotosProps> = ({ 
  truckId, 
  onPhotosUpdated 
}) => {
  const [photos, setPhotos] = useState<TruckPhoto[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhoto, setSelectedPhoto] = useState<TruckPhoto | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState<{
    x: number;
    y: number;
    text: string;
    type: string;
  } | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPhotos();
  }, [truckId]);

  const fetchPhotos = async () => {
    try {
      const { data: photosData, error: photosError } = await supabase
        .from('truck_completion_photos')
        .select(`
          *,
          annotations:photo_annotations(*)
        `)
        .eq('truck_id', truckId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (photosError) throw photosError;
      setPhotos(photosData || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching photos',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length > 10) {
      toast({
        title: 'Too many files',
        description: 'You can only upload up to 10 photos at once',
        variant: 'destructive',
      });
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please select only JPEG, PNG, or WebP images',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFiles(files);
  };

  const uploadPhotos = async () => {
    if (!user?.id || selectedFiles.length === 0) return;

    // Check for file size limits to prevent numeric overflow
    const maxFileSize = 50 * 1024 * 1024; // 50MB limit
    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: 'File too large',
        description: `Files must be smaller than 50MB. Found ${oversizedFiles.length} oversized file(s).`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const timestamp = new Date().getTime();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${user.id}/${truckId}_${timestamp}_${index + 1}.${fileExtension}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('truck-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('truck-photos')
          .getPublicUrl(fileName);

        // Calculate file size in KB, ensuring it doesn't exceed integer limits
        const fileSizeKb = Math.min(Math.round(file.size / 1024), 2147483647);

        // Save record to database
        const { error: dbError } = await supabase
          .from('truck_completion_photos')
          .insert({
            truck_id: truckId,
            photo_url: publicUrl,
            category_id: null,
            file_name: file.name,
            file_size_kb: fileSizeKb,
            mime_type: file.type,
            capture_timestamp: new Date().toISOString(),
            uploaded_by_user_id: user.id,
          });

        if (dbError) throw dbError;

        return uploadData;
      });

      await Promise.all(uploadPromises);

      toast({
        title: 'Photos uploaded successfully',
        description: `${selectedFiles.length} photo(s) uploaded`,
      });

      setSelectedFiles([]);
      setShowUploadDialog(false);
      fetchPhotos();
      onPhotosUpdated?.();

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

  const downloadPhoto = async (photo: TruckPhoto) => {
    try {
      const response = await fetch(photo.photo_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.file_name || `truck_photo_${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Failed to download photo',
        variant: 'destructive',
      });
    }
  };

  const downloadAllPhotos = async () => {
    toast({
      title: 'Starting download',
      description: 'Preparing photos for download...',
    });

    try {
      for (const photo of photos) {
        await downloadPhoto(photo);
        // Add small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Some photos failed to download',
        variant: 'destructive',
      });
    }
  };

  const openPhotoModal = (photo: TruckPhoto) => {
    setSelectedPhoto(photo);
    setCurrentPhotoIndex(photos.findIndex(p => p.id === photo.id));
    setZoomLevel(1);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentPhotoIndex - 1)
      : Math.min(photos.length - 1, currentPhotoIndex + 1);
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
    setZoomLevel(1);
  };

  const addAnnotation = async (x: number, y: number) => {
    if (!selectedPhoto || !user?.id || !newAnnotation) return;

    try {
      const { error } = await supabase
        .from('photo_annotations')
        .insert({
          photo_id: selectedPhoto.id,
          x_coordinate: x,
          y_coordinate: y,
          annotation_text: newAnnotation.text,
          annotation_type: newAnnotation.type as any,
          created_by_user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Annotation added',
        description: 'Photo annotation saved successfully',
      });

      setNewAnnotation(null);
      fetchPhotos();
    } catch (error: any) {
      toast({
        title: 'Failed to add annotation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (sizeKb?: number) => {
    if (!sizeKb) return 'Unknown size';
    if (sizeKb < 1024) return `${sizeKb} KB`;
    return `${(sizeKb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Camera className="h-4 w-4 md:h-5 md:w-5" />
                Document Photos ({photos.length})
              </CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="hidden sm:flex"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full sm:w-auto">
                    <Camera className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-4 max-w-sm rounded-lg">
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-lg">Upload Photos</DialogTitle>
                    <DialogDescription className="text-sm">
                      Upload photos for documentation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="photos" className="text-sm font-medium">Select Photos</Label>
                      <Input
                        id="photos"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Select up to 10 photos (JPEG, PNG, WebP)
                      </p>
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Selected files ({selectedFiles.length}):</Label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex justify-between items-center text-xs p-2 bg-muted rounded">
                              <span className="truncate flex-1 mr-2">{file.name}</span>
                              <span className="text-muted-foreground">{formatFileSize(Math.round(file.size / 1024))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        onClick={uploadPhotos}
                        disabled={uploading || selectedFiles.length === 0}
                        className="w-full"
                        size="lg"
                      >
                        {uploading ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span>Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ` : ''}Photos
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowUploadDialog(false)}
                        disabled={uploading}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Action Bar */}
          <div className="flex justify-end mb-6">
            <Button
              variant="outline"
              onClick={downloadAllPhotos}
              disabled={photos.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>

          {/* Photos Grid/List */}
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No photos found</p>
              <p className="text-sm text-muted-foreground">
                Upload photos to get started
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <div 
                    className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary"
                    onClick={() => openPhotoModal(photo)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.file_name || 'Document photo'}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={(e) => {
                          e.stopPropagation();
                          downloadPhoto(photo);
                        }}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="secondary">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Primary badge */}
                    {photo.is_primary && (
                      <Badge className="absolute top-2 left-2 text-xs">
                        Primary
                      </Badge>
                    )}
                    
                    {/* Annotations indicator */}
                    {photo.annotations && photo.annotations.length > 0 && (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="outline" className="text-xs">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {photo.annotations.length}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Photo info */}
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium truncate">
                      {photo.file_name || 'Untitled'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(photo.file_size_kb)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {photos.map((photo) => (
                <div key={photo.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
                  <div 
                    className="w-16 h-16 rounded-lg overflow-hidden bg-muted cursor-pointer"
                    onClick={() => openPhotoModal(photo)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.file_name || 'Document photo'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{photo.file_name || 'Untitled'}</h4>
                      {photo.is_primary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileImage className="h-4 w-4" />
                        {formatFileSize(photo.file_size_kb)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(photo.created_at).toLocaleDateString()}
                      </span>
                      {photo.annotations && photo.annotations.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {photo.annotations.length} annotations
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadPhoto(photo)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPhotoModal(photo)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {selectedPhoto && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <DialogTitle className="text-lg font-semibold">
                    {selectedPhoto.file_name || 'Document Photo'}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Photo {currentPhotoIndex + 1} of {photos.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                    disabled={zoomLevel <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
                    disabled={zoomLevel >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPhoto(selectedPhoto)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="flex-1 overflow-hidden bg-black relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={selectedPhoto.photo_url}
                    alt={selectedPhoto.file_name || 'Document photo'}
                    style={{ 
                      transform: `scale(${zoomLevel})`,
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                    className="transition-transform duration-200"
                  />
                  
                  {/* Annotations */}
                  {selectedPhoto.annotations?.map((annotation) => (
                    <div
                      key={annotation.id}
                      className="absolute w-4 h-4 bg-red-500 border-2 border-white rounded-full cursor-pointer"
                      style={{
                        left: `${annotation.x_coordinate}%`,
                        top: `${annotation.y_coordinate}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      title={annotation.annotation_text}
                    />
                  ))}
                </div>

                {/* Navigation arrows */}
                {photos.length > 1 && (
                  <>
                    <Button
                      className="absolute left-4 top-1/2 transform -translate-y-1/2"
                      size="sm"
                      variant="secondary"
                      onClick={() => navigatePhoto('prev')}
                      disabled={currentPhotoIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      className="absolute right-4 top-1/2 transform -translate-y-1/2"
                      size="sm"
                      variant="secondary"
                      onClick={() => navigatePhoto('next')}
                      disabled={currentPhotoIndex === photos.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Photo Details */}
              <div className="p-4 border-t max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>File Size:</strong> {formatFileSize(selectedPhoto.file_size_kb)}
                  </div>
                  <div>
                    <strong>Upload Date:</strong> {new Date(selectedPhoto.created_at).toLocaleString()}
                  </div>
                  {selectedPhoto.annotations && selectedPhoto.annotations.length > 0 && (
                    <div className="col-span-2">
                      <strong>Annotations:</strong>
                      <div className="space-y-2 mt-1">
                        {selectedPhoto.annotations.map(annotation => (
                          <div key={annotation.id} className="text-xs p-2 bg-muted rounded">
                            <span className="font-medium capitalize">{annotation.annotation_type}:</span> {annotation.annotation_text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};