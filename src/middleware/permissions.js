import { PlatformSettings } from "../models/PlatformSettings.js";
import { User } from "../models/User.js";
import { USER_ROLES } from "../constants/userRoles.js";

async function resolveRolePermissions(role) {
  const settings = await PlatformSettings.getOrCreate();
  const entry = settings.permissions?.roles?.find((item) => item.role === role);
  return entry?.permissions ?? [];
}

export function roleHasPermission(permissions, key) {
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes("*")) return true;
  return permissions.includes(key);
}

/** Enforce platform permission keys configured under System Settings → Access Rights. */
export function requirePermission(...permissionKeys) {
  return async (req, res, next) => {
    try {
      const user = req.user ?? (await User.findById(req.userId));

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (user.status === "inactive") {
        return res.status(403).json({ message: "Account is inactive" });
      }

      req.user = user;
      req.userRole = user.role;

      const permissions = await resolveRolePermissions(user.role);
      const allowed = permissionKeys.some((key) => roleHasPermission(permissions, key));

      if (!allowed) {
        return res.status(403).json({
          message: "You do not have permission to perform this action",
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({ message: "Failed to verify permissions" });
    }
  };
}

export const requireUsersManage = requirePermission("users:manage");
