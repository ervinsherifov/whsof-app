// Core domain types for the warehouse management system

export type UserRole = 'WAREHOUSE_STAFF' | 'OFFICE_ADMIN' | 'SUPER_ADMIN';

export type TruckStatus = 'SCHEDULED' | 'ARRIVED' | 'IN_PROGRESS' | 'DONE';

export type TruckPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Profile {
  user_id: string;
  id: string;
  email?: string;
  display_name?: string;
  updated_at: string;
  created_at: string;
}

export interface Truck {
  id: string;
  license_plate: string;
  arrival_date: string;
  arrival_time: string;
  cargo_description: string;
  pallet_count: number;
  status: TruckStatus;
  priority: TruckPriority;
  ramp_number?: number;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  handled_by_user_id?: string;
  handled_by_name?: string;
  created_by_user_id: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  truck_id?: string;
  due_date?: string;
  created_by_user_id: string;
  completed_by_user_id?: string;
  completed_at?: string;
  completion_comment?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time?: string;
  regular_hours?: number;
  overtime_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface ProcessingTime {
  hours: number;
  minutes: number;
  totalHours: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Form types
export interface TruckFormData {
  license_plate: string;
  arrival_date: string;
  arrival_time: string;
  cargo_description: string;
  pallet_count: number;
  priority: TruckPriority;
  assigned_staff_id?: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  priority: TaskPriority;
  assigned_to_user_id?: string;
  truck_id?: string;
  due_date?: string;
}

// Component prop types
export interface TruckListProps {
  trucks: Truck[];
  loading: boolean;
  onAssignRamp: (truck: Truck) => void;
  onUpdateStatus: (truckId: string, status: TruckStatus) => void;
  onDeleteTruck: (truckId: string, licensePlate: string) => void;
}

export interface TruckCardProps {
  truck: Truck;
  onAssignRamp: (truck: Truck) => void;
  onUpdateStatus: (truckId: string, status: TruckStatus) => void;
  onDeleteTruck: (truckId: string, licensePlate: string) => void;
}

export interface TruckTableRowProps {
  truck: Truck;
  onAssignRamp: (truck: Truck) => void;
  onUpdateStatus: (truckId: string, status: TruckStatus) => void;
  onDeleteTruck: (truckId: string, licensePlate: string) => void;
}

// Constants
export const TRUCK_STATUSES: Record<TruckStatus, string> = {
  SCHEDULED: 'Scheduled',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done'
};

export const TASK_STATUSES: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed'
};

export const TRUCK_PRIORITIES: Record<TruckPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent'
};

export const TASK_PRIORITIES: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent'
};

export const USER_ROLES: Record<UserRole, string> = {
  WAREHOUSE_STAFF: 'Warehouse Staff',
  OFFICE_ADMIN: 'Office Admin',
  SUPER_ADMIN: 'Super Admin'
};