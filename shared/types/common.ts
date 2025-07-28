// shared/types/common.ts

/**
 * Common types and interfaces used across the application
 */

// Base API response structure
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
  status?: number;
  timestamp?: string;
}

// Paginated response structure
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Common query parameters for list endpoints
export interface ListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Status types commonly used across entities
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived';

// User roles
export type UserRole = 'admin' | 'personal' | 'aluno';

// Date/time types
export type DateString = string; // ISO date string
export type Timestamp = number; // Unix timestamp

// Common entity base fields
export interface BaseEntity {
  _id: string;
  createdAt: DateString;
  updatedAt: DateString;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  lastUpdated?: DateString;
}

// Common form states
export interface FormState<T = Record<string, any>> {
  data: T;
  errors: Record<keyof T, string>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

// File upload types
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: DateString;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Search and filter types
export interface SearchFilters {
  text?: string;
  dateRange?: {
    start: DateString;
    end: DateString;
  };
  status?: EntityStatus[];
  categories?: string[];
  tags?: string[];
}

// Chart/stats data types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface StatsCard {
  title: string;
  value: string | number;
  change?: {
    value: number;
    percentage: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: string;
  color?: string;
}

// Component props helpers
export interface ComponentWithChildren {
  children: React.ReactNode;
}

export interface ComponentWithClassName {
  className?: string;
}

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Environment configuration
export interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    enablePWA: boolean;
    enableAnalytics: boolean;
    enableDebugMode: boolean;
  };
  limits: {
    maxFileSize: number;
    maxStudentsPerPersonal: number;
    maxWorkoutsPerStudent: number;
  };
}