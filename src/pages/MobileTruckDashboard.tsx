import React from 'react';
import { MobileTruckInterface } from '@/components/truck/MobileTruckInterface';
import { useTruckData } from '@/hooks/useTruckData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Smartphone, RefreshCw } from 'lucide-react';

export const MobileTruckDashboard: React.FC = () => {
  const { trucks, loading, refreshData } = useTruckData();
  const { user } = useAuth();

  // Show access warning for non-warehouse staff
  if (user?.role !== 'WAREHOUSE_STAFF') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>Warehouse Staff Only</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              This mobile interface is designed specifically for warehouse staff. 
              Please use the main truck scheduling page instead.
            </p>
            <Button onClick={() => window.history.back()} variant="outline" className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Truck Operations</h1>
              <p className="text-xs text-muted-foreground">Mobile Dashboard</p>
            </div>
          </div>
          
          <Button 
            onClick={refreshData} 
            variant="ghost" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <MobileTruckInterface 
          trucks={trucks}
          loading={loading}
          onRefresh={refreshData}
        />
      </div>

      {/* User Info Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-muted-foreground">Logged in as:</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString('en-GB', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </div>
  );
};