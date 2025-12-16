export type UserRole = 'admin' | 'manager' | 'cashier' | 'viewer';

export type Permission = 
  | 'products:read' | 'products:write' | 'products:delete'
  | 'inventory:read' | 'inventory:write' | 'inventory:delete'
  | 'sales:read' | 'sales:write' | 'sales:delete'
  | 'purchases:read' | 'purchases:write' | 'purchases:delete'
  | 'customers:read' | 'customers:write' | 'customers:delete'
  | 'suppliers:read' | 'suppliers:write' | 'suppliers:delete'
  | 'payments:read' | 'payments:write' | 'payments:delete'
  | 'expenses:read' | 'expenses:write' | 'expenses:delete'
  | 'cash_register:read' | 'cash_register:write'
  | 'reports:read'
  | 'settings:read' | 'settings:write'
  | 'users:read' | 'users:write' | 'users:delete';

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'products:read', 'products:write', 'products:delete',
    'inventory:read', 'inventory:write', 'inventory:delete',
    'sales:read', 'sales:write', 'sales:delete',
    'purchases:read', 'purchases:write', 'purchases:delete',
    'customers:read', 'customers:write', 'customers:delete',
    'suppliers:read', 'suppliers:write', 'suppliers:delete',
    'payments:read', 'payments:write', 'payments:delete',
    'expenses:read', 'expenses:write', 'expenses:delete',
    'cash_register:read', 'cash_register:write',
    'reports:read',
    'settings:read', 'settings:write',
    'users:read', 'users:write', 'users:delete'
  ],
  manager: [
    'products:read', 'products:write',
    'inventory:read', 'inventory:write',
    'sales:read', 'sales:write',
    'purchases:read', 'purchases:write',
    'customers:read', 'customers:write',
    'suppliers:read', 'suppliers:write',
    'payments:read', 'payments:write',
    'expenses:read', 'expenses:write',
    'cash_register:read', 'cash_register:write',
    'reports:read',
    'settings:read'
  ],
  cashier: [
    'products:read',
    'inventory:read',
    'sales:read', 'sales:write',
    'customers:read', 'customers:write',
    'payments:read', 'payments:write',
    'cash_register:read', 'cash_register:write',
    'reports:read'
  ],
  viewer: [
    'products:read',
    'inventory:read',
    'sales:read',
    'purchases:read',
    'customers:read',
    'suppliers:read',
    'payments:read',
    'expenses:read',
    'cash_register:read',
    'reports:read'
  ]
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}
