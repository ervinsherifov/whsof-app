import React, { createContext, useContext, useState, useCallback } from 'react';
import { MobileNotification } from '@/components/ui/mobile-notification';

interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
}

interface MobileNotificationContextType {
  showNotification: (notification: Omit<NotificationData, 'id'>) => void;
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showWarning: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
}

const MobileNotificationContext = createContext<MobileNotificationContextType | undefined>(undefined);

export const useMobileNotification = () => {
  const context = useContext(MobileNotificationContext);
  if (!context) {
    throw new Error('useMobileNotification must be used within a MobileNotificationProvider');
  }
  return context;
};

export const MobileNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newNotification: NotificationData = {
      ...notification,
      id,
      duration: notification.duration || 3000,
    };

    setNotifications((prev) => [newNotification, ...prev.slice(0, 2)]); // Max 3 notifications
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, description?: string) => {
    addNotification({ type: 'success', title, description });
  }, [addNotification]);

  const showError = useCallback((title: string, description?: string) => {
    addNotification({ type: 'error', title, description, duration: 5000 }); // Longer for errors
  }, [addNotification]);

  const showWarning = useCallback((title: string, description?: string) => {
    addNotification({ type: 'warning', title, description, duration: 4000 });
  }, [addNotification]);

  const showInfo = useCallback((title: string, description?: string) => {
    addNotification({ type: 'info', title, description });
  }, [addNotification]);

  const value: MobileNotificationContextType = {
    showNotification: addNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <MobileNotificationContext.Provider value={value}>
      {children}
      
      {/* Render notifications */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {notifications.map((notification, index) => (
          <div 
            key={notification.id}
            style={{ 
              transform: `translateY(${index * 80}px)`,
              transition: 'transform 0.3s ease-out'
            }}
          >
            <MobileNotification
              {...notification}
              onClose={removeNotification}
            />
          </div>
        ))}
      </div>
    </MobileNotificationContext.Provider>
  );
};