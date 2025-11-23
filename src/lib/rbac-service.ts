/**
 * FASE 10: Role-Based Access Control (RBAC) Service
 * 
 * Granular permission system with role management
 */

import { prisma } from './prisma';

// ==================== PERMISSION DEFINITIONS ====================

export const PERMISSIONS = {
  // Invoice permissions
  'invoices:create': 'Create new invoices',
  'invoices:read': 'View invoices',
  'invoices:read:all': 'View all company invoices',
  'invoices:update': 'Edit invoices',
  'invoices:delete': 'Delete invoices',
  'invoices:send': 'Send invoices to customers',
  'invoices:void': 'Void invoices',
  
  // Expense permissions
  'expenses:create': 'Create expenses',
  'expenses:read': 'View expenses',
  'expenses:read:all': 'View all company expenses',
  'expenses:update': 'Edit expenses',
  'expenses:delete': 'Delete expenses',
  'expenses:approve': 'Approve expenses',
  
  // Customer permissions
  'customers:create': 'Create customers',
  'customers:read': 'View customers',
  'customers:update': 'Edit customers',
  'customers:delete': 'Delete customers',
  
  // Product permissions
  'products:create': 'Create products',
  'products:read': 'View products',
  'products:update': 'Edit products',
  'products:delete': 'Delete products',
  
  // Report permissions
  'reports:view': 'View reports',
  'reports:export': 'Export reports',
  
  // Settings permissions
  'settings:view': 'View settings',
  'settings:update': 'Update settings',
  
  // User management
  'users:invite': 'Invite users',
  'users:remove': 'Remove users',
  'users:manage_roles': 'Manage user roles',
  
  // Advanced
  'audit:view': 'View audit logs',
  'integrations:manage': 'Manage integrations',
  'api:manage': 'Manage API keys',
  'billing:manage': 'Manage billing',
  'company:delete': 'Delete company',
};

// ==================== ROLE MANAGEMENT ====================

/**
 * Create custom role
 */
export async function createRole(companyId: string, name: string, description: string, permissions: string[]) {
  // Validate permissions
  const invalidPermissions = permissions.filter(p => !PERMISSIONS[p as keyof typeof PERMISSIONS]);
  if (invalidPermissions.length > 0) {
    throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
  }
  
  const role = await (prisma as any).companyRole.create({
    data: {
      companyId,
      name,
      description,
      permissions: JSON.stringify(permissions),
      isSystem: false,
    },
  });
  
  return role;
}

/**
 * Update role
 */
export async function updateRole(roleId: string, updates: { name?: string; description?: string; permissions?: string[] }) {
  const role = await (prisma as any).companyRole.findUnique({
    where: { id: roleId },
  });
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  if (role.isSystem) {
    throw new Error('Cannot update system roles');
  }
  
  if (updates.permissions) {
    const invalidPermissions = updates.permissions.filter(p => !PERMISSIONS[p as keyof typeof PERMISSIONS]);
    if (invalidPermissions.length > 0) {
      throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }
  }
  
  await (prisma as any).companyRole.update({
    where: { id: roleId },
    data: {
      ...(updates.name && { name: updates.name }),
      ...(updates.description && { description: updates.description }),
      ...(updates.permissions && { permissions: JSON.stringify(updates.permissions) }),
      updatedAt: new Date(),
    },
  });
  
  return { success: true };
}

/**
 * Delete role
 */
export async function deleteRole(roleId: string) {
  const role = await (prisma as any).companyRole.findUnique({
    where: { id: roleId },
    include: {
      members: true,
    },
  });
  
  if (!role) {
    throw new Error('Role not found');
  }
  
  if (role.isSystem) {
    throw new Error('Cannot delete system roles');
  }
  
  if (role.members.length > 0) {
    throw new Error('Cannot delete role with active members');
  }
  
  await (prisma as any).companyRole.delete({
    where: { id: roleId },
  });
  
  return { success: true };
}

/**
 * Get company roles
 */
