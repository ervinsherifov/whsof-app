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
  Users 
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
    label: 'Task Management',
    path: '/tasks',
    roles: ['OFFICE_ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF'],
    icon: <ClipboardList className="h-4 w-4" />,
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
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isMobile }) => {
  const { user, checkIn, checkOut } = useAuth();
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
      
      {/* Show debug info if no items are available */}
      {filteredItems.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground border rounded-lg bg-yellow-50">
          ⚠️ No menu items for role: <strong>{user?.role || 'No role'}</strong>
          <br />
          <span className="text-xs">Available roles: WAREHOUSE_STAFF, OFFICE_ADMIN, SUPER_ADMIN</span>
        </div>
      )}
      
      {filteredItems.map((item) => (
        <Button
          key={item.path}
          variant={location.pathname === item.path ? 'default' : 'ghost'}
          className={cn(
            'w-full justify-start text-left gap-3 h-10 relative z-10 cursor-pointer',
            location.pathname === item.path && 'bg-primary text-primary-foreground'
          )}
          onClick={() => handleNavigate(item.path)}
          style={{ pointerEvents: 'auto' }}
        >
          {item.icon}
          <span>{item.label}</span>
        </Button>
      ))}
    </nav>
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
    <aside className="w-64 bg-card border-r flex-shrink-0 relative z-50">
      <div className="h-full flex flex-col">
        <SidebarContent />
        <div className="p-4 mt-auto border-t">
          <div className="text-center text-sm text-muted-foreground">
            DHL SOF-WH • {user?.name}
          </div>
        </div>
      </div>
    </aside>
  );
};