import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Camera, 
  Download, 
  Eye, 
  Filter, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Trash2,
  Tag,
  Clock,
  FileImage,
  Grid,
  List
} from 'lucide-react';

interface PhotoCategory {
  id: string;
  name: string;
  description: string;
  color_code: string;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

interface TruckPhoto {
  id: string;
  photo_url: string;
  category_id?: string;
  file_name?: string;
  file_size_kb?: number;
  mime_type?: string;
  is_primary: boolean;
  capture_timestamp?: string;
  tags?: string[];
  created_at: string;
  uploaded_by_user_id: string;
  category?: PhotoCategory;
  annotations?: any[];
  quality_metrics?: any[];
}

interface PhotoAnnotation {
  id: string;
  x_coordinate: number;
  y_coordinate: number;
  annotation_text: string;
  annotation_type: 'note' | 'issue' | 'measurement' | 'highlight';
  created_by_user_id: string;
  created_at: string;
}

interface PhotoQualityMetrics {
  id: string;
  quality_score?: number;
  file_size_kb?: number;
  resolution_width?: number;
  resolution_height?: number;
}

interface ComplianceInfo {
  truck_id: string;
  required_categories: string[];
  completed_categories: string[];
  compliance_score: number;
  is_compliant: boolean;
  photo_count: number;
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
  const [categories, setCategories] = useState<PhotoCategory[]>([]);
  const [compliance, setCompliance] = useState<ComplianceInfo | null>(null);
  const [filteredPhotos, setFilteredPhotos] = useState<TruckPhoto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
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
  const [uploadCategory, setUploadCategory] = useState<string>('');
  
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchCategories();
    fetchPhotos();
    fetchCompliance();
  }, [truckId]);

  useEffect(() => {
    filterPhotos();
  }, [photos, selectedCategory, searchTerm]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching categories',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchPhotos = async () => {
    try {
      const { data: photosData, error: photosError } = await supabase
        .from('truck_completion_photos')
        .select(`
          *,
          category:photo_categories(*),
          annotations:photo_annotations(*),
          quality_metrics:photo_quality_metrics(*)
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

  const fetchCompliance = async () => {
    try {
      const { data, error } = await supabase
        .rpc('check_truck_photo_compliance', { truck_id_param: truckId });
      
      if (error) throw error;
      if (data && typeof data === 'object') {
        setCompliance(data as unknown as ComplianceInfo);
      }
    } catch (error: any) {
      console.error('Error fetching compliance:', error);
    }
  };

  const filterPhotos = () => {
    let filtered = photos;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(photo => 
        photo.category_id === selectedCategory || 
        (selectedCategory === 'uncategorized' && !photo.category_id)
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(photo =>
        photo.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPhotos(filtered);
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

    // Check if documents category is required and selected
    const documentsCategory = categories.find(cat => cat.name === 'documents' && cat.is_required);
    if (documentsCategory && !uploadCategory) {
      toast({
        title: 'Category required',
        description: 'Please select a category. Documents category is required for truck completion.',
        variant: 'destructive',
      });
      return;
    }

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
            category_id: uploadCategory || null,
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
      setUploadCategory('');
      setShowUploadDialog(false);
      fetchPhotos();
      fetchCompliance();
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
      for (const photo of filteredPhotos) {
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
    setCurrentPhotoIndex(filteredPhotos.findIndex(p => p.id === photo.id));
    setZoomLevel(1);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentPhotoIndex - 1)
      : Math.min(filteredPhotos.length - 1, currentPhotoIndex + 1);
    
    setCurrentPhotoIndex(newIndex);
    setSelectedPhoto(filteredPhotos[newIndex]);
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

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Compliance Summary */}
      {compliance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {compliance.is_compliant ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Photo Compliance
            </CardTitle>
            <CardDescription>
              Documentation requirements for truck completion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getComplianceColor(compliance.compliance_score)}`}>
                  {compliance.compliance_score.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Compliance Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{compliance.photo_count}</div>
                <div className="text-sm text-muted-foreground">Total Photos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {compliance.completed_categories.length}/{compliance.required_categories.length}
                </div>
                <div className="text-sm text-muted-foreground">Required Categories</div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {compliance.required_categories.map(category => (
                <Badge
                  key={category}
                  variant={compliance.completed_categories.includes(category) ? "default" : "destructive"}
                  className="text-xs"
                >
                  {category.replace('_', ' ')}
                  {compliance.completed_categories.includes(category) && (
                    <CheckCircle className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Truck Photos ({filteredPhotos.length})
              </CardTitle>
              <CardDescription>
                Document truck completion with categorized photos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Photos</DialogTitle>
                    <DialogDescription>
                      Upload photos for truck documentation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="photos">Select Photos</Label>
                      <Input
                        id="photos"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        disabled={uploading}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category">
                        Category <span className="text-red-500">*</span>
                      </Label>
                      <Select value={uploadCategory} onValueChange={setUploadCategory} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category (required)" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                              {category.is_required && <span className="text-red-500"> *</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {categories.find(cat => cat.name === 'documents')?.is_required && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Documents category is required for truck completion
                        </p>
                      )}
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Selected files:</Label>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{file.name}</span>
                              <span>{formatFileSize(Math.round(file.size / 1024))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={uploadPhotos}
                        disabled={uploading || selectedFiles.length === 0 || !uploadCategory}
                        className="flex-1"
                      >
                        {uploading ? 'Uploading...' : 'Upload Photos'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowUploadDialog(false)}
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
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search photos by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={downloadAllPhotos}
              disabled={filteredPhotos.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>

          {/* Photos Grid/List */}
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No photos found</p>
              <p className="text-sm text-muted-foreground">
                {photos.length === 0 ? 'Upload photos to get started' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <div 
                    className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary"
                    onClick={() => openPhotoModal(photo)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.file_name || 'Truck photo'}
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
                    
                    {/* Category badge */}
                    {photo.category && (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2 text-xs"
                        style={{ backgroundColor: photo.category.color_code + '20', color: photo.category.color_code }}
                      >
                        {photo.category.name}
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
                      {photo.quality_metrics && photo.quality_metrics.length > 0 && photo.quality_metrics[0]?.quality_score && (
                        <span>Q: {photo.quality_metrics[0].quality_score.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
                  <div 
                    className="w-16 h-16 rounded-lg overflow-hidden bg-muted cursor-pointer"
                    onClick={() => openPhotoModal(photo)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.file_name || 'Truck photo'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{photo.file_name || 'Untitled'}</h4>
                      {photo.is_primary && (
                        <Badge variant="default" className="text-xs">Primary</Badge>
                      )}
                      {photo.category && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{ backgroundColor: photo.category.color_code + '20', color: photo.category.color_code }}
                        >
                          {photo.category.name}
                        </Badge>
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
                      {photo.quality_metrics && photo.quality_metrics.length > 0 && photo.quality_metrics[0]?.quality_score && (
                        <span>Quality: {photo.quality_metrics[0].quality_score.toFixed(1)}/10</span>
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
                    {selectedPhoto.file_name || 'Truck Photo'}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Photo {currentPhotoIndex + 1} of {filteredPhotos.length}
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
                    alt={selectedPhoto.file_name || 'Truck photo'}
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
                {filteredPhotos.length > 1 && (
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
                      disabled={currentPhotoIndex === filteredPhotos.length - 1}
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
                  {selectedPhoto.category && (
                    <div>
                      <strong>Category:</strong> {selectedPhoto.category.name}
                    </div>
                  )}
                  {selectedPhoto.quality_metrics && selectedPhoto.quality_metrics.length > 0 && selectedPhoto.quality_metrics[0]?.quality_score && (
                    <div>
                      <strong>Quality Score:</strong> {selectedPhoto.quality_metrics[0].quality_score.toFixed(1)}/10
                    </div>
                  )}
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