export async function getCompanyRoles(companyId: string) {
  const roles = await (prisma as any).companyRole.findMany({
    where: { companyId },
    include: {
      _count: {
        select: { members: true },
      },
    },
    orderBy: [
      { isSystem: 'desc' },
      { name: 'asc' },
    ],
  });
  
  return roles.map((r: any) => ({
    ...r,
    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions,
    memberCount: r._count.members,
  }));
}

// ==================== PERMISSION CHECKING ====================

/**
 * Get user permissions for a company
 */
export async function getUserPermissions(userId: string, companyId: string): Promise<string[]> {
  const membership = await (prisma as any).companyUser.findFirst({
    where: {
      userId,
      companyId,
      isActive: true,
    },
    include: {
      role: true,
    },
  });
  
  if (!membership) {
    return [];
  }
  
  // Parse role permissions
  const rolePermissions = typeof membership.role.permissions === 'string'
    ? JSON.parse(membership.role.permissions)
    : membership.role.permissions;
  
  // Parse custom permissions override
  const customPermissions = membership.permissions
    ? (typeof membership.permissions === 'string' ? JSON.parse(membership.permissions) : membership.permissions)
    : [];
  
  // Merge permissions (custom overrides role)
  const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];
  
  // Expand wildcards
  const expandedPermissions: string[] = [];
  allPermissions.forEach(perm => {
    if (perm === '*') {
      expandedPermissions.push(...Object.keys(PERMISSIONS));
    } else if (perm.endsWith(':*')) {
      const prefix = perm.slice(0, -1);
      Object.keys(PERMISSIONS).forEach(p => {
        if (p.startsWith(prefix)) {
          expandedPermissions.push(p);
        }
      });
    } else {
      expandedPermissions.push(perm);
    }
  });
  
  return [...new Set(expandedPermissions)];
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(userId: string, companyId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId, companyId);
  
  // Check exact match
  if (permissions.includes(permission)) {
    return true;
  }
  
  // Check wildcard matches
  const parts = permission.split(':');
  for (let i = parts.length; i > 0; i--) {
    const wildcard = parts.slice(0, i).join(':') + ':*';
    if (permissions.includes(wildcard)) {
      return true;
    }
  }
  
  // Check global wildcard
  return permissions.includes('*');
}

/**
 * Check multiple permissions (AND logic)
 */
export async function hasAllPermissions(userId: string, companyId: string, permissions: string[]): Promise<boolean> {
  const results = await Promise.all(
    permissions.map(perm => hasPermission(userId, companyId, perm))
  );
  return results.every(r => r);
}

/**
 * Check multiple permissions (OR logic)
 */
export async function hasAnyPermission(userId: string, companyId: string, permissions: string[]): Promise<boolean> {
  const results = await Promise.all(
    permissions.map(perm => hasPermission(userId, companyId, perm))
  );
  return results.some(r => r);
}

/**
 * Get user's resource-specific permissions
 */
export async function getResourcePermissions(userId: string, companyId: string, resource: string) {
  const allPermissions = await getUserPermissions(userId, companyId);
  
  const resourcePermissions = allPermissions
    .filter(p => p.startsWith(`${resource}:`))
    .map(p => p.split(':')[1]);
  
  return {
    canCreate: resourcePermissions.includes('create'),
    canRead: resourcePermissions.includes('read') || resourcePermissions.includes('read:all'),
    canReadAll: resourcePermissions.includes('read:all'),
    canUpdate: resourcePermissions.includes('update'),
    canDelete: resourcePermissions.includes('delete'),
  };
}

/**
 * Require permission middleware helper
 */
export function requirePermission(permission: string) {
  return async (userId: string, companyId: string) => {
    const allowed = await hasPermission(userId, companyId, permission);
    if (!allowed) {
      throw new Error(`Permission denied: ${permission}`);
    }
    return true;
  };
}

/**
 * Batch permission check
 */
export async function checkPermissions(userId: string, companyId: string, permissions: Record<string, string>) {
  const results: Record<string, boolean> = {};
  
  for (const [key, permission] of Object.entries(permissions)) {
    results[key] = await hasPermission(userId, companyId, permission);
  }
  
  return results;
}
