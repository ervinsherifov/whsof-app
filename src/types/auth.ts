export interface User {
  id: string;
  email: string;
  name: string;
  role: 'WAREHOUSE_STAFF' | 'OFFICE_ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TimeLog {
  id: string;
  userId: string;
  checkIn: string;
  checkOut?: string;
  regularHours: number;
  overtimeHours: number;
  date: string;
  notes?: string;
}

export interface Truck {
  id: string;
  licensePlate: string;
  arrivalTime: string;
  rampNumber: number;
  palletCount: number;
  cargoDescription: string;
  assignedStaffId?: string;
  status: 'SCHEDULED' | 'ARRIVED' | 'DONE';
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedUserId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}