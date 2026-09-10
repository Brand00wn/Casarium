import type { MemberRole, Role } from "@prisma/client";

/**
 * Botões de disparo (convite individual, envio em massa, lembretes)
 * aparecem APENAS para a equipe do cerimonial: ADMIN da plataforma
 * ou membro PLANNER/CONCIERGE do casamento. Noivos (OWNER/VIEWER) não veem.
 */
export function isCeremonyStaff(
  userRole: Role | undefined | null,
  memberRole: MemberRole | undefined | null
): boolean {
  if (userRole === "ADMIN") return true;
  return memberRole === "PLANNER" || memberRole === "CONCIERGE";
}
