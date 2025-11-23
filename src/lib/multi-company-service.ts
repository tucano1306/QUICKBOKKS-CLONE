/**
 * FASE 10: Multi-Company Management Service
 * 
 * Handles company creation, user invitations, role management,
 * and company switching for multi-tenant architecture.
 */

import { prisma } from './prisma';
import { randomBytes } from 'crypto';

// ==================== TYPES ====================

interface CreateCompanyData {
  name: string;
  legalName: string;
  taxId: string;
  industry?: string;
  country?: string;
  currency?: string;
  ownerId: string;
}

interface InviteUserData {
  companyId: string;
  email: string;
  roleId: string;
  invitedBy: string;
}

// ==================== COMPANY MANAGEMENT ====================

/**
 * Create a new company with owner
 */
export async function createCompany(data: CreateCompanyData) {
  const { ownerId, ...companyData } = data;
  
  // Create company
  const company = await (prisma as any).company.create({
    data: {
      ...companyData,
      subscription: 'FREE',
      isActive: true,
    },
  });
  
  // Create default roles
  const ownerRole = await (prisma as any).companyRole.create({
    data: {
      companyId: company.id,
      name: 'Owner',
      description: 'Full access to all features',
      permissions: JSON.stringify(['*']), // All permissions
      isSystem: true,
    },
  });
  
  await (prisma as any).companyRole.createMany({
    data: [
      {
        companyId: company.id,
        name: 'Admin',
        description: 'Administrative access',
        permissions: JSON.stringify(['invoices:*', 'expenses:*', 'customers:*', 'reports:*', 'users:invite']),
        isSystem: true,
      },
      {
        companyId: company.id,
        name: 'Accountant',
        description: 'Financial data access',
        permissions: JSON.stringify(['invoices:*', 'expenses:*', 'customers:read', 'reports:*']),
        isSystem: true,
      },
      {
        companyId: company.id,
        name: 'User',
        description: 'Basic user access',
        permissions: JSON.stringify(['invoices:read', 'expenses:read', 'reports:view']),
        isSystem: true,
      },
    ],
  });
  
  // Add owner as company member
  await (prisma as any).companyUser.create({
    data: {
      companyId: company.id,
      userId: ownerId,
      roleId: ownerRole.id,
      isOwner: true,
      isActive: true,
    },
  });
  
  return company;
}

/**
 * Get user's companies
 */
export async function getUserCompanies(userId: string) {
  const memberships = await (prisma as any).companyUser.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      company: true,
      role: true,
    },
    orderBy: {
      joinedAt: 'desc',
    },
  });
  
  return memberships.map((m: any) => ({
    ...m.company,
    role: m.role.name,
    isOwner: m.isOwner,
    joinedAt: m.joinedAt,
  }));
}

/**
 * Switch active company
 */
export async function switchCompany(userId: string, companyId: string) {
  // Verify user has access
  const membership = await (prisma as any).companyUser.findFirst({
    where: {
      userId,
      companyId,
      isActive: true,
    },
  });
  
  if (!membership) {
    throw new Error('User does not have access to this company');
  }
  
  // Update last access
  await (prisma as any).companyUser.update({
    where: {
      id: membership.id,
    },
    data: {
      lastAccessAt: new Date(),
    },
  });
  
  return { success: true, companyId };
}

// ==================== INVITATIONS ====================

/**
 * Invite user to company
 */
export async function inviteUser(data: InviteUserData) {
  const { companyId, email, roleId, invitedBy } = data;
  
  // Check if user already exists
  const existingMember = await (prisma as any).companyUser.findFirst({
    where: {
      companyId,
      user: {
        email,
      },
    },
  });
  
  if (existingMember) {
    throw new Error('User is already a member of this company');
  }
  
  // Generate invitation token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  const invitation = await (prisma as any).companyInvitation.create({
    data: {
      companyId,
      email,
      roleId,
      invitedBy,
      token,
      expiresAt,
      status: 'PENDING',
    },
    include: {
      company: true,
    },
  });
  
  // TODO: Send invitation email
  
  return invitation;
}

/**
 * Accept invitation
 */
export async function acceptInvitation(token: string, userId: string) {
  const invitation = await (prisma as any).companyInvitation.findUnique({
    where: { token },
    include: {
      company: true,
    },
  });
  
  if (!invitation) {
    throw new Error('Invalid invitation token');
  }
  
  if (invitation.status !== 'PENDING') {
    throw new Error('Invitation has already been accepted or cancelled');
  }
  
  if (new Date() > invitation.expiresAt) {
    await (prisma as any).companyInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Invitation has expired');
  }
  
  // Add user to company
  await (prisma as any).companyUser.create({
    data: {
      companyId: invitation.companyId,
      userId,
      roleId: invitation.roleId,
      isActive: true,
    },
  });
  
  // Update invitation status
  await (prisma as any).companyInvitation.update({
    where: { id: invitation.id },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });
  
  return invitation.company;
}

