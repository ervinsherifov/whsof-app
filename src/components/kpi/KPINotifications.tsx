import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface KPIAlert {
  id: string;
  metric_name: string;
  threshold_value: number;
  alert_type: 'BELOW' | 'ABOVE';
  last_triggered_at: string | null;
  is_active: boolean;
}

interface NotificationItem {
  id: string;
  type: 'alert' | 'achievement' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export function KPINotifications() {
  const [alerts, setAlerts] = useState<KPIAlert[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAlerts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('kpi_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching alerts:', error);
      return;
    }

    setAlerts((data || []) as KPIAlert[]);
  };

  const checkAlertConditions = async () => {
    if (!user || alerts.length === 0) return;

    // Get current user KPI metrics
    const { data: userKPIs, error } = await supabase
      .from('user_kpi_with_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('metric_date', { ascending: false })
      .limit(1);

    if (error || !userKPIs || userKPIs.length === 0) return;

    const currentKPI = userKPIs[0];
    const now = new Date();

    // Check each alert condition
    alerts.forEach(alert => {
      const currentValue = currentKPI[alert.metric_name];
      if (currentValue === undefined || currentValue === null) return;

      const shouldTrigger = 
        (alert.alert_type === 'BELOW' && currentValue < alert.threshold_value) ||
        (alert.alert_type === 'ABOVE' && currentValue > alert.threshold_value);

      if (shouldTrigger) {
        // Check if alert was triggered recently (within last hour)
        const lastTriggered = alert.last_triggered_at ? new Date(alert.last_triggered_at) : null;
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        if (!lastTriggered || lastTriggered < oneHourAgo) {
          triggerAlert(alert, currentValue);
        }
      }
    });
  };

  const triggerAlert = async (alert: KPIAlert, currentValue: number) => {
    // Update last triggered time
    await supabase
      .from('kpi_alerts')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', alert.id);

    // Add notification
    const notification: NotificationItem = {
      id: `alert-${alert.id}-${Date.now()}`,
      type: 'alert',
      title: 'Performance Alert',
      message: `${alert.metric_name.replace('_', ' ')} is ${alert.alert_type.toLowerCase()} threshold (${currentValue} vs ${alert.threshold_value})`,
      timestamp: new Date(),
      isRead: false
    };

    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast
    toast({
      title: 'Performance Alert',
      description: notification.message,
      variant: 'destructive',
      duration: 5000,
    });
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'achievement': return <CheckCircle className="h-4 w-4 text-primary" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user]);

  useEffect(() => {
    if (alerts.length > 0) {
      const interval = setInterval(checkAlertConditions, 5 * 60 * 1000); // Check every 5 minutes
      return () => clearInterval(interval);
    }
  }, [alerts, user]);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-hidden border shadow-lg z-50 bg-background">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-border hover:bg-accent/50 cursor-pointer ${
                      !notification.isRead ? 'bg-accent/20' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-foreground">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(notification.timestamp, 'MMM dd, HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}