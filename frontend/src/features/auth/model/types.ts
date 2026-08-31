export type UserRole = 'customer' | 'employee' | 'admin';
export type EmployeeDesignation = 'ShippingExecutive' | 'InventoryManager' | 'SupportAgent';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface JwtPayload {
  exp?: number;
  user_id?: number;
  username?: string;
  email?: string;
  role?: string;
  designation?: string;
}

export interface AuthUser {
  userId: number | null;
  username?: string;
  email?: string;
  role?: UserRole | string;
  designation?: EmployeeDesignation | string;
  warehouseId?: number | null;
  warehouseName?: string | null;
}

