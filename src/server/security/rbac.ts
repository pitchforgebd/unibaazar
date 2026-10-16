import { ApiError } from "@/server/http";
import { roleAllows, type PermissionSlug } from "@/server/security/permissions";

export function requirePermission(
  role: string | undefined,
  permission: PermissionSlug,
): void {
  if (!role) {
    throw new ApiError(401, "Sign in required");
  }
  if (!roleAllows(role, permission)) {
    throw new ApiError(403, "You do not have access to that action");
  }
}
