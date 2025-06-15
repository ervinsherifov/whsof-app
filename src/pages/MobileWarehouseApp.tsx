import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Clock, 
  Truck, 
  ClipboardList, 
  Menu,
  User,
  LogOut
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Dashboard } from '@/pages/Dashboard';
import { MobileTimeTracking } from '@/components/time/MobileTimeTracking';

import { MobileTaskDashboard } from '@/pages/MobileTaskDashboard';
import { MobileTruckInterface } from '@/components/truck/MobileTruckInterface';
import { useTruckData } from '@/hooks/useTruckData';

export const MobileWarehouseApp: React.FC = () => {
  const { user, logout, checkIn, checkOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const { trucks, loading, refreshData } = useTruckData();

  // Redirect non-warehouse staff
  if (user?.role !== 'WAREHOUSE_STAFF') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Warehouse Staff Only</h2>
            <p className="text-muted-foreground mb-4">
              This mobile app is designed for warehouse staff only.
            </p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCheckIn = async () => {
    try {
      await checkIn();
      toast({
        title: "Checked In ✅",
        description: `Time: ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      });
    } catch (error) {
      toast({
        title: "Check-in Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut();
      toast({
        title: "Checked Out ✅",
        description: `Time: ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      });
    } catch (error) {
      toast({
        title: "Check-out Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "See you next time!",
      });
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'time':
        return <MobileTimeTracking />;
      case 'trucks':
        return (
          <div className="p-4">
            <MobileTruckInterface 
              trucks={trucks}
              loading={loading}
              onRefresh={refreshData}
            />
          </div>
        );
      case 'tasks':
        return <MobileTaskDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">DHL SOF-WH</h1>
              <p className="text-xs text-muted-foreground">Warehouse Mobile</p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowProfile(!showProfile)}
          >
            <User className="h-4 w-4" />
          </Button>
        </div>

        {/* Profile Panel */}
        {showProfile && (
          <div className="border-t bg-card p-4 space-y-3">
            <div className="text-sm">
              <p className="font-medium">{user?.email}</p>
              <Badge variant="outline" className="text-xs mt-1">
                {user?.role?.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleCheckIn} variant="outline" size="sm" className="flex-1">
                <Clock className="h-3 w-3 mr-1" />
                Check In
              </Button>
              <Button onClick={handleCheckOut} variant="outline" size="sm" className="flex-1">
                <Clock className="h-3 w-3 mr-1" />
                Check Out
              </Button>
            </div>
            
            <Button onClick={handleLogout} variant="destructive" size="sm" className="w-full">
              <LogOut className="h-3 w-3 mr-1" />
              Logout
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t">
        <div className="grid grid-cols-4 gap-1 p-2">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('dashboard')}
            className="flex-col h-16 text-xs"
          >
            <Home className="h-4 w-4 mb-1" />
            Dashboard
          </Button>
          
          <Button
            variant={activeTab === 'time' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('time')}
            className="flex-col h-16 text-xs"
          >
            <Clock className="h-4 w-4 mb-1" />
            Time
          </Button>
          
          <Button
            variant={activeTab === 'trucks' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('trucks')}
            className="flex-col h-16 text-xs"
          >
            <Truck className="h-4 w-4 mb-1" />
            Trucks
          </Button>
          
          <Button
            variant={activeTab === 'tasks' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('tasks')}
            className="flex-col h-16 text-xs"
          >
            <ClipboardList className="h-4 w-4 mb-1" />
            Tasks
          </Button>
        </div>
      </div>
    </div>
  );
};