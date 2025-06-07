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
import { X } from 'lucide-react';
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
  },
  {
    label: 'Time Tracking',
    path: '/time-tracking',
    roles: ['WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN'],
  },
  {
    label: 'Truck Scheduling',
    path: '/trucks',
    roles: ['WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN'],
  },
  {
    label: 'Task Management',
    path: '/tasks',
    roles: ['OFFICE_ADMIN', 'SUPER_ADMIN'],
  },
  {
    label: 'Reports',
    path: '/reports',
    roles: ['OFFICE_ADMIN', 'SUPER_ADMIN'],
  },
  {
    label: 'TV Dashboard',
    path: '/tv-dashboard',
    roles: ['WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN'],
  },
  {
    label: 'User Management',
    path: '/users',
    roles: ['SUPER_ADMIN'],
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
        description: `Check-in time: ${new Date().toLocaleTimeString('en-US', { hour12: false })}`,
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
        description: `Check-out time: ${new Date().toLocaleTimeString('en-US', { hour12: false })}`,
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
    <nav className="p-4 space-y-2">
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
      
      {filteredItems.map((item) => (
        <Button
          key={item.path}
          variant={location.pathname === item.path ? 'default' : 'ghost'}
          className={cn(
            'w-full justify-start',
            location.pathname === item.path && 'bg-primary text-primary-foreground'
          )}
          onClick={() => handleNavigate(item.path)}
        >
          {item.icon}
          {item.label}
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

  return (
    <aside className="w-64 bg-card border-r min-h-screen">
      <SidebarContent />
    </aside>
  );
};