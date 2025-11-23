/**
 * FASE 8: Permission Service
 * Role-Based Access Control (RBAC) system
 */

import { prisma } from './prisma';

// Permission types
type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'EXPORT' | 'IMPORT' | 'MANAGE';

interface PermissionCheck {
  userId: string;
  companyId: string;
  resource: string;
  action: PermissionAction;
}

interface RoleData {
  name: string;
  description?: string;
  companyId?: string;
  permissions: Array<{
    resource: string;
    action: PermissionAction;
    canCreate?: boolean;
    canRead?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  }>;
}

/**
 * Check if user has permission for a specific action
 */
export async function checkPermission(check: PermissionCheck): Promise<boolean> {
  const { userId, companyId, resource, action } = check;

  try {
    // Get user's company membership
    const companyUser = await (prisma as any).companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!companyUser || !companyUser.isActive) {
      return false;
    }

    // Owners have all permissions
    if (companyUser.isOwner) {
      return true;
    }

    // Check custom permissions override
    if (companyUser.permissions) {
      const customPerms = companyUser.permissions as any;
      if (customPerms[resource]?.[action.toLowerCase()]) {
        return true;
      }
    }

    // Check role permissions
    for (const rolePermission of companyUser.role.permissions) {
      if (rolePermission.permission.resource === resource) {
        switch (action) {
          case 'CREATE':
            if (rolePermission.canCreate) return true;
            break;
          case 'READ':
            if (rolePermission.canRead) return true;
            break;
          case 'UPDATE':
            if (rolePermission.canUpdate) return true;
            break;
          case 'DELETE':
            if (rolePermission.canDelete) return true;
            break;
          case 'APPROVE':
          case 'EXPORT':
          case 'IMPORT':
          case 'MANAGE':
            // These require explicit canCreate or canUpdate
            if (rolePermission.canCreate || rolePermission.canUpdate) return true;
            break;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Get all permissions for a user in a company
 */
export async function getUserPermissions(userId: string, companyId: string) {
  const companyUser = await (prisma as any).companyUser.findUnique({
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!companyUser) {
    return { permissions: [], isOwner: false };
  }

  const permissions = companyUser.role.permissions.map((rp: any) => ({
    resource: rp.permission.resource,
    action: rp.permission.action,
    canCreate: rp.canCreate,
    canRead: rp.canRead,
    canUpdate: rp.canUpdate,
    canDelete: rp.canDelete,
  }));

  return {
    permissions,
    customPermissions: companyUser.permissions,
    isOwner: companyUser.isOwner,
  };
}

/**
 * Create a new role with permissions
 */
export async function createRole(roleData: RoleData) {
  const { name, description, companyId, permissions } = roleData;

  // Create role
  const role = await (prisma as any).role.create({
    data: {
      name,
      description,
      companyId,
      isSystem: false,
    },
  });

  // Create permission entries if they don't exist
  for (const perm of permissions) {
    let permission = await (prisma as any).permission.findUnique({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
    });

    if (!permission) {
      permission = await (prisma as any).permission.create({
        data: {
          resource: perm.resource,
          action: perm.action,
          description: `${perm.action} permission for ${perm.resource}`,
        },
      });
    }

    // Create role-permission link
    await (prisma as any).rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: permission.id,
        canCreate: perm.canCreate || false,
        canRead: perm.canRead || false,
        canUpdate: perm.canUpdate || false,
        canDelete: perm.canDelete || false,
      },
    });
  }

  return role;
}

/**
 * Update role permissions
 */
export async function updateRolePermissions(
  roleId: string,
  permissions: Array<{
    resource: string;
    action: PermissionAction;
    canCreate?: boolean;
    canRead?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  }>
) {
  // Delete existing permissions
  await (prisma as any).rolePermission.deleteMany({
    where: { roleId },
  });

  // Add new permissions
  for (const perm of permissions) {
    let permission = await (prisma as any).permission.findUnique({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
    });

    if (!permission) {
      permission = await (prisma as any).permission.create({
        data: {
          resource: perm.resource,
          action: perm.action,
        },
      });
    }

    await (prisma as any).rolePermission.create({
      data: {
        roleId,
        permissionId: permission.id,
        canCreate: perm.canCreate || false,
        canRead: perm.canRead || false,
        canUpdate: perm.canUpdate || false,
        canDelete: perm.canDelete || false,
      },
    });
  }
}

/**
 * Seed default roles and permissions
 */
export async function seedDefaultRoles() {
  const roles = [
    {
      name: 'Admin',
      description: 'Full system access',
      isSystem: true,
      permissions: [
        { resource: 'invoices', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { resource: 'customers', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { resource: 'products', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { resource: 'expenses', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { resource: 'reports', actions: ['READ', 'EXPORT'] },
        { resource: 'users', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { resource: 'settings', actions: ['READ', 'UPDATE'] },
      ],
    },
    {
      name: 'Accountant',
      description: 'Financial management',
      isSystem: true,
      permissions: [
        { resource: 'invoices', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'expenses', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'] },
        { resource: 'reports', actions: ['READ', 'EXPORT'] },
        { resource: 'customers', actions: ['READ'] },
        { resource: 'products', actions: ['READ'] },
      ],
    },
    {
      name: 'Sales',
      description: 'Sales and customer management',
      isSystem: true,
      permissions: [
        { resource: 'invoices', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'customers', actions: ['CREATE', 'READ', 'UPDATE'] },
        { resource: 'products', actions: ['READ'] },
        { resource: 'reports', actions: ['READ'] },
      ],
    },
    {
      name: 'Viewer',
      description: 'Read-only access',
      isSystem: true,
      permissions: [
        { resource: 'invoices', actions: ['READ'] },
        { resource: 'customers', actions: ['READ'] },
        { resource: 'products', actions: ['READ'] },
        { resource: 'expenses', actions: ['READ'] },
        { resource: 'reports', actions: ['READ'] },
      ],
    },
  ];

  for (const roleData of roles) {
    const existingRole = await (prisma as any).role.findFirst({
      where: {
        name: roleData.name,
        isSystem: true,
      },
    });

    if (existingRole) continue;

    const role = await (prisma as any).role.create({
      data: {
        name: roleData.name,
        description: roleData.description,
        isSystem: roleData.isSystem,
      },
    });

    // Create permissions for each resource/action
    for (const permGroup of roleData.permissions) {
      for (const action of permGroup.actions) {
        let permission = await (prisma as any).permission.findUnique({
          where: {
            resource_action: {
              resource: permGroup.resource,
              action: action as PermissionAction,
            },
          },
        });

        if (!permission) {
          permission = await (prisma as any).permission.create({
            data: {
              resource: permGroup.resource,
              action: action as PermissionAction,
              description: `${action} ${permGroup.resource}`,
            },
          });
        }

        await (prisma as any).rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
            canCreate: action === 'CREATE',
            canRead: action === 'READ',
            canUpdate: action === 'UPDATE',
            canDelete: action === 'DELETE',
          },
        });
      }
    }
  }

  console.log('✓ Default roles and permissions seeded');
}

/**
 * Assign role to user in company
 */
export async function assignRole(userId: string, companyId: string, roleId: string) {
  const companyUser = await (prisma as any).companyUser.update({
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
    data: {
      roleId,
    },
  });

  return companyUser;
}

/**
 * Get all roles for a company (or global roles)
 */
export async function getRoles(companyId?: string) {
  const roles = await (prisma as any).role.findMany({
    where: {
      OR: [
        { companyId },
        { isSystem: true, companyId: null },
      ],
    },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { users: true },
      },
    },
  });

  return roles;
}

/**
 * Delete a role (only non-system roles)
 */
export async function deleteRole(roleId: string) {
  const role = await (prisma as any).role.findUnique({
    where: { id: roleId },
  });

  if (!role) {
    throw new Error('Role not found');
  }

  if (role.isSystem) {
    throw new Error('Cannot delete system roles');
  }

  await (prisma as any).role.delete({
    where: { id: roleId },
  });

  return { success: true };
}
