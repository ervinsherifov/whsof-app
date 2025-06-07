import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';

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
    roles: ['OFFICE_ADMIN', 'SUPER_ADMIN'],
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

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredItems = sidebarItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-card border-r min-h-screen">
      <nav className="p-4 space-y-2">
        {filteredItems.map((item) => (
          <Button
            key={item.path}
            variant={location.pathname === item.path ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start',
              location.pathname === item.path && 'bg-primary text-primary-foreground'
            )}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}
      </nav>
    </aside>
  );
};