import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, logout, checkIn, checkOut } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'OFFICE_ADMIN':
        return 'default';
      case 'WAREHOUSE_STAFF':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'OFFICE_ADMIN':
        return 'Office Admin';
      case 'WAREHOUSE_STAFF':
        return 'Warehouse Staff';
      default:
        return role;
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await checkIn();
      toast({
        title: "Checked In Successfully",
        description: `Welcome! Check-in time: ${getCurrentTime()}`,
      });
    } catch (error) {
      toast({
        title: "Check-in Failed",
        description: "There was an error checking you in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    try {
      await checkOut();
      toast({
        title: "Checked Out Successfully",
        description: `Have a great day! Check-out time: ${getCurrentTime()}`,
      });
    } catch (error) {
      toast({
        title: "Check-out Failed",
        description: "There was an error checking you out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="p-2"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-primary">DHL SOF-WH</h1>
          {!isMobile && (
            <div className="text-sm text-muted-foreground">
              {getCurrentTime()}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {user?.role === 'WAREHOUSE_STAFF' && !isMobile && (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {isCheckingIn ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  "Check In"
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCheckOut}
                disabled={isCheckingOut}
                className="transition-all duration-200 hover:scale-105 active:scale-95"
              >
                {isCheckingOut ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  "Check Out"
                )}
              </Button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <Badge 
                    variant={getRoleBadgeVariant(user?.role || '')}
                    className="w-fit mt-1"
                  >
                    {getRoleLabel(user?.role || '')}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};