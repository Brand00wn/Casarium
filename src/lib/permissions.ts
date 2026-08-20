import { Role, MemberRole } from "@prisma/client"

export type Permission =
  | 'canManageUsers'
  | 'canCreateWeddings'
  | 'canEditWedding'
  | 'canManageGuests'
  | 'canManageTables'
  | 'canInviteMembers'
  | 'canViewAll'

const ADMIN_PERMISSIONS: Record<Permission, boolean> = {
  canManageUsers: true,
  canCreateWeddings: true,
  canEditWedding: true,
  canManageGuests: true,
  canManageTables: true,
  canInviteMembers: true,
  canViewAll: true,
}

const MEMBER_ROLE_PERMISSIONS: Record<MemberRole, Partial<Record<Permission, boolean>>> = {
  OWNER: {
    canEditWedding: true,
    canManageGuests: true,
    canManageTables: true,
    canInviteMembers: false,
    canViewAll: true,
  },
  PLANNER: {
    canCreateWeddings: true,
    canEditWedding: true,
    canManageGuests: true,
    canManageTables: true,
    canInviteMembers: true,
    canViewAll: true,
  },
  CONCIERGE: {
    canEditWedding: true,
    canManageGuests: true,
    canManageTables: true,
    canInviteMembers: false,
    canViewAll: true,
  },
  VIEWER: {
    canViewAll: true,
  }
}

export function checkPermission(
  userRole: Role | undefined | null,
  memberRole: MemberRole | undefined | null,
  action: Permission
): boolean {
  if (userRole === "ADMIN") return true;
  
  // Planners can create weddings even if they are not members of a specific one yet
  if (userRole === "PLANNER" && action === "canCreateWeddings") return true;

  if (!memberRole) return false;

  return !!MEMBER_ROLE_PERMISSIONS[memberRole][action];
}
