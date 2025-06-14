import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Play } from 'lucide-react';

interface SoundControlsProps {
  enabled: boolean;
  onToggle: () => void;
  onTestSound: (status: string) => void;
  onInitializeAudio?: () => void;
  className?: string;
}

export const SoundControls: React.FC<SoundControlsProps> = ({
  enabled,
  onToggle,
  onTestSound,
  className = ""
}) => {
  const statusSounds = [
    { status: 'SCHEDULED', label: 'Scheduled', color: 'bg-secondary text-secondary-foreground' },
    { status: 'ARRIVED', label: 'Arrived', color: 'bg-green-600 text-green-50' },
    { status: 'IN_PROGRESS', label: 'In Progress', color: 'bg-orange-600 text-orange-50' },
    { status: 'DONE', label: 'Completed', color: 'bg-blue-600 text-blue-50' }
  ];

  return (
    <Card className={`bg-card/90 backdrop-blur-sm border-border/50 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Sound Notifications</CardTitle>
          <Button
            onClick={onToggle}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            {enabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground mb-2">
          {enabled ? 'Notifications enabled' : 'Notifications disabled'}
        </div>
        
        {enabled && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">Test Sounds:</div>
            
            {/* Simple Test Button */}
            <Button
              onClick={() => onTestSound('TEST')}
              variant="default"
              size="sm"
              className="w-full h-8 text-xs mb-2 bg-orange-600 hover:bg-orange-700"
            >
              🔊 LOUD TEST BEEP
            </Button>
            
            <div className="grid grid-cols-2 gap-1">
              {statusSounds.map(({ status, label, color }) => (
                <Button
                  key={status}
                  onClick={() => onTestSound(status)}
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs p-1 flex items-center gap-1"
                >
                  <Play className="h-2 w-2" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};