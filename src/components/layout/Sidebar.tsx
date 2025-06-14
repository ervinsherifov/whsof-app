import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { 
  X, 
  Home, 
  Clock, 
  Truck, 
  ClipboardList, 
  BarChart3, 
  Tv, 
  Users,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SidebarItem {
  label: string;
  path: string;
  roles: string[];
  icon?: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN'],
    icon: <Home className="h-4 w-4" />,
  },
  {
    label: 'Time Tracking',
    path: '/time-tracking',
    roles: ['WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN'],
    icon: <Clock className="h-4 w-4" />,
  },
  {
    label: 'Truck Scheduling',
    path: '/trucks',
    roles: ['WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN'],
    icon: <Truck className="h-4 w-4" />,
  },
  {
    label: 'Mobile Trucks',
    path: '/mobile-trucks',
    roles: ['WAREHOUSE_STAFF'],
    icon: <Smartphone className="h-4 w-4" />,
  },
  {
    label: 'Task Management',
    path: '/tasks',
    roles: ['OFFICE_ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF'],
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    label: 'KPI Dashboard',
    path: '/kpi-dashboard',
    roles: ['OFFICE_ADMIN', 'SUPER_ADMIN'],
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    label: 'Reports',
    path: '/reports',
    roles: ['OFFICE_ADMIN', 'SUPER_ADMIN'],
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    label: 'TV Dashboard',
    path: '/tv-dashboard',
    roles: ['WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN'],
    icon: <Tv className="h-4 w-4" />,
  },
  {
    label: 'User Management',
    path: '/users',
    roles: ['SUPER_ADMIN'],
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: 'Overtime Approval',
    path: '/overtime-approval',
    roles: ['SUPER_ADMIN'],
    icon: <Clock className="h-4 w-4" />,
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isMobile }) => {
  const { user, checkIn, checkOut, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredItems = sidebarItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  const handleNavigate = (path: string) => {
    console.log('🔄 Sidebar Navigation:', path, 'User Role:', user?.role);
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const handleCheckIn = async () => {
    try {
      await checkIn();
      toast({
        title: "Checked In Successfully",
        description: `Check-in time: ${new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })}`,
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
        title: "Checked Out Successfully",
        description: `Check-out time: ${new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })}`,
      });
    } catch (error) {
      toast({
        title: "Check-out Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      <nav className="p-4 space-y-2 flex-1">
        {user?.role === 'WAREHOUSE_STAFF' && isMobile && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium mb-3">Time Clock</h3>
            <div className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCheckIn}
                className="w-full"
              >
                Check In
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCheckOut}
                className="w-full"
              >
                Check Out
              </Button>
            </div>
          </div>
        )}
        
        {/* Show debug info if no items are available and not loading */}
        {filteredItems.length === 0 && !isLoading && user && (
          <div className="p-4 text-sm text-muted-foreground border rounded-lg bg-yellow-50">
            ⚠️ No menu items for role: <strong>{user?.role || 'No role'}</strong>
            <br />
            <span className="text-xs">Available roles: WAREHOUSE_STAFF, OFFICE_ADMIN, SUPER_ADMIN</span>
          </div>
        )}
        
        {filteredItems.map((item) => (
          <button
            key={item.path}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors hover:bg-accent hover:text-accent-foreground',
              location.pathname === item.path 
                ? 'bg-primary text-primary-foreground' 
                : 'text-foreground'
            )}
            onClick={() => handleNavigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      
      {!isMobile && (
        <div className="p-4 mt-auto border-t">
          <div className="text-center text-sm text-muted-foreground">
            DHL SOF-WH • {user?.name}
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent>
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>Menu</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <SidebarContent />
          <DrawerFooter>
            <div className="text-center text-sm text-muted-foreground">
              DHL SOF-WH • {user?.name}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop sidebar should always be visible, not dependent on isOpen
  return (
    <aside className="w-64 bg-card border-r flex-shrink-0">
      <SidebarContent />
    </aside>
  );
};