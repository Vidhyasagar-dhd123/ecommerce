export interface AdminStats {
  users: {
    total: number;
    customers: number;
    employees: number;
    admins: number;
    active: number;
  };
  orders: {
    total: number;
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    revenue: number;
  };
  inventory: {
    products: number;
    variants: number;
    low_stock: number;
    out_of_stock: number;
  };
  operations: {
    pending_returns: number;
    active_shipments: number;
    active_coupons: number;
  };
}

export interface AdminUserItem {
  id: number;
  username: string;
  email: string;
  phone?: string;
  role: 'admin' | 'employee' | 'customer';
  is_active: boolean;
  status: boolean;
  date_joined: string;
  designation?: string;
}

export interface PromoteEmployeePayload {
  user_id: number;
  employee_code: string;
  designation: 'ShippingExecutive' | 'InventoryManager' | 'SupportAgent';
  hire_date: string;
  warehouse?: number;
}
