import type { UserProfile } from "@/types/api";

export function isAdminUser(user: UserProfile | null | undefined) {
  return (user?.roles ?? []).some((role) => {
    const normalized = role.trim().toUpperCase();
    return normalized === "ADMIN" || normalized === "ROLE_ADMIN";
  });
}
