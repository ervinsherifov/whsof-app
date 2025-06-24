import { User } from '@/contexts/AuthContext';

export function isSuperAdmin(user?: User | null): boolean {
  return user?.role === 'SUPER_ADMIN';
}

export function isOfficeAdmin(user?: User | null): boolean {
  return user?.role === 'OFFICE_ADMIN';
}

export function isWarehouseStaff(user?: User | null): boolean {
  return user?.role === 'WAREHOUSE_STAFF';
}

export function isAdmin(user?: User | null): boolean {
  return user?.role === 'SUPER_ADMIN' || user?.role === 'OFFICE_ADMIN';
} 