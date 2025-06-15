import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number; // in milliseconds, default 3000
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Clock,
};

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-orange-50 border-orange-200 text-orange-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-orange-600',
  info: 'text-blue-600',
};

export const MobileNotification: React.FC<MobileNotificationProps> = ({
  id,
  type,
  title,
  description,
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const Icon = icons[type];

  useEffect(() => {
    // Start animation
    setIsVisible(true);

    // Auto dismiss timer
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for exit animation
    }, duration);

    // Progress bar animation
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const decrement = 100 / (duration / 50);
        return Math.max(0, prev - decrement);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={cn(
        'fixed top-4 left-4 right-4 z-50 transition-all duration-300 transform',
        isVisible 
          ? 'translate-y-0 opacity-100 scale-100' 
          : '-translate-y-full opacity-0 scale-95'
      )}
    >
      <div
        className={cn(
          'relative rounded-lg border shadow-lg p-4 backdrop-blur-sm',
          styles[type]
        )}
      >
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-black/10 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-current transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-start space-x-3">
          <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', iconStyles[type])} />
          
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{title}</div>
            {description && (
              <div className="text-sm opacity-80 mt-1">{description}</div>
            )}
          </div>

          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};