/**
 * Cancel invitation
 */
export async function cancelInvitation(invitationId: string) {
  await (prisma as any).companyInvitation.update({
    where: { id: invitationId },
    data: { status: 'CANCELLED' },
  });
  
  return { success: true };
}

/**
 * Get pending invitations for company
 */
export async function getCompanyInvitations(companyId: string) {
  return await (prisma as any).companyInvitation.findMany({
    where: {
      companyId,
      status: 'PENDING',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

// ==================== MEMBER MANAGEMENT ====================

/**
 * Get company members
 */
export async function getCompanyMembers(companyId: string) {
  const members = await (prisma as any).companyUser.findMany({
    where: {
      companyId,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      role: true,
    },
    orderBy: {
      joinedAt: 'asc',
    },
  });
  
  return members.map((m: any) => ({
    id: m.id,
    user: m.user,
    role: m.role,
    isOwner: m.isOwner,
    joinedAt: m.joinedAt,
    lastAccessAt: m.lastAccessAt,
  }));
}

/**
 * Remove member from company
 */
export async function removeMember(companyId: string, userId: string) {
  const member = await (prisma as any).companyUser.findFirst({
    where: {
      companyId,
      userId,
    },
  });
  
  if (!member) {
    throw new Error('Member not found');
  }
  
  if (member.isOwner) {
    throw new Error('Cannot remove company owner');
  }
  
  await (prisma as any).companyUser.update({
    where: { id: member.id },
    data: {
      isActive: false,
      leftAt: new Date(),
    },
  });
  
  return { success: true };
}

/**
 * Update member role
 */
export async function updateMemberRole(companyId: string, userId: string, roleId: string) {
  const member = await (prisma as any).companyUser.findFirst({
    where: {
      companyId,
      userId,
    },
  });
  
  if (!member) {
    throw new Error('Member not found');
  }
  
  if (member.isOwner) {
    throw new Error('Cannot change owner role');
  }
  
  await (prisma as any).companyUser.update({
    where: { id: member.id },
    data: { roleId },
  });
  
  return { success: true };
}

/**
 * Transfer company ownership
 */
export async function transferOwnership(companyId: string, currentOwnerId: string, newOwnerId: string) {
  // Verify current owner
  const currentOwner = await (prisma as any).companyUser.findFirst({
    where: {
      companyId,
      userId: currentOwnerId,
      isOwner: true,
    },
  });
  
  if (!currentOwner) {
    throw new Error('Only the owner can transfer ownership');
  }
  
  // Verify new owner is a member
  const newOwner = await (prisma as any).companyUser.findFirst({
    where: {
      companyId,
      userId: newOwnerId,
      isActive: true,
    },
  });
  
  if (!newOwner) {
    throw new Error('New owner must be a company member');
  }
  
  // Get owner role
  const ownerRole = await (prisma as any).companyRole.findFirst({
    where: {
      companyId,
      name: 'Owner',
      isSystem: true,
    },
  });
  
  // Transfer ownership
  await prisma.$transaction([
    (prisma as any).companyUser.update({
      where: { id: currentOwner.id },
      data: {
        isOwner: false,
        roleId: ownerRole.id, // Keep owner role
      },
    }),
    (prisma as any).companyUser.update({
      where: { id: newOwner.id },
      data: {
        isOwner: true,
        roleId: ownerRole.id,
      },
    }),
  ]);
  
  return { success: true };
}

// ==================== COMPANY SETTINGS ====================

/**
 * Get company settings
 */
export async function getCompanySettings(companyId: string) {
  const company = await (prisma as any).company.findUnique({
    where: { id: companyId },
  });
  
  return {
    ...company,
    settings: typeof company.settings === 'string' 
      ? JSON.parse(company.settings) 
      : company.settings,
  };
}

/**
 * Update company settings
 */
export async function updateCompanySettings(companyId: string, settings: any) {
  await (prisma as any).company.update({
    where: { id: companyId },
    data: {
      ...settings,
      updatedAt: new Date(),
    },
  });
  
  return { success: true };
}

/**
 * Deactivate company
 */
export async function deactivateCompany(companyId: string) {
  await (prisma as any).company.update({
    where: { id: companyId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
  
  return { success: true };
}
